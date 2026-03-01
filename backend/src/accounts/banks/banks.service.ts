import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import {
    CreateBankDto,
    UpdateBankDto,
    CreateBankAccountDto,
    UpdateBankAccountDto,
    QueryDto,
} from './dto/bank.dto';
import { CarryForwardDto } from './dto/carry-forward.dto';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

@Injectable()
export class BanksService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) { }

    // ============ BANKS ============

    async createBank(dto: CreateBankDto) {
        const existing = await this.prisma.bank.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('هذا البنك مُسجَّل مسبقاً');
        }

        return this.prisma.bank.create({
            data: {
                name: dto.name,
            },
        });
    }

    async findAllBanks(query: QueryDto) {
        const { q, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.BankWhereInput = {};

        if (q) {
            where.name = { contains: q, mode: 'insensitive' };
        }

        const [banks, total] = await Promise.all([
            this.prisma.bank.findMany({
                where,
                skip,
                take: limit,
                include: {
                    _count: {
                        select: {
                            accounts: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.bank.count({ where }),
        ]);

        return {
            data: banks,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOneBank(id: string) {
        const bank = await this.prisma.bank.findUnique({
            where: { id },
            include: {
                accounts: true,
            },
        });

        if (!bank) {
            throw new NotFoundException('البنك غير موجود');
        }

        return bank;
    }

    async updateBank(id: string, dto: UpdateBankDto) {
        await this.findOneBank(id);

        return this.prisma.bank.update({
            where: { id },
            data: dto,
        });
    }

    async removeBank(id: string) {
        await this.findOneBank(id);

        // Check if bank has accounts
        const count = await this.prisma.bankAccount.count({
            where: { bankId: id },
        });

        if (count > 0) {
            throw new ConflictException('لا يمكن حذف البنك لوجود حسابات مرتبطة به');
        }

        await this.prisma.bank.delete({
            where: { id },
        });

        return { message: 'تم حذف البنك بنجاح' };
    }

    // ============ BANK ACCOUNTS ============

    async createBankAccount(dto: CreateBankAccountDto) {
        // Check if bank exists
        const bank = await this.prisma.bank.findUnique({
            where: { id: dto.bankId },
        });

        if (!bank) {
            throw new NotFoundException('البنك غير موجود');
        }

        // Check if account number exists
        const existing = await this.prisma.bankAccount.findUnique({
            where: { accountNo: dto.accountNo },
        });

        if (existing) {
            throw new ConflictException('رقم الحساب مُسجَّل مسبقاً');
        }

        const openingBalance = dto.openingBalance || 0;

        return this.prisma.bankAccount.create({
            data: {
                bankId: dto.bankId,
                accountNo: dto.accountNo,
                openingBalance: new Prisma.Decimal(openingBalance),
                currentBalance: new Prisma.Decimal(openingBalance),
            },
            include: {
                bank: true,
            },
        }).then(async (account) => {
            // Send notification
            try {
                await this.notificationService.createForAllAdmins({
                    type: 'BANK_ACCOUNT_CREATED',
                    title: 'تم إنشاء حساب بنكي جديد',
                    message: `تم إنشاء حساب بنكي: ${account.bank.name} / ${account.accountNo}.`,
                    data: { accountId: account.id, bankName: account.bank.name, accountNo: account.accountNo },
                });
            } catch (notifError) {
                console.error('Failed to create bank account notification:', notifError);
            }
            return account;
        });
    }

    async findAllBankAccounts(query: QueryDto) {
        const { bankId, q, active, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.BankAccountWhereInput = {};

        if (bankId) where.bankId = bankId;

        if (active !== undefined) where.isActive = active;

        if (q) {
            where.accountNo = { contains: q, mode: 'insensitive' };
        }

        const [accounts, total] = await Promise.all([
            this.prisma.bankAccount.findMany({
                where,
                skip,
                take: limit,
                include: {
                    bank: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.bankAccount.count({ where }),
        ]);

        return {
            data: accounts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOneBankAccount(id: string) {
        const account = await this.prisma.bankAccount.findUnique({
            where: { id },
            include: {
                bank: true,
            },
        });

        if (!account) {
            throw new NotFoundException('الحساب البنكي غير موجود');
        }

        return account;
    }

    async updateBankAccount(id: string, dto: UpdateBankAccountDto) {
        await this.findOneBankAccount(id);

        return this.prisma.bankAccount.update({
            where: { id },
            data: dto,
            include: {
                bank: true,
            },
        });
    }

    async removeBankAccount(id: string) {
        const account = await this.findOneBankAccount(id);

        // Check if account has transactions (vouchers)
        const voucherCount = await this.prisma.voucher.count({
            where: { bankAccountId: id },
        });

        // Check if account is used in internal transfers (as source or destination)
        const transferCount = await this.prisma.voucher.count({
            where: {
                OR: [
                    { sourceAccountId: id },
                    { destAccountId: id },
                ],
            },
        });

        if (voucherCount > 0 || transferCount > 0) {
            throw new ConflictException('لا يمكن حذف الحساب لوجود حركات مرتبطة به');
        }

        // Get account details before delete for the notification
        const accountWithBank = await this.prisma.bankAccount.findUnique({
            where: { id },
            include: { bank: true },
        });

        await this.prisma.bankAccount.delete({
            where: { id },
        });

        // Send notification
        try {
            await this.notificationService.createForAllAdmins({
                type: 'BANK_ACCOUNT_DELETED',
                title: 'تم حذف حساب بنكي',
                message: `تم حذف حساب بنكي: ${accountWithBank?.bank?.name || ''} / ${accountWithBank?.accountNo || ''}.`,
                data: { bankName: accountWithBank?.bank?.name, accountNo: accountWithBank?.accountNo },
            });
        } catch (notifError) {
            console.error('Failed to create bank account deletion notification:', notifError);
        }

        return { message: 'تم حذف الحساب البنكي بنجاح' };
    }

    /**
     * Get bank account transactions (vouchers)
     */
    async getAccountTransactions(accountId: string, query: QueryDto) {
        await this.findOneBankAccount(accountId);

        const { from, to, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.VoucherWhereInput = {
            bankAccountId: accountId,
        };

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        const [vouchers, total] = await Promise.all([
            this.prisma.voucher.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                        },
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
     * Carry forward balance for a single bank account
     */
    async carryForwardBalance(id: string, dto: CarryForwardDto, userId?: string, skipDuplicateCheck = false, executionType: 'MANUAL' | 'AUTO' = 'MANUAL') {
        // Block manual carry-forward when auto is enabled
        if (!skipDuplicateCheck) {
            const autoSettings = await this.prisma.carryForwardSettings.findUnique({
                where: { id: 'single_row' },
            });
            if (autoSettings?.autoCarryForwardEnabled) {
                throw new BadRequestException(
                    'الترحيل التلقائي مفعّل حالياً. يرجى تعطيله أولاً من الإعدادات قبل الترحيل اليدوي.'
                );
            }
        }

        // Check for recent carry forward in the same month for this account (skip for auto mode)
        if (!skipDuplicateCheck) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const recentLog = await this.prisma.carryForwardLog.findFirst({
                where: {
                    type: 'BANK_ACCOUNT',
                    entityId: id,
                    status: 'SUCCESS',
                    createdAt: {
                        gte: new Date(currentYear, currentMonth, 1),
                        lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (recentLog) {
                throw new BadRequestException(
                    `تم الترحيل بالفعل لهذا الحساب في هذا الشهر (${format(recentLog.createdAt, 'MMMM yyyy', { locale: ar })}). لا يمكن الترحيل أكثر من مرة في نفس الشهر.`
                );
            }
        }

        const account = await this.findOneBankAccount(id);
        const currentBalance = parseFloat(account.currentBalance.toString());

        // Determine period name for the note
        const fromDate = new Date();
        const periodName = dto.periodType === 'MONTH'
            ? format(fromDate, 'MMMM yyyy', { locale: ar })
            : fromDate.getFullYear().toString();

        const result = await this.prisma.bankAccount.update({
            where: { id },
            data: {
                openingBalance: new Prisma.Decimal(currentBalance),
                openingBalanceDate: new Date(dto.newPeriodStartDate),
                carryForwardNote: `رصيد مرحل من ${periodName}`,
                isInitialBalance: false,
            },
            include: {
                bank: true,
            },
        });

        // Create log entry
        await this.prisma.carryForwardLog.create({
            data: {
                type: 'BANK_ACCOUNT',
                entityId: id,
                executionType,
                executedBy: userId || null,
                periodType: dto.periodType,
                fromDate: fromDate,
                toDate: new Date(dto.newPeriodStartDate),
                balanceAmount: new Prisma.Decimal(currentBalance),
                status: 'SUCCESS',
                errorMessage: null,
            },
        });

        return result;
    }

    /**
     * Carry forward balances for all bank accounts
     */
    async carryForwardAllBalances(dto: CarryForwardDto, userId?: string) {
        const result = await this.findAllBankAccounts({});
        const accounts = result.data;

        await Promise.all(
            accounts.map(account => this.carryForwardBalance(account.id, dto, userId))
        );

        return {
            message: `تم ترحيل أرصدة ${accounts.length} حساب بنكي بنجاح`,
            count: accounts.length,
        };
    }

    /**
     * Get total balance across all bank accounts
     */
    async getTotalBankBalance() {
        const result = await this.prisma.bankAccount.aggregate({
            where: {
                isActive: true,
            },
            _sum: {
                currentBalance: true,
            },
        });

        return Number(result._sum.currentBalance || 0);
    }
}
