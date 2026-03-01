import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TreasuryService } from '../treasury/treasury.service';
import { BanksService } from '../banks/banks.service';
import { NotificationService } from '../../notifications/notification.service';
import { Prisma } from '@prisma/client';
import { format, startOfMonth, startOfYear, addMonths, addYears, differenceInDays, setDate } from 'date-fns';
import { ar } from 'date-fns/locale';

@Injectable()
export class CarryForwardSchedulerService {
    private readonly logger = new Logger(CarryForwardSchedulerService.name);

    constructor(
        private prisma: PrismaService,
        private treasuryService: TreasuryService,
        @Inject(forwardRef(() => BanksService))
        private banksService: BanksService,
        private notificationService: NotificationService,
    ) { }

    // Run every day at midnight
    @Cron('0 0 * * *')
    async handleAutoCarryForward() {
        this.logger.log('Running automatic carry-forward check...');

        try {
            // Get carry-forward settings
            const settings = await this.getSettings();

            if (!settings.autoCarryForwardEnabled) {
                this.logger.log('Auto carry-forward is disabled');
                return;
            }

            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth(); // 0 = January

            // Check if today is the carry-forward day
            if (currentDay !== settings.carryForwardDay) {
                this.logger.log(`Today is day ${currentDay}, not carry-forward day (${settings.carryForwardDay})`);
                return;
            }

            // For yearly mode, only run in January
            if (settings.carryForwardType === 'YEAR' && currentMonth !== 0) {
                this.logger.log('Yearly carry-forward only runs in January, skipping');
                return;
            }

            // Check if we already ran today
            if (settings.lastAutoCarryForward) {
                const lastRun = new Date(settings.lastAutoCarryForward);
                if (
                    lastRun.getDate() === today.getDate() &&
                    lastRun.getMonth() === today.getMonth() &&
                    lastRun.getFullYear() === today.getFullYear()
                ) {
                    this.logger.log('Auto carry-forward already executed today');
                    return;
                }
            }

            this.logger.log('Executing automatic carry-forward...');

            // Calculate new period start date
            const newPeriodStartDate = settings.carryForwardType === 'MONTH'
                ? format(startOfMonth(today), 'yyyy-MM-dd')
                : format(startOfYear(today), 'yyyy-MM-dd');

            // Execute carry-forward for treasury (skip duplicate check, mark as AUTO)
            try {
                await this.treasuryService.carryForwardBalance(
                    {
                        periodType: settings.carryForwardType as 'MONTH' | 'YEAR',
                        newPeriodStartDate,
                    },
                    null, // no userId for auto
                    true, // skipDuplicateCheck
                    'AUTO', // executionType
                );
                this.logger.log('Treasury carry-forward completed successfully');
            } catch (error) {
                this.logger.error('Treasury carry-forward failed:', error.message);
            }

            // Execute carry-forward for ALL bank accounts (not just first 20)
            const result = await this.banksService.findAllBankAccounts({ limit: 99999 });
            const accounts = result.data;
            this.logger.log(`Processing ${accounts.length} bank accounts for carry-forward`);

            for (const account of accounts) {
                try {
                    await this.banksService.carryForwardBalance(
                        account.id,
                        {
                            periodType: settings.carryForwardType as 'MONTH' | 'YEAR',
                            newPeriodStartDate,
                        },
                        null, // no userId for auto
                        true, // skipDuplicateCheck
                        'AUTO', // executionType
                    );
                    this.logger.log(`Bank account ${account.accountNo} carry-forward completed`);
                } catch (error) {
                    this.logger.error(`Bank account ${account.accountNo} carry-forward failed:`, error.message);
                }
            }

            // Update last execution time
            await this.prisma.carryForwardSettings.update({
                where: { id: 'single_row' },
                data: { lastAutoCarryForward: new Date() },
            });

            this.logger.log('Automatic carry-forward completed successfully');

            // Create success notification
            await this.notificationService.createForAllAdmins({
                type: 'CARRY_FORWARD_SUCCESS',
                title: 'تم الترحيل التلقائي بنجاح',
                message: `تم ترحيل أرصدة الخزنة و${accounts.length} حساب بنكي ${settings.carryForwardType === 'MONTH' ? 'للشهر' : 'للسنة'} الجديدة بنجاح.`,
                data: {
                    periodType: settings.carryForwardType,
                    date: newPeriodStartDate,
                    bankAccountsCount: accounts.length,
                    executedAt: new Date(),
                },
            });
        } catch (error) {
            this.logger.error('Error in automatic carry-forward:', error);

            // Create failure notification
            try {
                await this.notificationService.createForAllAdmins({
                    type: 'CARRY_FORWARD_FAILED',
                    title: 'فشل الترحيل التلقائي',
                    message: `حدث خطأ أثناء الترحيل التلقائي: ${error.message}`,
                    data: {
                        error: error.message,
                        executedAt: new Date(),
                    },
                });
            } catch (notifError) {
                this.logger.error('Failed to send failure notification:', notifError);
            }
        }
    }

    // Check and create reminders (runs daily at 9 AM)
    @Cron('0 9 * * *')
    async checkAndCreateReminders() {
        try {
            const settings = await this.getSettings();
            const today = new Date();
            const currentDay = today.getDate();

            // ── Scenario 1: Auto carry-forward DISABLED → remind about manual carry-forward at month-end ──
            if (!settings.autoCarryForwardEnabled) {
                // Get last day of current month
                const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const daysUntilMonthEnd = lastDayOfMonth - currentDay;

                // Send reminder 3 days before month-end
                if (daysUntilMonthEnd === 3) {
                    const periodType = 'MONTH';
                    const periodName = format(today, 'MMMM yyyy', { locale: ar });

                    await this.notificationService.createForAllAdmins({
                        type: 'MONTH_END_REMINDER',
                        title: 'تذكير: نهاية الشهر',
                        message: `لم يتم تنفيذ ترحيل نهاية الشهر للفترة: ${periodName}.`,
                        data: {
                            periodType,
                            periodName,
                            daysRemaining: daysUntilMonthEnd,
                        },
                    });

                    this.logger.log('Month-end carry-forward reminder sent (auto CF disabled)');
                }
                return;
            }

            // ── Scenario 2: Auto carry-forward ENABLED ──
            if (!settings.notifyBeforeCarryForward) {
                return;
            }

            // Calculate days until carry-forward, accounting for next month
            let daysUntilCarryForward: number;

            if (settings.carryForwardDay > currentDay) {
                // Carry-forward day is later this month
                daysUntilCarryForward = settings.carryForwardDay - currentDay;
            } else if (settings.carryForwardDay <= currentDay) {
                // Carry-forward day has passed or is today — calculate for next month
                const nextMonth = addMonths(today, 1);
                const nextCarryForwardDate = setDate(nextMonth, settings.carryForwardDay);
                daysUntilCarryForward = differenceInDays(nextCarryForwardDate, today);
            }

            // For yearly mode, only send reminders in December (leading up to January)
            if (settings.carryForwardType === 'YEAR') {
                const currentMonth = today.getMonth();
                // Only remind in December
                if (currentMonth !== 11) {
                    return;
                }
                // Calculate days until Jan carry-forward day
                const nextYear = new Date(today.getFullYear() + 1, 0, settings.carryForwardDay);
                daysUntilCarryForward = differenceInDays(nextYear, today);
            }

            // Check if we should send a reminder
            if (daysUntilCarryForward === settings.notifyDaysBefore && daysUntilCarryForward > 0) {
                const carryForwardDate = new Date(today);
                carryForwardDate.setDate(carryForwardDate.getDate() + daysUntilCarryForward);

                // Send the existing CARRY_FORWARD_REMINDER
                await this.notificationService.createForAllAdmins({
                    type: 'CARRY_FORWARD_REMINDER',
                    title: 'تذكير: الترحيل التلقائي قريباً',
                    message: `سيتم الترحيل التلقائي ${settings.carryForwardType === 'MONTH' ? 'للشهر' : 'للسنة'} الجديدة بعد ${daysUntilCarryForward} ${daysUntilCarryForward === 1 ? 'يوم' : 'أيام'} (في ${format(carryForwardDate, 'PPP', { locale: ar })}).`,
                    data: {
                        periodType: settings.carryForwardType,
                        carryForwardDate: format(carryForwardDate, 'yyyy-MM-dd'),
                        daysRemaining: daysUntilCarryForward,
                    },
                });

                // Also send AUTO_CF_SCHEDULE with scheduled date/time info
                const periodName = settings.carryForwardType === 'MONTH'
                    ? format(addMonths(today, 1), 'MMMM yyyy', { locale: ar })
                    : (today.getFullYear() + 1).toString();

                await this.notificationService.createForAllAdmins({
                    type: 'AUTO_CF_SCHEDULE',
                    title: 'موعد الترحيل التلقائي',
                    message: `تم جدولة الترحيل التلقائي للفترة: ${periodName}.`,
                    data: {
                        periodType: settings.carryForwardType,
                        scheduledDate: format(carryForwardDate, 'yyyy-MM-dd'),
                        periodName,
                    },
                });

                this.logger.log(`Carry-forward reminder sent (${daysUntilCarryForward} days before)`);
            }
        } catch (error) {
            this.logger.error('Error checking carry-forward reminders:', error);
        }
    }

    async getSettings() {
        let settings = await this.prisma.carryForwardSettings.findUnique({
            where: { id: 'single_row' },
        });

        if (!settings) {
            settings = await this.prisma.carryForwardSettings.create({
                data: { id: 'single_row' },
            });
        }

        return settings;
    }

    async updateSettings(data: any) {
        const settings = await this.getSettings();

        return this.prisma.carryForwardSettings.update({
            where: { id: 'single_row' },
            data,
        });
    }

    async createLog(data: any) {
        return this.prisma.carryForwardLog.create({
            data,
        });
    }

    async getLogs(query: any = {}) {
        const where: any = {};

        if (query.type) where.type = query.type;
        if (query.executionType) where.executionType = query.executionType;
        if (query.status) where.status = query.status;
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) where.createdAt.gte = new Date(query.startDate);
            if (query.endDate) where.createdAt.lte = new Date(query.endDate);
        }

        const logs = await this.prisma.carryForwardLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0,
        });

        return logs.map(log => ({
            ...log,
            balanceAmount: parseFloat(log.balanceAmount.toString()),
        }));
    }
}
