import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../../ledger/ledger.service';
import { CreateVoucherDto, UpdateVoucherDto, QueryVouchersDto } from './dto/voucher.dto';
import { ExpensesReportDto } from './dto/expenses-report.dto';
import { Prisma, VoucherType, PaymentMethod } from '@prisma/client';

@Injectable()
export class VouchersService {
    constructor(
        private prisma: PrismaService,
        private ledger: LedgerService,
    ) { }

    /**
     * Generate voucher code
     */
    private async generateVoucherCode(type: VoucherType, date: Date): Promise<string> {
        const year = date.getFullYear().toString().slice(-2);
        const typePrefix = type === 'RECEIPT' ? 'RC' : 'PY';

        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const endOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59);

        // Get the highest sequence number for this type and year
        const lastVoucher = await this.prisma.voucher.findFirst({
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
        if (lastVoucher && lastVoucher.code) {
            // Extract sequence number from the last code (format: RC26-1)
            const parts = lastVoucher.code.split('-');
            if (parts.length === 2) {
                const lastSequence = parseInt(parts[1], 10);
                if (!isNaN(lastSequence)) {
                    sequence = lastSequence + 1;
                }
            }
        }

        // Ensure uniqueness by checking if code exists and incrementing if needed
        let code = `${typePrefix}${year}-${sequence}`;
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const existing = await this.prisma.voucher.findUnique({
                where: { code },
            });

            if (!existing) {
                return code;
            }

            sequence++;
            code = `${typePrefix}${year}-${sequence}`;
            attempts++;
        }

        // Fallback: use timestamp if we couldn't find a unique code
        const timestamp = Date.now().toString().slice(-6);
        return `${typePrefix}${year}-${timestamp}`;
    }

    /**
     * Create voucher (receipt or payment)
     */
    async create(createVoucherDto: CreateVoucherDto, userId: string) {
        const {
            type,
            partyType,
            partyId,
            partyName,
            method,
            bankAccountId,
            referenceNumber,
            amount,
            note,
            date,
            categoryId,
            hasBankFees,
            actualAmountReceived,
        } = createVoucherDto;

        // Handle group receipt: delegate to specialized method
        if (partyType === 'CUSTOMER_GROUP') {
            return this.createGroupReceipt(createVoucherDto, userId);
        }

        // Validate party
        if (partyType !== 'OTHER' && partyType !== 'CUSTOMS' && !partyId) {
            throw new BadRequestException('يجب تحديد الجهة');
        }

        if (partyType === 'OTHER' && !partyName) {
            throw new BadRequestException('يجب إدخال اسم الجهة');
        }

        if (partyType === 'CUSTOMS' && !partyName) {
            throw new BadRequestException('يجب إدخال اسم الجهة');
        }

        // Validate bank account for bank transfers
        if (method === 'BANK_TRANSFER' && !bankAccountId) {
            throw new BadRequestException('يجب اختيار الحساب البنكي للتحويل');
        }

        // Validate category for payment vouchers
        if (type === 'PAYMENT' && !categoryId && partyType === 'OTHER') {
            throw new BadRequestException('يجب تحديد تصنيف المصروف');
        }

        // Validate bank fees fields
        if (hasBankFees) {
            if (method !== 'BANK_TRANSFER') {
                throw new BadRequestException('رسوم التحويل البنكية متاحة فقط للتحويلات البنكية');
            }
            if (!actualAmountReceived || actualAmountReceived <= 0) {
                throw new BadRequestException('يجب إدخال المبلغ الفعلي');
            }
            if (type === 'RECEIPT' && actualAmountReceived >= amount) {
                throw new BadRequestException('المبلغ الفعلي يجب أن يكون أقل من المبلغ الإجمالي');
            }
            if (type === 'PAYMENT' && actualAmountReceived <= amount) {
                throw new BadRequestException('المبلغ الفعلي المحول يجب أن يكون أكبر من مبلغ السند');
            }
        }

        // Check treasury opening balance is set for cash vouchers
        if (method === 'CASH') {
            const treasury = await this.prisma.treasury.findUnique({
                where: { id: 'single_row' },
            });

            if (!treasury?.openingSetAt) {
                throw new BadRequestException('يجب تعيين الرصيد الافتتاحي للخزنة قبل إصدار السندات');
            }

            const settings = await this.prisma.appSetting.findUnique({
                where: { id: 'single_row' },
            });

            if (settings?.preventNegativeTreasury && type === 'PAYMENT') {
                const currentBalance = treasury?.currentBalance
                    ? parseFloat(treasury.currentBalance.toString())
                    : 0;

                if (currentBalance < amount) {
                    throw new BadRequestException('الرصيد غير كافٍ في الخزنة');
                }
            }
        } else if (method === 'BANK_TRANSFER' && bankAccountId) {
            const settings = await this.prisma.appSetting.findUnique({
                where: { id: 'single_row' },
            });

            if (settings?.preventNegativeBank && type === 'PAYMENT') {
                const account = await this.prisma.bankAccount.findUnique({
                    where: { id: bankAccountId },
                });

                if (!account) {
                    throw new NotFoundException('الحساب البنكي غير موجود');
                }

                const currentBalance = parseFloat(account.currentBalance.toString());
                if (currentBalance < amount) {
                    throw new BadRequestException('الرصيد غير كافٍ في الحساب البنكي');
                }
            }
        }

        // Calculate bank fee amount
        // RECEIPT: actual < amount (bank received less), fee = amount - actual
        // PAYMENT: actual > amount (bank sent more), fee = actual - amount
        const bankFeeAmount = hasBankFees
            ? (type === 'PAYMENT' ? actualAmountReceived - amount : amount - actualAmountReceived)
            : null;

        // Generate voucher code
        const code = await this.generateVoucherCode(type, new Date(date));

        // Create voucher
        const voucher = await this.prisma.voucher.create({
            data: {
                code,
                type,
                partyType,
                partyId,
                partyName,
                method,
                bankAccountId,
                referenceNumber,
                amount: new Prisma.Decimal(amount),
                note,
                date: new Date(date),
                categoryId,
                hasBankFees: hasBankFees || false,
                actualAmountReceived: hasBankFees ? new Prisma.Decimal(actualAmountReceived) : null,
                bankFeeAmount: bankFeeAmount ? new Prisma.Decimal(bankFeeAmount) : null,
                createdBy: userId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                bankAccount: true,
                category: true,
            },
        });

        // Update treasury or bank account
        if (method === 'CASH') {
            await this.updateTreasury(type, amount, voucher.id, new Date(date));
        } else if (bankAccountId) {
            // For receipts with bank fees, credit the bank with full amount first
            await this.updateBankAccount(bankAccountId, type, amount, voucher.id, new Date(date), userId);
        }

        // Create ledger entry for the main voucher
        const debitAccount =
            type === 'RECEIPT'
                ? method === 'CASH'
                    ? 'treasury'
                    : `bank:${bankAccountId}`
                : this.getExpenseAccount(partyType, partyId, categoryId);

        const creditAccount =
            type === 'RECEIPT'
                ? this.getRevenueAccount(partyType, partyId)
                : method === 'CASH'
                    ? 'treasury'
                    : `bank:${bankAccountId}`;

        await this.ledger.createEntry({
            sourceType: 'VOUCHER',
            sourceId: voucher.id,
            debitAccount,
            creditAccount,
            amount,
            description: `${type === 'RECEIPT' ? 'سند قبض' : 'سند صرف'} رقم ${code}`,
        });

        // If has bank fees, create auto payment voucher for the fee
        if (hasBankFees && bankFeeAmount > 0 && bankAccountId) {
            await this.createBankFeePaymentVoucher(
                voucher.id,
                bankAccountId,
                bankFeeAmount,
                new Date(date),
                userId,
                code,
                type,
            );
        }

        return voucher;
    }

    /**
     * Create group receipt voucher.
     * Creates individual receipt vouchers for each customer in the distribution.
     * This ensures each customer's balance is updated correctly.
     */
    private async createGroupReceipt(dto: CreateVoucherDto, userId: string) {
        const { partyId, amount, method, bankAccountId, referenceNumber, date, note, groupDistribution, hasBankFees, actualAmountReceived } = dto;

        // Validate group exists
        if (!partyId) {
            throw new BadRequestException('يجب اختيار مجموعة العملاء');
        }

        const group = await this.prisma.customerGroup.findUnique({
            where: { id: partyId },
            include: { customers: { where: { deletedAt: null } } },
        });

        if (!group) {
            throw new BadRequestException('مجموعة العملاء غير موجودة');
        }

        // Validate distribution
        if (!groupDistribution || groupDistribution.length === 0) {
            throw new BadRequestException('يجب تحديد توزيع المبلغ على العملاء');
        }

        // Validate distribution amounts sum to total
        const distributionTotal = groupDistribution.reduce((sum, item) => sum + item.amount, 0);
        if (Math.abs(distributionTotal - amount) > 0.01) {
            throw new BadRequestException(
                `مجموع التوزيع (${distributionTotal.toFixed(2)}) لا يساوي المبلغ الإجمالي (${amount.toFixed(2)})`
            );
        }

        // Validate all customers belong to the group
        const groupCustomerIds = group.customers.map((c) => c.id);
        for (const item of groupDistribution) {
            if (!groupCustomerIds.includes(item.customerId)) {
                throw new BadRequestException(`العميل ${item.customerId} ليس ضمن هذه المجموعة`);
            }
            if (item.amount <= 0) {
                throw new BadRequestException('مبلغ التوزيع يجب أن يكون أكبر من صفر');
            }
        }

        // Check negative balance for bank if payment method is bank
        if (method === 'BANK_TRANSFER' && !bankAccountId) {
            throw new BadRequestException('يجب اختيار الحساب البنكي للتحويل');
        }

        // Validate bank fees
        const bankFeeAmount = hasBankFees ? amount - actualAmountReceived : 0;
        if (hasBankFees) {
            if (method !== 'BANK_TRANSFER') {
                throw new BadRequestException('رسوم التحويل البنكية متاحة فقط للتحويلات البنكية');
            }
            if (!actualAmountReceived || actualAmountReceived <= 0) {
                throw new BadRequestException('يجب إدخال المبلغ الفعلي الذي وصل البنك');
            }
            if (actualAmountReceived >= amount) {
                throw new BadRequestException('المبلغ الفعلي يجب أن يكون أقل من المبلغ الإجمالي');
            }
        }

        // Create individual receipt vouchers for each customer
        const createdVouchers: any[] = [];
        let isFirstVoucher = true;
        const groupReceiptId = require('crypto').randomUUID();

        for (const item of groupDistribution) {
            const customer = group.customers.find((c) => c.id === item.customerId);
            if (!customer) continue;

            const code = await this.generateVoucherCode('RECEIPT', new Date(date));

            // Only the first voucher carries the bank fee info
            const voucherData: any = {
                code,
                type: 'RECEIPT',
                partyType: 'CUSTOMER',
                partyId: item.customerId,
                partyName: customer.name,
                method,
                bankAccountId: bankAccountId || null,
                referenceNumber: referenceNumber || null,
                amount: new Prisma.Decimal(item.amount),
                note: note
                    ? `${note} (مجموعة: ${group.name})`
                    : `سند قبض - مجموعة: ${group.name}`,
                date: new Date(date),
                groupReceiptId,
                createdBy: userId,
            };

            // Attach bank fee info to first voucher only
            if (isFirstVoucher && hasBankFees) {
                voucherData.hasBankFees = true;
                voucherData.actualAmountReceived = new Prisma.Decimal(actualAmountReceived);
                voucherData.bankFeeAmount = new Prisma.Decimal(bankFeeAmount);
            }

            const voucher = await this.prisma.voucher.create({
                data: voucherData,
                include: {
                    creator: { select: { id: true, username: true } },
                    bankAccount: true,
                },
            });

            // Update treasury or bank account
            if (method === 'CASH') {
                await this.updateTreasury('RECEIPT', item.amount, voucher.id, new Date(date));
            } else if (bankAccountId) {
                await this.updateBankAccount(bankAccountId, 'RECEIPT', item.amount, voucher.id, new Date(date), userId);
            }

            // Create ledger entry
            const debitAccount = method === 'CASH' ? 'treasury' : `bank:${bankAccountId}`;
            const creditAccount = `customer:${item.customerId}`;

            await this.ledger.createEntry({
                sourceType: 'VOUCHER',
                sourceId: voucher.id,
                debitAccount,
                creditAccount,
                amount: item.amount,
                description: `سند قبض رقم ${code} - مجموعة ${group.name}`,
            });

            createdVouchers.push(voucher);
            isFirstVoucher = false;
        }

        // Create bank fee payment voucher if applicable (one for the whole group)
        if (hasBankFees && bankFeeAmount > 0 && bankAccountId && createdVouchers.length > 0) {
            await this.createBankFeePaymentVoucher(
                createdVouchers[0].id,
                bankAccountId,
                bankFeeAmount,
                new Date(date),
                userId,
                createdVouchers[0].code,
                'RECEIPT',
            );
        }

        return {
            groupName: group.name,
            totalAmount: amount,
            vouchersCount: createdVouchers.length,
            vouchers: createdVouchers,
        };
    }

    /**
     * Update treasury balance
     */
    private async updateTreasury(type: VoucherType, amount: number, voucherId: string, voucherDate: Date) {
        const treasury = await this.prisma.treasury.findUnique({
            where: { id: 'single_row' },
        });

        const currentBalance = treasury?.currentBalance
            ? parseFloat(treasury.currentBalance.toString())
            : 0;

        const newBalance =
            type === 'RECEIPT' ? currentBalance + amount : currentBalance - amount;

        await this.prisma.treasury.update({
            where: { id: 'single_row' },
            data: {
                currentBalance: new Prisma.Decimal(newBalance),
            },
        });

        // Calculate balance at the time of this transaction
        // Get all transactions before this date
        const transactionsBefore = await this.prisma.treasuryTransaction.findMany({
            where: {
                date: { lt: voucherDate },
            },
            orderBy: { date: 'asc' },
        });

        // Calculate cumulative balance up to this transaction
        let balanceBeforeThis = treasury?.openingBalance
            ? parseFloat(treasury.openingBalance.toString())
            : 0;
        transactionsBefore.forEach((tx) => {
            if (tx.type === 'IN') {
                balanceBeforeThis += parseFloat(tx.amount.toString());
            } else {
                balanceBeforeThis -= parseFloat(tx.amount.toString());
            }
        });

        // Add/subtract current transaction amount
        const balanceAfterThis = type === 'RECEIPT'
            ? balanceBeforeThis + amount
            : balanceBeforeThis - amount;

        // Create treasury transaction
        await this.prisma.treasuryTransaction.create({
            data: {
                date: voucherDate,
                type: type === 'RECEIPT' ? 'IN' : 'OUT',
                amount: new Prisma.Decimal(amount),
                note: `${type === 'RECEIPT' ? 'سند قبض' : 'سند صرف'}`,
                balanceAfter: new Prisma.Decimal(balanceAfterThis),
                voucherId,
                createdBy: 'system',
            },
        });
    }

    /**
     * Update bank account balance
     */
    private async updateBankAccount(
        bankAccountId: string,
        type: VoucherType,
        amount: number,
        voucherId: string,
        voucherDate: Date,
        userId: string,
    ) {
        const account = await this.prisma.bankAccount.findUnique({
            where: { id: bankAccountId },
        });

        if (!account) {
            throw new NotFoundException('الحساب البنكي غير موجود');
        }

        const currentBalance = parseFloat(account.currentBalance.toString());
        const newBalance =
            type === 'RECEIPT' ? currentBalance + amount : currentBalance - amount;

        await this.prisma.bankAccount.update({
            where: { id: bankAccountId },
            data: {
                currentBalance: new Prisma.Decimal(newBalance),
            },
        });

        // Calculate balance at the time of this transaction
        // Get all transactions before this date for this account
        const transactionsBefore = await this.prisma.bankTransaction.findMany({
            where: {
                bankAccountId,
                date: { lt: voucherDate },
            },
            orderBy: { date: 'asc' },
        });

        // Calculate cumulative balance up to this transaction
        // Start from opening balance
        const openingBalance = parseFloat(account.openingBalance.toString());
        let balanceBeforeThis = openingBalance;

        // Add all transactions before this one
        transactionsBefore.forEach((tx) => {
            if (tx.type === 'IN') {
                balanceBeforeThis += parseFloat(tx.amount.toString());
            } else {
                balanceBeforeThis -= parseFloat(tx.amount.toString());
            }
        });

        // Add/subtract current transaction amount
        const balanceAfterThis = type === 'RECEIPT'
            ? balanceBeforeThis + amount
            : balanceBeforeThis - amount;

        // Create bank transaction record
        await this.prisma.bankTransaction.create({
            data: {
                date: voucherDate,
                type: type === 'RECEIPT' ? 'IN' : 'OUT',
                amount: new Prisma.Decimal(amount),
                description: `${type === 'RECEIPT' ? 'سند قبض' : 'سند صرف'}`,
                balanceAfter: new Prisma.Decimal(balanceAfterThis),
                bankAccountId,
                voucherId,
                createdBy: userId,
            },
        });
    }

    /**
     * Get expense account based on party type
     */
    private getExpenseAccount(
        partyType: string,
        partyId?: string,
        categoryId?: string,
    ): string {
        switch (partyType) {
            case 'CUSTOMER':
                return `customer:${partyId}`;
            case 'EMPLOYEE':
                return `employee:${partyId}`;
            case 'AGENT':
                return `agent:${partyId}`;
            case 'OTHER':
                return categoryId ? `expense:${categoryId}` : 'expense:other';
            default:
                return 'expense:other';
        }
    }

    /**
     * Create automatic payment voucher for bank transfer fees.
     * This is called when a receipt voucher has bank fees deducted.
     * 
     * Flow:
     * 1. Receipt voucher credits bank with FULL amount (e.g. 10,000)
     * 2. This payment voucher debits bank with fee amount (e.g. 50)
     * 3. Net bank effect = 10,000 - 50 = 9,950 (matches actual received)
     * 4. Customer account is settled for full 10,000
     * 5. Bank fees recorded as expense
     */
    private async createBankFeePaymentVoucher(
        receiptVoucherId: string,
        bankAccountId: string,
        feeAmount: number,
        voucherDate: Date,
        userId: string,
        parentCode: string,
        parentType: string = 'RECEIPT',
    ) {
        // Find or create the "مصروفات بنكية" expense category
        let bankFeeCategory = await this.prisma.expenseCategory.findFirst({
            where: { name: 'مصروفات بنكية' },
        });

        if (!bankFeeCategory) {
            bankFeeCategory = await this.prisma.expenseCategory.create({
                data: {
                    name: 'مصروفات بنكية',
                    isProtected: true,
                    sortOrder: 1,
                },
            });
        }

        // Generate payment voucher code
        const feeCode = await this.generateVoucherCode('PAYMENT', voucherDate);

        // Fetch bank name for the party name
        const bankAccount = await this.prisma.bankAccount.findUnique({
            where: { id: bankAccountId },
            include: { bank: true },
        });
        const bankName = bankAccount?.bank?.name || 'البنك';

        // Create the payment voucher for bank fees
        const feeVoucher = await this.prisma.voucher.create({
            data: {
                code: feeCode,
                type: 'PAYMENT',
                partyType: 'OTHER',
                partyName: bankName,
                method: 'BANK_TRANSFER',
                bankAccountId,
                amount: new Prisma.Decimal(feeAmount),
                note: `رسوم تحويل بنكية - مرتبط ب${parentType === 'RECEIPT' ? 'سند قبض' : parentType === 'INTERNAL_TRANSFER' ? 'تحويل داخلي' : 'سند صرف'} رقم ${parentCode}`,
                date: voucherDate,
                categoryId: bankFeeCategory.id,
                linkedVoucherId: receiptVoucherId,
                createdBy: userId,
            },
        });

        // Deduct fee from bank account (reverses part of the receipt credit)
        await this.updateBankAccount(
            bankAccountId,
            'PAYMENT',
            feeAmount,
            feeVoucher.id,
            voucherDate,
            userId,
        );

        // Create ledger entry: debit bank expenses, credit bank
        await this.ledger.createEntry({
            sourceType: 'VOUCHER',
            sourceId: feeVoucher.id,
            debitAccount: `expense:${bankFeeCategory.id}`,
            creditAccount: `bank:${bankAccountId}`,
            amount: feeAmount,
            description: `رسوم تحويل بنكية - سند صرف رقم ${feeCode}`,
        });

        return feeVoucher;
    }

    /**
     * Get revenue account based on party type
     */
    private getRevenueAccount(partyType: string, partyId?: string): string {
        switch (partyType) {
            case 'CUSTOMER':
                return `customer:${partyId}`;
            case 'EMPLOYEE':
                return `employee:${partyId}`;
            case 'AGENT':
                return `agent:${partyId}`;
            default:
                return 'revenue:other';
        }
    }

    /**
     * Find all vouchers
     */
    async findAll(query: QueryVouchersDto) {
        const { type, from, to, q, page = 1, limit = 100 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.VoucherWhereInput = {};

        if (type) where.type = type;

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' } },
                { note: { contains: q, mode: 'insensitive' } },
                { partyName: { contains: q, mode: 'insensitive' } },
            ];
        }

        const [vouchers, total] = await Promise.all([
            this.prisma.voucher.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                    bankAccount: {
                        include: {
                            bank: true,
                        },
                    },
                    category: true,
                    linkedVoucher: {
                        select: {
                            id: true,
                            code: true,
                            type: true,
                        }
                    },
                    linkedByVoucher: {
                        select: {
                            id: true,
                            code: true,
                            type: true,
                        }
                    },
                },
            }),
            this.prisma.voucher.count({ where }),
        ]);

        return {
            data: vouchers,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Find one voucher
     */
    async findOne(id: string) {
        const voucher = await this.prisma.voucher.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                bankAccount: {
                    include: {
                        bank: true,
                    },
                },
                category: true,
            },
        });

        if (!voucher) {
            throw new NotFoundException('السند غير موجود');
        }

        return voucher;
    }

    /**
     * Update voucher
     */
    async update(id: string, updateVoucherDto: UpdateVoucherDto) {
        const voucher = await this.findOne(id);

        const updateData: any = {};

        if (updateVoucherDto.partyType !== undefined) updateData.partyType = updateVoucherDto.partyType;
        if (updateVoucherDto.partyId !== undefined) updateData.partyId = updateVoucherDto.partyId;
        if (updateVoucherDto.partyName !== undefined) updateData.partyName = updateVoucherDto.partyName;
        if (updateVoucherDto.method !== undefined) updateData.method = updateVoucherDto.method;
        if (updateVoucherDto.bankAccountId !== undefined) updateData.bankAccountId = updateVoucherDto.bankAccountId;
        if (updateVoucherDto.referenceNumber !== undefined) updateData.referenceNumber = updateVoucherDto.referenceNumber;
        if (updateVoucherDto.amount !== undefined) updateData.amount = new Prisma.Decimal(updateVoucherDto.amount);
        if (updateVoucherDto.categoryId !== undefined) updateData.categoryId = updateVoucherDto.categoryId;
        if (updateVoucherDto.note !== undefined) updateData.note = updateVoucherDto.note;
        if (updateVoucherDto.date !== undefined) updateData.date = new Date(updateVoucherDto.date);
        if (updateVoucherDto.sourceType !== undefined) updateData.sourceType = updateVoucherDto.sourceType;
        if (updateVoucherDto.sourceAccountId !== undefined) updateData.sourceAccountId = updateVoucherDto.sourceAccountId;
        if (updateVoucherDto.destType !== undefined) updateData.destType = updateVoucherDto.destType;
        if (updateVoucherDto.destAccountId !== undefined) updateData.destAccountId = updateVoucherDto.destAccountId;

        const updatedVoucher = await this.prisma.voucher.update({
            where: { id },
            data: updateData,
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                bankAccount: true,
                category: true,
            },
        });

        return updatedVoucher;
    }

    /**
     * Delete voucher
     */
    async remove(id: string) {
        const voucher = await this.prisma.voucher.findUnique({
            where: { id },
            include: {
                linkedByVoucher: true, // fee payment voucher that links TO this receipt
            },
        });

        if (!voucher) {
            throw new NotFoundException('السند غير موجود');
        }

        // Helper to reverse financial effects and delete a voucher
        const reverseAndDelete = async (v: any) => {
            // Reverse bank/treasury balance
            if (v.method === 'CASH') {
                const treasury = await this.prisma.treasury.findUnique({
                    where: { id: 'single_row' },
                });
                const currentBalance = treasury?.currentBalance
                    ? parseFloat(treasury.currentBalance.toString())
                    : 0;
                const amount = parseFloat(v.amount.toString());
                const newBalance = v.type === 'RECEIPT'
                    ? currentBalance - amount
                    : currentBalance + amount;
                await this.prisma.treasury.update({
                    where: { id: 'single_row' },
                    data: { currentBalance: new Prisma.Decimal(newBalance) },
                });
            } else if (v.bankAccountId) {
                const account = await this.prisma.bankAccount.findUnique({
                    where: { id: v.bankAccountId },
                });
                if (account) {
                    const currentBalance = parseFloat(account.currentBalance.toString());
                    const amount = parseFloat(v.amount.toString());
                    const newBalance = v.type === 'RECEIPT'
                        ? currentBalance - amount
                        : currentBalance + amount;
                    await this.prisma.bankAccount.update({
                        where: { id: v.bankAccountId },
                        data: { currentBalance: new Prisma.Decimal(newBalance) },
                    });
                }
            }

            // Delete related transactions
            await this.prisma.bankTransaction.deleteMany({ where: { voucherId: v.id } });
            await this.prisma.treasuryTransaction.deleteMany({ where: { voucherId: v.id } });
            await this.prisma.ledgerEntry.deleteMany({ where: { sourceId: v.id } });
        };

        // === Group receipt cascade deletion ===
        if (voucher.groupReceiptId) {
            const groupVouchers = await this.prisma.voucher.findMany({
                where: { groupReceiptId: voucher.groupReceiptId },
                include: { linkedByVoucher: true },
            });

            for (const gv of groupVouchers) {
                // Delete linked bank fee voucher first (if any)
                if (gv.linkedByVoucher) {
                    await reverseAndDelete(gv.linkedByVoucher);
                    await this.prisma.voucher.delete({ where: { id: gv.linkedByVoucher.id } });
                }
                await reverseAndDelete(gv);
                await this.prisma.voucher.delete({ where: { id: gv.id } });
            }

            return { message: `تم حذف ${groupVouchers.length} سند قبض مرتبطين بنجاح` };
        }

        // === Internal transfer deletion ===
        if (voucher.type === 'INTERNAL_TRANSFER') {
            const amount = parseFloat(voucher.amount.toString());

            // Reverse source account (add back what was taken)
            if (voucher.sourceType === 'TREASURY') {
                await this.prisma.treasury.update({
                    where: { id: 'single_row' },
                    data: { currentBalance: { increment: amount } },
                });
                await this.prisma.treasuryTransaction.deleteMany({ where: { voucherId: voucher.id } });
            } else if (voucher.sourceType === 'BANK' && voucher.sourceAccountId) {
                await this.prisma.bankAccount.update({
                    where: { id: voucher.sourceAccountId },
                    data: { currentBalance: { increment: amount } },
                });
                await this.prisma.bankTransaction.deleteMany({ where: { voucherId: voucher.id } });
            }

            // Reverse destination account (remove what was added)
            if (voucher.destType === 'TREASURY') {
                await this.prisma.treasury.update({
                    where: { id: 'single_row' },
                    data: { currentBalance: { decrement: amount } },
                });
                // Treasury transactions already deleted above if source was also treasury
                await this.prisma.treasuryTransaction.deleteMany({ where: { voucherId: voucher.id } });
            } else if (voucher.destType === 'BANK' && voucher.destAccountId) {
                await this.prisma.bankAccount.update({
                    where: { id: voucher.destAccountId },
                    data: { currentBalance: { decrement: amount } },
                });
                await this.prisma.bankTransaction.deleteMany({ where: { voucherId: voucher.id } });
            }

            // Delete ledger entries
            await this.prisma.ledgerEntry.deleteMany({ where: { sourceId: voucher.id } });

            // Delete linked fee voucher if exists
            if (voucher.linkedByVoucher) {
                await reverseAndDelete(voucher.linkedByVoucher);
                await this.prisma.voucher.delete({ where: { id: voucher.linkedByVoucher.id } });
            }

            // Delete the transfer voucher itself
            await this.prisma.voucher.delete({ where: { id } });

            return { message: 'تم حذف التحويل الداخلي بنجاح' };
        }

        // === Single voucher deletion ===
        // Find linked voucher (either direction)
        const linkedVoucher = voucher.linkedByVoucher
            || (voucher.linkedVoucherId
                ? await this.prisma.voucher.findUnique({ where: { id: voucher.linkedVoucherId } })
                : null);

        // Delete linked voucher first (it has the FK reference)
        if (linkedVoucher) {
            await reverseAndDelete(linkedVoucher);
            await this.prisma.voucher.delete({ where: { id: linkedVoucher.id } });
        }

        // Now reverse and delete the main voucher
        await reverseAndDelete(voucher);
        await this.prisma.voucher.delete({ where: { id } });

        return { message: 'تم حذف السند بنجاح' };
    }

    /**
     * Get expenses report with filters and statistics
     */
    async getExpensesReport(filters: ExpensesReportDto) {
        const { startDate, endDate, categoryId, partyType, method } = filters;

        const where: Prisma.VoucherWhereInput = { type: 'PAYMENT' };

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                where.date.lte = endOfDay;
            }
        }

        if (categoryId) where.categoryId = categoryId;
        if (partyType) where.partyType = partyType;
        if (method) where.method = method;

        const expenses = await this.prisma.voucher.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                category: true,
                bankAccount: { include: { bank: true } },
                creator: { select: { username: true } },
            },
        });

        const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
        const totalCount = expenses.length;

        const byCategory = expenses.reduce((acc, e) => {
            const name = e.category?.name || 'غير مصنف';
            const amount = parseFloat(e.amount.toString());
            const existing = acc.find(i => i.name === name);
            if (existing) {
                existing.amount += amount;
                existing.count += 1;
            } else {
                acc.push({ name, amount, count: 1 });
            }
            return acc;
        }, [] as Array<{ name: string; amount: number; count: number }>);

        const byMethod = expenses.reduce((acc, e) => {
            const method = e.method === 'CASH' ? 'نقدي' : 'بنكي';
            const amount = parseFloat(e.amount.toString());
            const existing = acc.find(i => i.method === method);
            if (existing) {
                existing.amount += amount;
                existing.count += 1;
            } else {
                acc.push({ method, amount, count: 1 });
            }
            return acc;
        }, [] as Array<{ method: string; amount: number; count: number }>);

        const partyTypeNames = { CUSTOMER: 'عملاء', EMPLOYEE: 'موظفين', AGENT: 'وكلاء', OTHER: 'أخرى' };
        const byPartyType = expenses.reduce((acc, e) => {
            const type = partyTypeNames[e.partyType] || 'أخرى';
            const amount = parseFloat(e.amount.toString());
            const existing = acc.find(i => i.type === type);
            if (existing) {
                existing.amount += amount;
                existing.count += 1;
            } else {
                acc.push({ type, amount, count: 1 });
            }
            return acc;
        }, [] as Array<{ type: string; amount: number; count: number }>);

        return {
            expenses: expenses.map(e => ({
                id: e.id,
                code: e.code,
                date: e.date,
                partyName: e.partyName || '-',
                categoryName: e.category?.name || 'غير مصنف',
                amount: parseFloat(e.amount.toString()),
                method: e.method === 'CASH' ? 'نقدي' : 'بنكي',
                bankName: e.bankAccount?.bank?.name || '-',
                note: e.note || '-',
                createdBy: e.creator?.username || '-',
            })),
            summary: {
                totalAmount,
                totalCount,
                averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
                byCategory: byCategory.sort((a, b) => b.amount - a.amount),
                byMethod,
                byPartyType: byPartyType.sort((a, b) => b.amount - a.amount),
            },
        };
    }

    /**
     * Get revenue report with filters and statistics
     */
    async getRevenueReport(filters: ExpensesReportDto) {
        const { startDate, endDate, partyType, method } = filters;

        const where: Prisma.VoucherWhereInput = { type: 'RECEIPT' };

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                where.date.lte = endOfDay;
            }
        }

        if (partyType) where.partyType = partyType;
        if (method) where.method = method;

        const revenues = await this.prisma.voucher.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                bankAccount: { include: { bank: true } },
                creator: { select: { username: true } },
            },
        });

        const totalAmount = revenues.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
        const totalCount = revenues.length;

        const byMethod = revenues.reduce((acc, e) => {
            const method = e.method === 'CASH' ? 'نقدي' : 'بنكي';
            const amount = parseFloat(e.amount.toString());
            const existing = acc.find(i => i.method === method);
            if (existing) {
                existing.amount += amount;
                existing.count += 1;
            } else {
                acc.push({ method, amount, count: 1 });
            }
            return acc;
        }, [] as Array<{ method: string; amount: number; count: number }>);

        const partyTypeNames = { CUSTOMER: 'عملاء', EMPLOYEE: 'موظفين', AGENT: 'وكلاء', OTHER: 'أخرى' };
        const byPartyType = revenues.reduce((acc, e) => {
            const type = partyTypeNames[e.partyType] || 'أخرى';
            const amount = parseFloat(e.amount.toString());
            const existing = acc.find(i => i.type === type);
            if (existing) {
                existing.amount += amount;
                existing.count += 1;
            } else {
                acc.push({ type, amount, count: 1 });
            }
            return acc;
        }, [] as Array<{ type: string; amount: number; count: number }>);

        return {
            revenues: revenues.map(e => ({
                id: e.id,
                code: e.code,
                date: e.date,
                partyName: e.partyName || '-',
                amount: parseFloat(e.amount.toString()),
                method: e.method === 'CASH' ? 'نقدي' : 'بنكي',
                bankName: e.bankAccount?.bank?.name || '-',
                note: e.note || '-',
                createdBy: e.creator?.username || '-',
            })),
            summary: {
                totalAmount,
                totalCount,
                averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
                byMethod,
                byPartyType: byPartyType.sort((a, b) => b.amount - a.amount),
            },
        };
    }

    /**
     * Create internal transfer between treasury and bank accounts
     */
    async createInternalTransfer(dto: any, userId: string) {
        const { sourceType, sourceAccountId, destType, destAccountId, amount, date, note, referenceNumber, hasBankFees, actualAmountReceived } = dto;

        // Validation: source and destination must be different
        if (sourceType === destType && sourceType === 'TREASURY') {
            throw new BadRequestException('لا يمكن التحويل من الخزنة إلى الخزنة');
        }
        if (sourceType === destType && sourceAccountId === destAccountId) {
            throw new BadRequestException('لا يمكن التحويل من نفس الحساب إلى نفس الحساب');
        }

        // Check source balance
        if (sourceType === 'TREASURY') {
            const balance = await this.getTreasuryBalance();
            if (balance < amount) {
                throw new BadRequestException('رصيد الخزنة غير كافٍ');
            }
        } else if (sourceType === 'BANK') {
            const bankAccount = await this.prisma.bankAccount.findUnique({
                where: { id: sourceAccountId },
            });
            if (!bankAccount) {
                throw new NotFoundException('الحساب البنكي المصدر غير موجود');
            }
            if (parseFloat(bankAccount.currentBalance.toString()) < amount) {
                throw new BadRequestException('رصيد الحساب البنكي غير كافٍ');
            }
        }

        // Check destination account exists
        if (destType === 'BANK') {
            const destAccount = await this.prisma.bankAccount.findUnique({
                where: { id: destAccountId },
            });
            if (!destAccount) {
                throw new NotFoundException('الحساب البنكي المستقبل غير موجود');
            }
        }

        // Generate voucher code
        const voucherDate = new Date(date);
        const year = voucherDate.getFullYear().toString().slice(-2);

        // Get the highest sequence number for internal transfers this year
        const lastVoucher = await this.prisma.voucher.findFirst({
            where: {
                type: 'INTERNAL_TRANSFER',
                date: {
                    gte: new Date(voucherDate.getFullYear(), 0, 1),
                    lte: new Date(voucherDate.getFullYear(), 11, 31, 23, 59, 59),
                },
            },
            orderBy: {
                code: 'desc',
            },
        });

        let sequence = 1;
        if (lastVoucher && lastVoucher.code) {
            // Extract sequence number from the last code (format: TR26-1)
            const parts = lastVoucher.code.split('-');
            if (parts.length === 2) {
                const lastSequence = parseInt(parts[1], 10);
                if (!isNaN(lastSequence)) {
                    sequence = lastSequence + 1;
                }
            }
        }

        // Ensure uniqueness by checking if code exists and incrementing if needed
        let code = `TR${year}-${sequence}`;
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const existing = await this.prisma.voucher.findUnique({
                where: { code },
            });

            if (!existing) {
                break;
            }

            sequence++;
            code = `TR${year}-${sequence}`;
            attempts++;
        }

        // Get account names for description
        let sourceAccountName = 'الخزنة';
        let destAccountName = 'الخزنة';

        if (sourceType === 'BANK') {
            const sourceAcc = await this.prisma.bankAccount.findUnique({
                where: { id: sourceAccountId },
                include: { bank: true }
            });
            sourceAccountName = sourceAcc ? `${sourceAcc.bank?.name || 'بنك'} - ${sourceAcc.accountNo}` : 'البنك';
        }

        if (destType === 'BANK') {
            const destAcc = await this.prisma.bankAccount.findUnique({
                where: { id: destAccountId },
                include: { bank: true }
            });
            destAccountName = destAcc ? `${destAcc.bank?.name || 'بنك'} - ${destAcc.accountNo}` : 'البنك';
        }

        // Create voucher
        const voucher = await this.prisma.voucher.create({
            data: {
                code,
                type: 'INTERNAL_TRANSFER',
                partyType: 'OTHER',
                partyName: `تحويل من ${sourceAccountName} إلى ${destAccountName}`,
                method: 'CASH',
                amount,
                date: voucherDate,
                note: note || null,
                referenceNumber: referenceNumber || null,
                sourceType,
                sourceAccountId: sourceAccountId || null,
                destType,
                destAccountId: destAccountId || null,
                createdBy: userId,
                hasBankFees: hasBankFees || false,
                actualAmountReceived: hasBankFees ? new Prisma.Decimal(actualAmountReceived) : null,
                bankFeeAmount: hasBankFees ? new Prisma.Decimal(actualAmountReceived - amount) : null,
            },
            include: {
                creator: { select: { username: true } },
            },
        });

        // Calculate balances for treasury transactions based on historical data
        let treasuryBalanceAfterSource = 0;
        let treasuryBalanceAfterDest = 0;

        if (sourceType === 'TREASURY' || destType === 'TREASURY') {
            // Get all transactions before this transfer date
            const transactionsBefore = await this.prisma.treasuryTransaction.findMany({
                where: {
                    date: { lt: voucherDate },
                },
                orderBy: { date: 'asc' },
            });

            // Calculate balance at the time of this transfer
            let balanceBeforeTransfer = 0;
            transactionsBefore.forEach((tx) => {
                if (tx.type === 'IN') {
                    balanceBeforeTransfer += parseFloat(tx.amount.toString());
                } else {
                    balanceBeforeTransfer -= parseFloat(tx.amount.toString());
                }
            });

            if (sourceType === 'TREASURY') {
                treasuryBalanceAfterSource = balanceBeforeTransfer - amount;
                if (destType === 'TREASURY') {
                    treasuryBalanceAfterDest = treasuryBalanceAfterSource + amount;
                }
            } else if (destType === 'TREASURY') {
                treasuryBalanceAfterDest = balanceBeforeTransfer + amount;
            }
        }

        // Update source account
        if (sourceType === 'TREASURY') {
            // Update treasury balance
            await this.prisma.treasury.update({
                where: { id: 'single_row' },
                data: {
                    currentBalance: { decrement: amount },
                },
            });

            await this.prisma.treasuryTransaction.create({
                data: {
                    type: 'OUT',
                    amount,
                    note: note || `إيداع بنكي من الخزنة في حساب ${destAccountName}`,
                    date: voucherDate,
                    balanceAfter: treasuryBalanceAfterSource,
                    voucherId: voucher.id,
                    createdBy: userId,
                },
            });
        } else if (sourceType === 'BANK') {
            // Get source bank account
            const sourceAccount = await this.prisma.bankAccount.findUnique({
                where: { id: sourceAccountId },
            });

            if (!sourceAccount) {
                throw new NotFoundException('الحساب البنكي المصدر غير موجود');
            }

            // Calculate balance at the time of this transaction
            const transactionsBefore = await this.prisma.bankTransaction.findMany({
                where: {
                    bankAccountId: sourceAccountId,
                    date: { lt: voucherDate },
                },
                orderBy: { date: 'asc' },
            });

            const openingBalance = parseFloat(sourceAccount.openingBalance.toString());
            let balanceBeforeThis = openingBalance;

            transactionsBefore.forEach((tx) => {
                if (tx.type === 'IN') {
                    balanceBeforeThis += parseFloat(tx.amount.toString());
                } else {
                    balanceBeforeThis -= parseFloat(tx.amount.toString());
                }
            });

            const balanceAfterThis = balanceBeforeThis - amount;

            // Update bank account balance
            await this.prisma.bankAccount.update({
                where: { id: sourceAccountId },
                data: {
                    currentBalance: { decrement: amount },
                },
            });

            // Create bank transaction record
            await this.prisma.bankTransaction.create({
                data: {
                    date: voucherDate,
                    type: 'OUT',
                    amount,
                    description: note || `تحويل داخلي إلى ${destAccountName}`,
                    balanceAfter: balanceAfterThis,
                    bankAccountId: sourceAccountId,
                    voucherId: voucher.id,
                    createdBy: userId,
                },
            });
        }

        // Update destination account
        if (destType === 'TREASURY') {
            // Update treasury balance
            await this.prisma.treasury.update({
                where: { id: 'single_row' },
                data: {
                    currentBalance: { increment: amount },
                },
            });

            await this.prisma.treasuryTransaction.create({
                data: {
                    type: 'IN',
                    amount,
                    note: note || `تغذية الخزنة من حساب ${sourceAccountName}`,
                    date: voucherDate,
                    balanceAfter: treasuryBalanceAfterDest,
                    voucherId: voucher.id,
                    createdBy: userId,
                },
            });
        } else if (destType === 'BANK') {
            // Get destination bank account
            const destAccount = await this.prisma.bankAccount.findUnique({
                where: { id: destAccountId },
            });

            if (!destAccount) {
                throw new NotFoundException('الحساب البنكي المستقبل غير موجود');
            }

            // Calculate balance at the time of this transaction
            const transactionsBefore = await this.prisma.bankTransaction.findMany({
                where: {
                    bankAccountId: destAccountId,
                    date: { lt: voucherDate },
                },
                orderBy: { date: 'asc' },
            });

            const openingBalance = parseFloat(destAccount.openingBalance.toString());
            let balanceBeforeThis = openingBalance;

            transactionsBefore.forEach((tx) => {
                if (tx.type === 'IN') {
                    balanceBeforeThis += parseFloat(tx.amount.toString());
                } else {
                    balanceBeforeThis -= parseFloat(tx.amount.toString());
                }
            });

            const balanceAfterThis = balanceBeforeThis + amount;

            // Update bank account balance
            await this.prisma.bankAccount.update({
                where: { id: destAccountId },
                data: {
                    currentBalance: { increment: amount },
                },
            });

            // Create bank transaction record
            await this.prisma.bankTransaction.create({
                data: {
                    date: voucherDate,
                    type: 'IN',
                    amount,
                    description: note || `تحويل داخلي من ${sourceAccountName}`,
                    balanceAfter: balanceAfterThis,
                    bankAccountId: destAccountId,
                    voucherId: voucher.id,
                    createdBy: userId,
                },
            });
        }

        // Create ledger entry
        await this.ledger.createEntry({
            sourceType: 'VOUCHER',
            sourceId: voucher.id,
            description: `تحويل داخلي - ${code}`,
            debitAccount: destAccountName,
            creditAccount: sourceAccountName,
            amount,
        });

        // If has bank fees, create auto payment voucher for the fee
        if (hasBankFees && actualAmountReceived && actualAmountReceived > amount && sourceAccountId) {
            const feeAmount = actualAmountReceived - amount;
            await this.createBankFeePaymentVoucher(
                voucher.id,
                sourceAccountId,
                feeAmount,
                voucherDate,
                userId,
                code,
                'INTERNAL_TRANSFER',
            );
        }

        return voucher;
    }

    /**
     * Helper method to get current treasury balance
     */
    private async getTreasuryBalance(): Promise<number> {
        const treasury = await this.prisma.treasury.findUnique({
            where: { id: 'single_row' },
        });

        if (!treasury) {
            return 0;
        }

        return parseFloat(treasury.currentBalance?.toString() || '0');
    }

    /**
     * Get total collections from customers for the current month
     */
    async getMonthlyCollections() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const result = await this.prisma.voucher.aggregate({
            where: {
                type: 'RECEIPT',
                partyType: 'CUSTOMER',
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            _sum: {
                amount: true,
            },
        });

        return Number(result._sum.amount || 0);
    }
}
