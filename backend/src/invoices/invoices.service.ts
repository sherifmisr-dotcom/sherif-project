import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoicesDto } from './dto/invoice.dto';
import { Prisma, InvoiceType } from '@prisma/client';

@Injectable()
export class InvoicesService {
    constructor(
        private prisma: PrismaService,
        private ledger: LedgerService,
    ) { }

    /**
     * Generate invoice code based on type and year
     */
    private async generateInvoiceCode(type: InvoiceType, date: Date): Promise<string> {
        const year = date.getFullYear().toString().slice(-2);
        const typePrefix = {
            EXPORT: 'EX',
            IMPORT: 'IM',
            TRANSIT: 'TR',
            FREE: 'FR',
        }[type];

        // Get count of invoices of this type in this year
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const endOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59);

        // Find the highest sequence number for this type and year
        const lastInvoice = await this.prisma.invoice.findFirst({
            where: {
                type,
                date: {
                    gte: startOfYear,
                    lte: endOfYear,
                },
            },
            orderBy: {
                code: 'desc',
            },
        });

        let sequence = 1;
        if (lastInvoice && lastInvoice.code) {
            // Extract sequence number from code (format: XXYY-N)
            const parts = lastInvoice.code.split('-');
            if (parts.length === 2) {
                const lastSequence = parseInt(parts[1], 10);
                if (!isNaN(lastSequence)) {
                    sequence = lastSequence + 1;
                }
            }
        }

        // Generate code and check if it exists (in case of gaps)
        let code = `${typePrefix}${year}-${sequence}`;
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const existing = await this.prisma.invoice.findUnique({
                where: { code },
            });

            if (!existing) {
                return code;
            }

            // If code exists, try next sequence
            sequence++;
            code = `${typePrefix}${year}-${sequence}`;
            attempts++;
        }

        // Fallback: use timestamp if we can't find a unique code
        const timestamp = Date.now().toString().slice(-4);
        return `${typePrefix}${year}-${timestamp}`;
    }

    /**
     * Calculate invoice total and VAT from new item structure
     */
    private calculateTotal(
        items: { unitPrice: number; quantity: number; vatRate: number; amount?: number }[],
        vatEnabled: boolean,
        vatRate?: number,
        discount: number = 0,
    ): { total: number; vatAmount: number; subtotal: number } {
        // Calculate subtotal (sum of all unitPrice * quantity)
        const subtotal = items.reduce((sum, item) => {
            const itemSubtotal = Number(item.unitPrice) * Number(item.quantity);
            return sum + itemSubtotal;
        }, 0);

        // Calculate VAT amount (sum of all item VAT amounts)
        const vatAmount = items.reduce((sum, item) => {
            const itemSubtotal = Number(item.unitPrice) * Number(item.quantity);
            const itemVat = itemSubtotal * (Number(item.vatRate) / 100);
            return sum + itemVat;
        }, 0);

        // Apply discount before adding VAT
        const discountAmount = Math.max(0, Math.min(discount, subtotal));
        const total = subtotal - discountAmount + vatAmount;
        return { total, vatAmount, subtotal };
    }

    /**
     * Create invoice
     */
    async create(createInvoiceDto: CreateInvoiceDto) {
        const { items, customerId, type, date, vatEnabled, vatRate, discount, ...invoiceData } = createInvoiceDto;

        // Validate customer exists
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
        });

        if (!customer || customer.deletedAt) {
            throw new NotFoundException('العميل غير موجود');
        }

        // Check customs number uniqueness across IMPORT and TRANSIT for the year
        if (invoiceData.customsNo && (type === 'IMPORT' || type === 'TRANSIT')) {
            const invoiceDate = new Date(date);
            const existing = await this.prisma.invoice.findFirst({
                where: {
                    type: { in: ['IMPORT', 'TRANSIT'] },
                    customsNo: invoiceData.customsNo,
                    date: {
                        gte: new Date(invoiceDate.getFullYear(), 0, 1),
                        lte: new Date(invoiceDate.getFullYear(), 11, 31),
                    },
                },
            });

            if (existing) {
                const invoiceTypeAr = existing.type === 'IMPORT' ? 'استيراد' : 'ترانزيت';
                throw new ConflictException(
                    `رقم البيان ${invoiceData.customsNo} مُسجَّل مسبقاً في فاتورة ${invoiceTypeAr} لهذه السنة`
                );
            }
        }

        // Find customs fee batch item if customsNo provided and invoice is IMPORT or TRANSIT
        let customsFeeBatchItemId: string | undefined;
        if (invoiceData.customsNo && (type === 'IMPORT' || type === 'TRANSIT')) {
            const batchItem = await this.prisma.customsFeeBatchItem.findFirst({
                where: {
                    customsNo: invoiceData.customsNo,
                },
            });

            if (batchItem) {
                customsFeeBatchItemId = batchItem.id;
            }
        }

        // Generate invoice code
        const code = await this.generateInvoiceCode(type, new Date(date));

        // Calculate totals
        const discountValue = discount && discount > 0 ? discount : 0;
        const { total, vatAmount, subtotal } = this.calculateTotal(items, vatEnabled || false, vatRate, discountValue);

        // Create invoice with items
        const invoice = await this.prisma.invoice.create({
            data: {
                code,
                type,
                customerId,
                date: new Date(date),
                total: new Prisma.Decimal(total),
                discount: new Prisma.Decimal(discountValue),
                vatEnabled: vatEnabled || false,
                vatRate: vatRate ? new Prisma.Decimal(vatRate) : null,
                vatAmount: vatAmount > 0 ? new Prisma.Decimal(vatAmount) : null,
                customsFeeBatchItemId, // Link to customs fee batch item if found
                ...invoiceData,
                items: {
                    create: items.map((item, index) => {
                        // Calculate amount if not provided
                        const itemAmount = item.amount !== undefined && item.amount !== null
                            ? Number(item.amount)
                            : Number(item.unitPrice || 0) * Number(item.quantity || 1) * (1 + Number(item.vatRate || 0) / 100);

                        return {
                            description: item.description,
                            unitPrice: new Prisma.Decimal(Number(item.unitPrice) || 0),
                            quantity: new Prisma.Decimal(Number(item.quantity) || 1),
                            vatRate: new Prisma.Decimal(Number(item.vatRate) || 0),
                            amount: new Prisma.Decimal(itemAmount),
                            hasVat: item.hasVat || false,
                            sortOrder: item.sortOrder !== undefined ? item.sortOrder : index,
                        };
                    }),
                },
            },
            include: {
                items: true,
                customer: true,
            },
        });

        // Create ledger entry
        await this.ledger.createEntry({
            sourceType: 'INVOICE',
            sourceId: invoice.id,
            debitAccount: `customer:${customerId}`,
            creditAccount: `revenue:${type.toLowerCase()}`,
            amount: total,
            description: `فاتورة ${type} رقم ${code}`,
        });

        return invoice;
    }

    /**
     * Find all invoices with filters
     */
    async findAll(query: QueryInvoicesDto) {
        const { type, customerId, from, to, q, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.InvoiceWhereInput = {};

        if (type) where.type = type;
        if (customerId) where.customerId = customerId;

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' } },
                { customsNo: { contains: q, mode: 'insensitive' } },
                { customer: { name: { contains: q, mode: 'insensitive' } } },
            ];
        }

        const [invoices, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    customer: true,
                    items: true,
                },
            }),
            this.prisma.invoice.count({ where }),
        ]);

        return {
            data: invoices,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Find one invoice
     */
    async findOne(id: string) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: {
                customer: true,
                items: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });

        if (!invoice) {
            throw new NotFoundException('الفاتورة غير موجودة');
        }

        return invoice;
    }

    /**
     * Update invoice
     */
    async update(id: string, updateInvoiceDto: UpdateInvoiceDto) {
        const invoice = await this.findOne(id);

        const { items, vatEnabled, vatRate, discount, ...invoiceData } = updateInvoiceDto;

        // Check customs number uniqueness if it's being updated for IMPORT or TRANSIT
        if (invoiceData.customsNo && (invoice.type === 'IMPORT' || invoice.type === 'TRANSIT')) {
            const invoiceDate = invoiceData.date ? new Date(invoiceData.date) : invoice.date;
            const existing = await this.prisma.invoice.findFirst({
                where: {
                    type: { in: ['IMPORT', 'TRANSIT'] },
                    customsNo: invoiceData.customsNo,
                    date: {
                        gte: new Date(invoiceDate.getFullYear(), 0, 1),
                        lte: new Date(invoiceDate.getFullYear(), 11, 31),
                    },
                    id: { not: id }, // Exclude current invoice
                },
            });

            if (existing) {
                const invoiceTypeAr = existing.type === 'IMPORT' ? 'استيراد' : 'ترانزيت';
                throw new ConflictException(
                    `رقم البيان ${invoiceData.customsNo} مُسجَّل مسبقاً في فاتورة ${invoiceTypeAr} لهذه السنة`
                );
            }
        }

        // If items are updated, recalculate total
        let total = parseFloat(invoice.total.toString());
        let vatAmount = invoice.vatAmount ? parseFloat(invoice.vatAmount.toString()) : 0;

        if (items) {
            const discountValue = discount !== undefined ? discount : parseFloat(invoice.discount.toString());
            const calculated = this.calculateTotal(
                items,
                vatEnabled !== undefined ? vatEnabled : invoice.vatEnabled,
                vatRate !== undefined ? vatRate : invoice.vatRate ? parseFloat(invoice.vatRate.toString()) : undefined,
                discountValue,
            );
            total = calculated.total;
            vatAmount = calculated.vatAmount;

            // Delete old items and create new ones
            await this.prisma.invoiceItem.deleteMany({
                where: { invoiceId: id },
            });
        }


        const updated = await this.prisma.invoice.update({
            where: { id },
            data: {
                ...invoiceData,
                ...(invoiceData.date && { date: new Date(invoiceData.date) }),
                total: new Prisma.Decimal(total),
                discount: discount !== undefined ? new Prisma.Decimal(discount) : undefined,
                vatEnabled: vatEnabled !== undefined ? vatEnabled : undefined,
                vatRate: vatRate !== undefined ? new Prisma.Decimal(vatRate) : undefined,
                vatAmount: vatAmount > 0 ? new Prisma.Decimal(vatAmount) : null,
                ...(items && {
                    items: {
                        create: items.map((item, index) => {
                            // Calculate amount if not provided
                            const itemAmount = item.amount !== undefined && item.amount !== null
                                ? Number(item.amount)
                                : Number(item.unitPrice || 0) * Number(item.quantity || 1) * (1 + Number(item.vatRate || 0) / 100);

                            return {
                                description: item.description,
                                unitPrice: new Prisma.Decimal(Number(item.unitPrice) || 0),
                                quantity: new Prisma.Decimal(Number(item.quantity) || 1),
                                vatRate: new Prisma.Decimal(Number(item.vatRate) || 0),
                                amount: new Prisma.Decimal(itemAmount),
                                hasVat: item.hasVat || false,
                                sortOrder: item.sortOrder !== undefined ? item.sortOrder : index,
                            };
                        }),
                    },
                }),
            },
            include: {
                items: true,
                customer: true,
            },
        });

        return updated;
    }

    /**
     * Delete invoice
     */
    async remove(id: string) {
        await this.findOne(id);

        // Delete invoice (items will be cascade deleted)
        await this.prisma.invoice.delete({
            where: { id },
        });

        return { message: 'تم حذف الفاتورة بنجاح' };
    }

    /**
     * Get statistics
     */
    async getStats(type?: InvoiceType, from?: string, to?: string) {
        const where: Prisma.InvoiceWhereInput = {};

        if (type) where.type = type;
        if (from || to) {
            where.date = {};
            if (from) {
                // Set from date to start of day
                where.date.gte = new Date(from + 'T00:00:00.000Z');
            }
            if (to) {
                // Set to date to end of day to include the entire day
                where.date.lte = new Date(to + 'T23:59:59.999Z');
            }
        }

        const [count, totals] = await Promise.all([
            this.prisma.invoice.count({ where }),
            this.prisma.invoice.aggregate({
                where,
                _sum: {
                    total: true,
                },
            }),
        ]);

        // Get clearance fees total (without VAT)
        // We need to calculate unitPrice * quantity for items containing 'تخليص'
        const clearanceItems = await this.prisma.invoiceItem.findMany({
            where: {
                invoice: where,
                description: {
                    contains: 'تخليص',
                    mode: 'insensitive',
                },
            },
            select: {
                unitPrice: true,
                quantity: true,
            },
        });

        // Calculate total clearance fees without VAT (unitPrice * quantity)
        const totalClearanceFees = clearanceItems.reduce((sum, item) => {
            const itemFee = Number(item.unitPrice || 0) * Number(item.quantity || 1);
            return sum + itemFee;
        }, 0);

        return {
            totalInvoices: count,
            totalAmount: totals._sum.total ? parseFloat(totals._sum.total.toString()) : 0,
            totalClearanceFees: totalClearanceFees,
            totalFees: totalClearanceFees, // Alias for frontend
        };
    }
}
