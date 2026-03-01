import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { SetOpeningBalanceDto, QueryTransactionsDto } from './dto/treasury.dto';
import { UpdateTreasurySettingsDto } from './dto/treasury-settings.dto';
import { CarryForwardDto } from '../bank-accounts/dto/carry-forward.dto';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

@Injectable()
export class TreasuryService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) { }

    /**
     * Set opening balance (once only)
     */
    async setOpeningBalance(dto: SetOpeningBalanceDto, userId: string) {
        const treasury = await this.prisma.treasury.findUnique({
            where: { id: 'single_row' },
        });

        if (treasury?.openingSetAt) {
            throw new ForbiddenException('تم تعيين الرصيد الافتتاحي مسبقاً');
        }

        const updated = await this.prisma.treasury.update({
            where: { id: 'single_row' },
            data: {
                openingBalance: new Prisma.Decimal(dto.openingBalance),
                currentBalance: new Prisma.Decimal(dto.openingBalance),
                openingSetAt: new Date(),
                openingSetBy: userId,
            },
        });

        // Create TreasurySettings record for frontend display
        await this.prisma.treasurySettings.create({
            data: {
                id: 'single_row',
                openingBalance: new Prisma.Decimal(dto.openingBalance),
                openingBalanceDate: new Date(),
                isInitialBalance: true,
            },
        });

        // Send notification
        try {
            await this.notificationService.createForAllAdmins({
                type: 'TREASURY_OPENING_SET',
                title: 'تم تعيين الرصيد الافتتاحي للخزنة',
                message: `تم تعيين الرصيد الافتتاحي للخزنة: ${dto.openingBalance} ر.س.`,
                data: { amount: dto.openingBalance },
            });
        } catch (notifError) {
            console.error('Failed to create treasury opening notification:', notifError);
        }

        return updated;
    }

    /**
     * Get treasury balance
     */
    async getBalance() {
        const treasury = await this.prisma.treasury.findUnique({
            where: { id: 'single_row' },
        });

        if (!treasury) {
            throw new BadRequestException('الخزنة غير موجودة');
        }

        // Get settings for preventNegativeTreasury
        const settings = await this.prisma.appSetting.findUnique({
            where: { id: 'single_row' },
        });

        return {
            currentBalance: treasury.currentBalance
                ? parseFloat(treasury.currentBalance.toString())
                : 0,
            openingBalance: treasury.openingBalance
                ? parseFloat(treasury.openingBalance.toString())
                : null,
            openingSetAt: treasury.openingSetAt,
            openingSetBy: treasury.openingSetBy,
            preventNegativeTreasury: settings?.preventNegativeTreasury ?? false,
        };
    }

    /**
     * Get treasury transactions
     */
    async getTransactions(query: QueryTransactionsDto) {
        const { from, to, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.TreasuryTransactionWhereInput = {};

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        const [transactions, total] = await Promise.all([
            this.prisma.treasuryTransaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ date: 'desc' }, { id: 'desc' }],
                include: {
                    voucher: {
                        select: {
                            code: true,
                            type: true,
                            sourceType: true,
                            sourceAccountId: true,
                            destType: true,
                            destAccountId: true,
                        },
                    },
                },
            }),
            this.prisma.treasuryTransaction.count({ where }),
        ]);

        // Map transactions to include voucher details at root level for easier access
        const mappedTransactions = transactions.map(tx => ({
            ...tx,
            sourceAccountId: tx.voucher?.sourceAccountId,
            destAccountId: tx.voucher?.destAccountId,
            sourceType: tx.voucher?.sourceType,
            destType: tx.voucher?.destType,
        }));

        return {
            data: mappedTransactions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get treasury report
     */
    async getReport(from?: string, to?: string) {
        const where: Prisma.TreasuryTransactionWhereInput = {};

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) {
                const endDate = new Date(to);
                endDate.setHours(23, 59, 59, 999);
                where.date.lte = endDate;
            }
        }

        const [transactions, totals, openingBalance] = await Promise.all([
            this.prisma.treasuryTransaction.findMany({
                where,
                orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
                include: {
                    voucher: {
                        select: {
                            code: true,
                            type: true,
                            partyName: true,
                            note: true,
                            sourceType: true,
                            sourceAccountId: true,
                            destType: true,
                            destAccountId: true,
                        },
                    },
                },
            }),
            this.prisma.treasuryTransaction.groupBy({
                by: ['type'],
                where,
                _sum: {
                    amount: true,
                },
            }),
            this.getOpeningBalance(from),
        ]);

        const totalIn = totals.find((t) => t.type === 'IN')?._sum.amount || 0;
        const totalOut = totals.find((t) => t.type === 'OUT')?._sum.amount || 0;

        // Calculate running balance for each transaction (chronological order)
        let runningBalance = openingBalance;
        const mappedTransactions = transactions.map(tx => {
            const amount = parseFloat(tx.amount.toString());
            if (tx.type === 'IN') {
                runningBalance += amount;
            } else {
                runningBalance -= amount;
            }
            return {
                ...tx,
                balanceAfter: parseFloat(runningBalance.toFixed(2)),
                sourceAccountId: tx.voucher?.sourceAccountId,
                destAccountId: tx.voucher?.destAccountId,
                sourceType: tx.voucher?.sourceType,
                destType: tx.voucher?.destType,
            };
        });

        return {
            transactions: mappedTransactions,
            openingBalance,
            summary: {
                totalIn: parseFloat(totalIn.toString()),
                totalOut: parseFloat(totalOut.toString()),
                net: parseFloat(totalIn.toString()) - parseFloat(totalOut.toString()),
            },
        };
    }

    private async getOpeningBalance(from?: string): Promise<number> {
        const treasury = await this.prisma.treasury.findUnique({
            where: { id: 'single_row' },
        });

        if (!from || !treasury?.openingBalance) {
            return treasury?.openingBalance ? parseFloat(treasury.openingBalance.toString()) : 0;
        }

        // Calculate balance before the 'from' date
        const transactionsBefore = await this.prisma.treasuryTransaction.findMany({
            where: {
                date: {
                    lt: new Date(from),
                },
            },
        });

        let balance = parseFloat(treasury.openingBalance.toString());
        for (const tx of transactionsBefore) {
            if (tx.type === 'IN') {
                balance += parseFloat(tx.amount.toString());
            } else {
                balance -= parseFloat(tx.amount.toString());
            }
        }

        return balance;
    }

    /**
     * Update treasury settings
     */
    async updateSettings(preventNegativeTreasury: boolean) {
        const settings = await this.prisma.appSetting.findUnique({
            where: { id: 'single_row' },
        });

        if (!settings) {
            throw new BadRequestException('الإعدادات غير موجودة');
        }

        const updated = await this.prisma.appSetting.update({
            where: { id: 'single_row' },
            data: {
                preventNegativeTreasury,
            },
        });

        return updated;
    }

    /**
     * Get treasury settings (opening balance info)
     */
    async getTreasurySettings() {
        let settings = await this.prisma.treasurySettings.findUnique({
            where: { id: 'single_row' },
        });

        if (!settings) {
            // Return null if settings don't exist (e.g., after system reset)
            // This allows the frontend to show "Open Opening Balance" button
            return null;
        }

        return {
            ...settings,
            openingBalance: parseFloat(settings.openingBalance.toString()),
        };
    }

    /**
     * Update treasury settings
     */
    async updateTreasurySettings(dto: UpdateTreasurySettingsDto) {
        const settings = await this.getTreasurySettings();

        const updateData: any = {};
        if (dto.openingBalance !== undefined) {
            updateData.openingBalance = new Prisma.Decimal(dto.openingBalance);
        }
        if (dto.openingBalanceDate) {
            updateData.openingBalanceDate = new Date(dto.openingBalanceDate);
        }
        if (dto.carryForwardNote !== undefined) {
            updateData.carryForwardNote = dto.carryForwardNote;
        }

        return this.prisma.treasurySettings.update({
            where: { id: 'single_row' },
            data: updateData,
        });
    }

    /**
     * Carry forward treasury balance to new period
     */
    async carryForwardBalance(dto: CarryForwardDto, userId?: string, skipDuplicateCheck = false, executionType: 'MANUAL' | 'AUTO' = 'MANUAL') {
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

        // Check for recent carry forward in the same month (skip for auto mode)
        if (!skipDuplicateCheck) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const recentLog = await this.prisma.carryForwardLog.findFirst({
                where: {
                    type: 'TREASURY',
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
                    `تم الترحيل بالفعل لهذا الشهر (${format(recentLog.createdAt, 'MMMM yyyy', { locale: ar })}). لا يمكن الترحيل أكثر من مرة في نفس الشهر.`
                );
            }
        }

        // Calculate current balance from all transactions
        const currentBalance = await this.getCurrentBalance();

        // Determine period name for the note
        const fromDate = new Date();
        const periodName = dto.periodType === 'MONTH'
            ? format(fromDate, 'MMMM yyyy', { locale: ar })
            : fromDate.getFullYear().toString();

        // Update treasury settings with new opening balance
        const result = await this.prisma.treasurySettings.update({
            where: { id: 'single_row' },
            data: {
                openingBalance: new Prisma.Decimal(currentBalance),
                openingBalanceDate: new Date(dto.newPeriodStartDate),
                carryForwardNote: `رصيد مرحل من ${periodName}`,
                isInitialBalance: false,
            },
        });

        // Create log entry
        await this.prisma.carryForwardLog.create({
            data: {
                type: 'TREASURY',
                entityId: null,
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

        // Send notification for manual carry-forward
        if (executionType === 'MANUAL') {
            try {
                await this.notificationService.createForAllAdmins({
                    type: 'CARRY_FORWARD_MANUAL',
                    title: 'تم تنفيذ الترحيل اليدوي بنجاح',
                    message: `تم تنفيذ الترحيل اليدوي للفترة: ${periodName}.`,
                    data: { periodType: dto.periodType, periodName, balance: currentBalance },
                });
            } catch (notifError) {
                console.error('Failed to create manual carry-forward notification:', notifError);
            }
        }

        return result;
    }

    /**
     * Calculate current treasury balance from transactions
     */
    async getCurrentBalance(): Promise<number> {
        const settings = await this.getTreasurySettings();
        const transactions = await this.prisma.treasuryTransaction.findMany();

        let balance = settings ? parseFloat(settings.openingBalance.toString()) : 0;

        transactions.forEach((tx) => {
            if (tx.type === 'IN') {
                balance += parseFloat(tx.amount.toString());
            } else {
                balance -= parseFloat(tx.amount.toString());
            }
        });

        return balance;
    }
}
