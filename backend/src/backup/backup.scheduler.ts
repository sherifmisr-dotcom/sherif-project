import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupScheduler {
    private readonly logger = new Logger(BackupScheduler.name);

    constructor(
        private readonly backupService: BackupService,
        private readonly prisma: PrismaService,
    ) { }

    // Check every minute if backup is needed
    @Cron(CronExpression.EVERY_MINUTE)
    async handleScheduledBackup() {
        try {
            const settings = await this.prisma.appSetting.findUnique({
                where: { id: 'single_row' },
            });

            if (!settings || !settings.autoBackupEnabled) {
                return;
            }

            const now = new Date();
            const [targetHour, targetMinute] = settings.autoBackupTime.split(':').map(Number);

            // Check if current time matches backup time exactly
            if (now.getHours() !== targetHour || now.getMinutes() !== targetMinute) {
                return;
            }

            // Check if backup is needed based on frequency
            const shouldBackup = await this.shouldCreateBackup(settings.autoBackupFrequency);

            if (shouldBackup) {
                this.logger.log('Creating scheduled automatic backup...');
                await this.backupService.createAutomaticBackup();
                this.logger.log('Automatic backup completed successfully');

                // Cleanup old backups
                await this.backupService.cleanupOldBackups();
            }
        } catch (error) {
            this.logger.error('Scheduled backup failed:', error);
        }
    }

    private async shouldCreateBackup(frequency: string): Promise<boolean> {
        // Get the last automatic backup
        const lastBackup = await this.prisma.backup.findFirst({
            where: { type: 'AUTOMATIC', status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
        });

        if (!lastBackup) {
            return true; // No previous backup, create one
        }

        const now = new Date();
        const lastBackupDate = new Date(lastBackup.createdAt);

        switch (frequency) {
            case 'DAILY':
                // Compare calendar dates (ignore time) — backup if last backup was on a different day
                const todayStr = now.toISOString().slice(0, 10);
                const lastStr = lastBackupDate.toISOString().slice(0, 10);
                return todayStr !== lastStr;

            case 'WEEKLY':
                // Allow backup if at least 6 days have passed (flexibility for timing)
                const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
                return (now.getTime() - lastBackupDate.getTime()) >= sixDaysMs;

            case 'MONTHLY':
                // Compare year-month — backup if different month
                const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const lastMonth = `${lastBackupDate.getFullYear()}-${String(lastBackupDate.getMonth() + 1).padStart(2, '0')}`;
                return nowMonth !== lastMonth;

            default:
                return false;
        }
    }

    // Cleanup old backups daily at 3 AM
    @Cron('0 3 * * *')
    async handleCleanup() {
        try {
            this.logger.log('Running backup cleanup...');
            const result = await this.backupService.cleanupOldBackups();
            this.logger.log(`Cleanup completed. Deleted ${result.deleted} old backups`);
        } catch (error) {
            this.logger.error('Backup cleanup failed:', error);
        }
    }
}
