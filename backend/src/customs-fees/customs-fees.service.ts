import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomsFeeBatchDto, UpdateCustomsFeeBatchDto } from './dto/customs-fee-batch.dto';
import { QueryCustomsFeeBatchDto } from './dto/query-customs-fee-batch.dto';
import { Prisma, PaymentMethod } from '@prisma/client';

@Injectable()
export class CustomsFeesService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateCustomsFeeBatchDto, userId: string) {
        // Validate bank account if method is BANK_TRANSFER
        if (dto.method === PaymentMethod.BANK_TRANSFER && !dto.bankAccountId) {
            throw new BadRequestException('الحساب البنكي مطلوب عند اختيار التحويل البنكي');
        }

        // Check for duplicate customs numbers within the batch
        const customsNumbers = dto.items.map(item => item.customsNo);
        const uniqueCustomsNumbers = new Set(customsNumbers);
        if (customsNumbers.length !== uniqueCustomsNumbers.size) {
            throw new BadRequestException('يوجد أرقام بيانات مكررة في الدفعة');
        }

        // Check if any customs number already exists in other batches
        const existingItems = await this.prisma.customsFeeBatchItem.findMany({
            where: {
                customsNo: { in: customsNumbers },
            },
            select: { customsNo: true },
        });

        if (existingItems.length > 0) {
            const duplicates = existingItems.map(item => item.customsNo).join(', ');
            throw new ConflictException(`أرقام البيانات التالية مسجلة مسبقاً: ${duplicates}`);
        }

        // Calculate total amount
        const totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);

        // Get expense category for customs fees
        let customsCategory = await this.prisma.expenseCategory.findUnique({
            where: { name: 'رسوم جمركية' },
        });

        if (!customsCategory) {
            customsCategory = await this.prisma.expenseCategory.create({
                data: { name: 'رسوم جمركية' },
            });
        }

        // Generate voucher code
        const voucherDate = new Date(dto.date);
        const year = voucherDate.getFullYear().toString().slice(-2);
        const count = await this.prisma.voucher.count({
            where: {
                type: 'PAYMENT',
                date: {
                    gte: new Date(voucherDate.getFullYear(), 0, 1),
                    lt: new Date(voucherDate.getFullYear() + 1, 0, 1),
                },
            },
        });
        const voucherCode = `PY${year}-${count + 1}`;

        // Create batch with voucher in a transaction
        const batch = await this.prisma.$transaction(async (tx) => {
            // Create the voucher first
            const voucher = await tx.voucher.create({
                data: {
                    code: voucherCode,
                    type: 'PAYMENT',
                    partyType: 'CUSTOMS',
                    partyName: 'الجمارك',
                    method: dto.method,
                    bankAccountId: dto.bankAccountId,
                    amount: new Prisma.Decimal(totalAmount),
                    note: dto.notes || `دفعة رسوم جمركية - ${dto.items.length} بيان`,
                    date: new Date(dto.date),
                    categoryId: customsCategory.id,
                    createdBy: userId,
                },
            });

            // Update treasury or bank balance
            if (dto.method === PaymentMethod.CASH) {
                const treasury = await tx.treasury.findUnique({
                    where: { id: 'single_row' },
                });

                if (!treasury) {
                    throw new BadRequestException('الخزنة غير موجودة');
                }

                const newBalance = parseFloat(treasury.currentBalance.toString()) - totalAmount;

                await tx.treasury.update({
                    where: { id: 'single_row' },
                    data: { currentBalance: new Prisma.Decimal(newBalance) },
                });

                await tx.treasuryTransaction.create({
                    data: {
                        date: new Date(dto.date),
                        type: 'OUT',
                        amount: new Prisma.Decimal(totalAmount),
                        note: `رسوم جمركية - ${dto.items.length} بيان`,
                        balanceAfter: new Prisma.Decimal(newBalance),
                        voucherId: voucher.id,
                        createdBy: userId,
                    },
                });
            } else {
                const bankAccount = await tx.bankAccount.findUnique({
                    where: { id: dto.bankAccountId },
                });

                if (!bankAccount) {
                    throw new NotFoundException('الحساب البنكي غير موجود');
                }

                const newBalance = parseFloat(bankAccount.currentBalance.toString()) - totalAmount;

                await tx.bankAccount.update({
                    where: { id: dto.bankAccountId },
                    data: { currentBalance: new Prisma.Decimal(newBalance) },
                });

                await tx.bankTransaction.create({
                    data: {
                        date: new Date(dto.date),
                        type: 'OUT',
                        amount: new Prisma.Decimal(totalAmount),
                        description: `رسوم جمركية - ${dto.items.length} بيان`,
                        balanceAfter: new Prisma.Decimal(newBalance),
                        bankAccountId: dto.bankAccountId,
                        voucherId: voucher.id,
                        createdBy: userId,
                    },
                });
            }

            // Create the batch
            const createdBatch = await tx.customsFeeBatch.create({
                data: {
                    date: new Date(dto.date),
                    totalAmount: new Prisma.Decimal(totalAmount),
                    method: dto.method,
                    bankAccountId: dto.bankAccountId,
                    voucherId: voucher.id,
                    notes: dto.notes,
                    createdBy: userId,
                    items: {
                        create: dto.items.map((item, index) => ({
                            customsNo: item.customsNo,
                            amount: new Prisma.Decimal(item.amount),
                            sortOrder: index,
                        })),
                    },
                },
                include: {
                    items: {
                        orderBy: { sortOrder: 'asc' },
                    },
                    voucher: true,
                    bankAccount: {
                        include: {
                            bank: true,
                        },
                    },
                    createdByUser: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            });

            return createdBatch;
        });

        return batch;
    }

    async findAll(query: QueryCustomsFeeBatchDto) {
        const { from, to, page = '1', limit = '20' } = query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where: Prisma.CustomsFeeBatchWhereInput = {};

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        const [batches, total] = await Promise.all([
            this.prisma.customsFeeBatch.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    items: {
                        orderBy: { sortOrder: 'asc' },
                        include: {
                            invoices: {
                                select: {
                                    id: true,
                                    code: true,
                                    type: true,
                                },
                            },
                        },
                    },
                    voucher: {
                        select: {
                            id: true,
                            code: true,
                        },
                    },
                    bankAccount: {
                        include: {
                            bank: true,
                        },
                    },
                    createdByUser: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
                orderBy: { date: 'desc' },
            }),
            this.prisma.customsFeeBatch.count({ where }),
        ]);

        return {
            data: batches,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        };
    }

    async findOne(id: string) {
        const batch = await this.prisma.customsFeeBatch.findUnique({
            where: { id },
            include: {
                items: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        invoices: {
                            select: {
                                id: true,
                                code: true,
                                type: true,
                                date: true,
                                total: true,
                                customer: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                voucher: true,
                bankAccount: {
                    include: {
                        bank: true,
                    },
                },
                createdByUser: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        if (!batch) {
            throw new NotFoundException('الدفعة غير موجودة');
        }

        return batch;
    }

    async update(id: string, dto: UpdateCustomsFeeBatchDto) {
        const batch = await this.findOne(id);

        // Check if any items are linked to invoices
        const linkedItems = batch.items.filter(item => item.invoices.length > 0);
        if (linkedItems.length > 0) {
            throw new BadRequestException('لا يمكن تعديل الدفعة لأن بعض البيانات مربوطة بفواتير');
        }

        // Validate bank account if method changed to BANK_TRANSFER
        if (dto.method === PaymentMethod.BANK_TRANSFER && !dto.bankAccountId && !batch.bankAccountId) {
            throw new BadRequestException('الحساب البنكي مطلوب عند اختيار التحويل البنكي');
        }

        // If items are being updated, check for duplicates
        if (dto.items) {
            const customsNumbers = dto.items.map(item => item.customsNo);
            const uniqueCustomsNumbers = new Set(customsNumbers);
            if (customsNumbers.length !== uniqueCustomsNumbers.size) {
                throw new BadRequestException('يوجد أرقام بيانات مكررة في الدفعة');
            }

            // Check if customs numbers exist in other batches
            const existingItems = await this.prisma.customsFeeBatchItem.findMany({
                where: {
                    customsNo: { in: customsNumbers },
                    batchId: { not: id },
                },
                select: { customsNo: true },
            });

            if (existingItems.length > 0) {
                const duplicates = existingItems.map(item => item.customsNo).join(', ');
                throw new ConflictException(`أرقام البيانات التالية مسجلة مسبقاً: ${duplicates}`);
            }
        }

        const updateData: any = {};
        if (dto.date) updateData.date = new Date(dto.date);
        if (dto.method) updateData.method = dto.method;
        if (dto.bankAccountId !== undefined) updateData.bankAccountId = dto.bankAccountId;
        if (dto.notes !== undefined) updateData.notes = dto.notes;

        // If items are updated, recalculate total
        if (dto.items) {
            const totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);
            updateData.totalAmount = new Prisma.Decimal(totalAmount);
        }

        const updatedBatch = await this.prisma.$transaction(async (tx) => {
            // Delete existing items if new items provided
            if (dto.items) {
                await tx.customsFeeBatchItem.deleteMany({
                    where: { batchId: id },
                });
            }

            // Update batch
            const updated = await tx.customsFeeBatch.update({
                where: { id },
                data: {
                    ...updateData,
                    ...(dto.items && {
                        items: {
                            create: dto.items.map((item, index) => ({
                                customsNo: item.customsNo,
                                amount: new Prisma.Decimal(item.amount),
                                sortOrder: index,
                            })),
                        },
                    }),
                },
                include: {
                    items: {
                        orderBy: { sortOrder: 'asc' },
                    },
                    voucher: true,
                    bankAccount: {
                        include: {
                            bank: true,
                        },
                    },
                    createdByUser: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            });

            // Update voucher if amount changed
            if (dto.items) {
                await tx.voucher.update({
                    where: { id: batch.voucherId },
                    data: {
                        amount: updateData.totalAmount,
                        note: dto.notes || `دفعة رسوم جمركية - ${dto.items.length} بيان`,
                    },
                });
            }

            return updated;
        });

        return updatedBatch;
    }

    async remove(id: string) {
        const batch = await this.findOne(id);

        // Check if any items are linked to invoices
        const linkedItems = batch.items.filter(item => item.invoices.length > 0);
        if (linkedItems.length > 0) {
            const linkedCustomsNos = linkedItems.map(item => item.customsNo).join(', ');
            throw new BadRequestException(
                `لا يمكن حذف الدفعة لأن البيانات التالية مربوطة بفواتير: ${linkedCustomsNos}`,
            );
        }

        // Delete batch (will cascade delete voucher, items, and transactions)
        await this.prisma.customsFeeBatch.delete({
            where: { id },
        });

        return { message: 'تم حذف الدفعة بنجاح' };
    }

    async getAvailableCustomsNumbers() {
        const items = await this.prisma.customsFeeBatchItem.findMany({
            where: {
                invoices: {
                    none: {},
                },
            },
            include: {
                batch: {
                    select: {
                        date: true,
                    },
                },
            },
            orderBy: {
                batch: {
                    date: 'desc',
                },
            },
        });

        return items.map(item => ({
            id: item.id,
            customsNo: item.customsNo,
            amount: parseFloat(item.amount.toString()),
            batchDate: item.batch.date,
        }));
    }

    async findByCustomsNo(customsNo: string) {
        const item = await this.prisma.customsFeeBatchItem.findFirst({
            where: { customsNo },
            select: {
                id: true,
                customsNo: true,
                amount: true,
                batch: {
                    select: {
                        date: true,
                    }
                }
            },
            orderBy: {
                batch: {
                    date: 'desc'
                }
            }
        });

        if (!item) {
            return null;
        }

        return {
            customsNo: item.customsNo,
            amount: parseFloat(item.amount.toString()),
            batchDate: item.batch.date
        };
    }
}
