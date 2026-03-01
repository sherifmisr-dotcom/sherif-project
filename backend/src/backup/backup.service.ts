import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CreateBackupDto, UpdateBackupSettingsDto } from './dto/backup.dto';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
    private readonly backupDir = path.join(process.cwd(), 'backups');

    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) {
        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Helper to convert BigInt to String for JSON serialization
    private serializeBackup(backup: any) {
        return {
            ...backup,
            size: backup.size.toString(),
        };
    }

    async createManualBackup(dto: CreateBackupDto, userId?: string) {
        const backup = await this.createBackup('MANUAL', dto.description, userId);

        // Send specific manual backup notification
        try {
            await this.notificationService.createForAllAdmins({
                type: 'MANUAL_BACKUP_CREATED',
                title: 'تم إنشاء نسخة احتياطية يدوية',
                message: `تم إنشاء نسخة احتياطية يدوية بنجاح.${dto.description ? ' الوصف: ' + dto.description : ''}`,
                data: { backupId: backup.id },
            });
        } catch (notifError) {
            console.error('Failed to create manual backup notification:', notifError);
        }

        return this.serializeBackup(backup);
    }

    async createAutomaticBackup() {
        const backup = await this.createBackup('AUTOMATIC', 'Automatic scheduled backup');
        return this.serializeBackup(backup);
    }

    private async createBackup(type: 'MANUAL' | 'AUTOMATIC', description?: string, userId?: string) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.sql`;
        const filepath = path.join(this.backupDir, filename);

        // Create backup record with IN_PROGRESS status
        const backup = await this.prisma.backup.create({
            data: {
                filename,
                filepath,
                size: BigInt(0),
                type,
                status: 'IN_PROGRESS',
                description,
                createdBy: userId,
            },
        });

        try {
            // Get database connection details from environment
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) {
                throw new Error('DATABASE_URL not found in environment');
            }

            // Parse database URL
            const url = new URL(dbUrl);
            const dbName = url.pathname.substring(1);
            const dbUser = url.username;
            const dbPassword = url.password;
            const dbHost = url.hostname;
            const dbPort = url.port || '5432';

            // Find PostgreSQL bin directory
            const pgBinPath = process.env.PG_BIN_PATH || 'C:\\Program Files\\PostgreSQL\\17\\bin';
            const pgDumpPath = path.join(pgBinPath, 'pg_dump.exe');

            // Set environment variable for password
            process.env.PGPASSWORD = dbPassword;

            // Create pg_dump command with comprehensive options
            // --clean: drop objects before recreating
            // --if-exists: use IF EXISTS when dropping objects
            // --column-inserts: use column names in INSERT commands
            // --disable-triggers: disable triggers during restore
            // --exclude-table: skip backup history tables to avoid conflicts on restore
            const pgDumpCmd = `"${pgDumpPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p --clean --if-exists --column-inserts --disable-triggers --exclude-table=backups --exclude-table=backup_settings -f "${filepath}"`;

            // Execute backup
            await execAsync(pgDumpCmd);

            // Clear password from environment
            delete process.env.PGPASSWORD;

            // Get file size
            const stats = fs.statSync(filepath);
            const fileSize = BigInt(stats.size);

            // Update backup record
            const updatedBackup = await this.prisma.backup.update({
                where: { id: backup.id },
                data: {
                    size: fileSize,
                    status: 'COMPLETED',
                },
            });

            // Send success notification
            try {
                const sizeInMB = (Number(fileSize) / (1024 * 1024)).toFixed(2);
                await this.notificationService.createForAllAdmins({
                    type: 'BACKUP_SUCCESS',
                    title: 'تم تنفيذ النسخ الاحتياطي بنجاح',
                    message: `تم إنشاء نسخة احتياطية ${type === 'AUTOMATIC' ? 'تلقائية' : 'يدوية'} بحجم ${sizeInMB} MB.`,
                    data: { backupId: updatedBackup.id, type, size: sizeInMB },
                });
            } catch (notifError) {
                console.error('Failed to create backup success notification:', notifError);
            }

            return updatedBackup;
        } catch (error) {
            // Clear password from environment
            delete process.env.PGPASSWORD;

            // Update backup status to FAILED
            await this.prisma.backup.update({
                where: { id: backup.id },
                data: { status: 'FAILED' },
            });

            // Delete partial backup file if exists
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }

            // Send failure notification
            try {
                await this.notificationService.createForAllAdmins({
                    type: 'BACKUP_FAILED',
                    title: 'فشل تنفيذ النسخ الاحتياطي',
                    message: `فشل إنشاء نسخة احتياطية ${type === 'AUTOMATIC' ? 'تلقائية' : 'يدوية'}.`,
                    data: { backupId: backup.id, type, error: error.message },
                });
            } catch (notifError) {
                console.error('Failed to create backup failure notification:', notifError);
            }

            throw new InternalServerErrorException(`Backup failed: ${error.message}`);
        }
    }

    async restoreBackup(backupId: string) {
        const backup = await this.prisma.backup.findUnique({
            where: { id: backupId },
        });

        if (!backup) {
            throw new NotFoundException('Backup not found');
        }

        if (backup.status !== 'COMPLETED') {
            throw new BadRequestException('Cannot restore from incomplete backup');
        }

        if (!fs.existsSync(backup.filepath)) {
            throw new NotFoundException('Backup file not found on disk');
        }

        // Save backup info before restore (since the restore may overwrite the backups table)
        const backupInfo = {
            filename: backup.filename,
            filepath: backup.filepath,
            type: backup.type,
            description: backup.description,
            createdBy: backup.createdBy,
        };

        try {
            // Get database connection details
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) {
                throw new Error('DATABASE_URL not found in environment');
            }

            const url = new URL(dbUrl);
            const dbName = url.pathname.substring(1);
            const dbUser = url.username;
            const dbPassword = url.password;
            const dbHost = url.hostname;
            const dbPort = url.port || '5432';

            // Find PostgreSQL bin directory
            const pgBinPath = process.env.PG_BIN_PATH || 'C:\\Program Files\\PostgreSQL\\17\\bin';
            const psqlPath = path.join(pgBinPath, 'psql.exe');

            // Set environment variable for password
            process.env.PGPASSWORD = dbPassword;

            // Disconnect Prisma to avoid connection issues
            await this.prisma.$disconnect();

            // Restore from backup
            const restoreCmd = `"${psqlPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --single-transaction -f "${backup.filepath}"`;
            await execAsync(restoreCmd);

            // Reconnect Prisma
            await this.prisma.$connect();

            // Clear password from environment
            delete process.env.PGPASSWORD;

            // ─── Post-restore cleanup ───
            // The SQL dump may have overwritten the backups table with old data.
            // Fix all records to match the actual files on disk.
            try {
                // 1. Mark all IN_PROGRESS records as FAILED (stale from old data)
                await this.prisma.backup.updateMany({
                    where: { status: 'IN_PROGRESS' },
                    data: { status: 'FAILED' },
                });

                // 2. Sync all backup records with actual files on disk
                const allBackups = await this.prisma.backup.findMany();
                for (const b of allBackups) {
                    if (fs.existsSync(b.filepath)) {
                        const stats = fs.statSync(b.filepath);
                        const fileSize = BigInt(stats.size);
                        if (b.status !== 'COMPLETED' || b.size !== fileSize) {
                            await this.prisma.backup.update({
                                where: { id: b.id },
                                data: { status: 'COMPLETED', size: fileSize },
                            });
                        }
                    } else {
                        // File doesn't exist on disk — mark as FAILED
                        if (b.status !== 'FAILED') {
                            await this.prisma.backup.update({
                                where: { id: b.id },
                                data: { status: 'FAILED' },
                            });
                        }
                    }
                }

                // 3. Ensure the restored backup itself has a valid record
                const restoredRecord = await this.prisma.backup.findFirst({
                    where: { filename: backupInfo.filename },
                });
                if (!restoredRecord) {
                    // The restored backup wasn't in the old data — create a record
                    const stats = fs.statSync(backupInfo.filepath);
                    await this.prisma.backup.create({
                        data: {
                            filename: backupInfo.filename,
                            filepath: backupInfo.filepath,
                            size: BigInt(stats.size),
                            type: backupInfo.type,
                            status: 'COMPLETED',
                            description: backupInfo.description || 'نسخة احتياطية مستعادة',
                            createdBy: backupInfo.createdBy,
                        },
                    });
                }
            } catch (cleanupError) {
                console.error('Post-restore cleanup warning:', cleanupError);
                // Don't throw — the restore itself succeeded
            }

            // Send restore success notification
            try {
                await this.notificationService.createForAllAdmins({
                    type: 'BACKUP_RESTORED',
                    title: 'تمت استعادة نسخة احتياطية بنجاح',
                    message: `تمت استعادة النسخة الاحتياطية "${backupInfo.filename}" بنجاح. تم تحديث قاعدة البيانات.`,
                    data: { backupId, filename: backupInfo.filename },
                });
            } catch (notifError) {
                console.error('Failed to create restore notification:', notifError);
            }

            return { message: 'Backup restored successfully', backup: this.serializeBackup(backup) };
        } catch (error) {
            // Clear password from environment
            delete process.env.PGPASSWORD;

            // Try to reconnect Prisma
            try {
                await this.prisma.$connect();
            } catch (reconnectError) {
                console.error('Failed to reconnect Prisma:', reconnectError);
            }

            // Send restore failure notification
            try {
                await this.notificationService.createForAllAdmins({
                    type: 'BACKUP_RESTORE_FAILED',
                    title: 'فشل استعادة النسخة الاحتياطية',
                    message: `فشلت استعادة النسخة الاحتياطية "${backupInfo.filename}".`,
                    data: { backupId, error: error.message },
                });
            } catch (notifError) {
                console.error('Failed to create restore failure notification:', notifError);
            }

            throw new InternalServerErrorException(`Restore failed: ${error.message}`);
        }
    }

    async getBackupHistory(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [backups, total] = await Promise.all([
            this.prisma.backup.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.backup.count(),
        ]);

        return {
            data: backups.map(backup => this.serializeBackup(backup)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async downloadBackup(backupId: string) {
        const backup = await this.prisma.backup.findUnique({
            where: { id: backupId },
        });

        if (!backup) {
            throw new NotFoundException('Backup not found');
        }

        if (!fs.existsSync(backup.filepath)) {
            throw new NotFoundException('Backup file not found on disk');
        }

        return {
            filepath: backup.filepath,
            filename: backup.filename,
        };
    }

    async deleteBackup(backupId: string) {
        const backup = await this.prisma.backup.findUnique({
            where: { id: backupId },
        });

        if (!backup) {
            throw new NotFoundException('Backup not found');
        }

        // Delete file from disk
        if (fs.existsSync(backup.filepath)) {
            fs.unlinkSync(backup.filepath);
        }

        // Delete database record
        await this.prisma.backup.delete({
            where: { id: backupId },
        });

        return { message: 'Backup deleted successfully' };
    }

    async cleanupOldBackups() {
        const settings = await this.prisma.appSetting.findUnique({
            where: { id: 'single_row' },
        });

        if (!settings) {
            return;
        }

        const retentionDays = settings.backupRetentionDays;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Find old backups
        const oldBackups = await this.prisma.backup.findMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
                type: 'AUTOMATIC', // Only cleanup automatic backups
            },
        });

        // Delete old backups
        for (const backup of oldBackups) {
            try {
                if (fs.existsSync(backup.filepath)) {
                    fs.unlinkSync(backup.filepath);
                }
                await this.prisma.backup.delete({
                    where: { id: backup.id },
                });
            } catch (error) {
                console.error(`Failed to delete backup ${backup.id}:`, error);
            }
        }

        return { deleted: oldBackups.length };
    }

    async getBackupSettings() {
        const settings = await this.prisma.appSetting.findUnique({
            where: { id: 'single_row' },
            select: {
                autoBackupEnabled: true,
                autoBackupFrequency: true,
                autoBackupTime: true,
                backupRetentionDays: true,
            },
        });

        return settings;
    }

    async updateBackupSettings(dto: UpdateBackupSettingsDto) {
        // Get current settings to detect changes
        const currentSettings = await this.prisma.appSetting.findUnique({
            where: { id: 'single_row' },
            select: { autoBackupEnabled: true },
        });

        const settings = await this.prisma.appSetting.update({
            where: { id: 'single_row' },
            data: dto,
            select: {
                autoBackupEnabled: true,
                autoBackupFrequency: true,
                autoBackupTime: true,
                backupRetentionDays: true,
            },
        });

        // Send notification if auto backup was toggled
        if (dto.autoBackupEnabled !== undefined && currentSettings && dto.autoBackupEnabled !== currentSettings.autoBackupEnabled) {
            try {
                if (dto.autoBackupEnabled) {
                    await this.notificationService.createForAllAdmins({
                        type: 'AUTO_BACKUP_ENABLED',
                        title: 'تم تفعيل النسخ الاحتياطي التلقائي',
                        message: `تم تفعيل النسخ الاحتياطي التلقائي بتكرار ${settings.autoBackupFrequency === 'DAILY' ? 'يومي' : 'أسبوعي'} في الساعة ${settings.autoBackupTime}.`,
                        data: { frequency: settings.autoBackupFrequency, time: settings.autoBackupTime },
                    });
                } else {
                    await this.notificationService.createForAllAdmins({
                        type: 'AUTO_BACKUP_DISABLED',
                        title: 'تم تعطيل النسخ الاحتياطي التلقائي',
                        message: 'تم إيقاف النسخ الاحتياطي التلقائي. يرجى التأكد من إجراء نسخ احتياطي يدوي بشكل دوري.',
                        data: {},
                    });
                }
            } catch (notifError) {
                console.error('Failed to create backup settings notification:', notifError);
            }
        }

        return settings;
    }

    async uploadBackup(file: Express.Multer.File, description?: string, userId?: string) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const filename = `uploaded-${timestamp}-${randomSuffix}.sql`;
        const filepath = path.join(this.backupDir, filename);

        try {
            // Ensure backup directory exists
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }

            // Save the uploaded file to the backups directory
            if (!file.buffer) {
                throw new BadRequestException('لم يتم استلام محتوى الملف');
            }
            fs.writeFileSync(filepath, file.buffer);

            // Get file size from the written file
            const stats = fs.statSync(filepath);
            const fileSize = BigInt(stats.size);

            // Create backup record
            const backup = await this.prisma.backup.create({
                data: {
                    filename,
                    filepath,
                    size: fileSize,
                    type: 'UPLOADED',
                    status: 'COMPLETED',
                    description: description || 'نسخة احتياطية مرفوعة يدوياً',
                    createdBy: userId,
                },
            });

            return this.serializeBackup(backup);
        } catch (error) {
            console.error('Upload backup error:', error);
            // Cleanup file if it was written but DB insert failed
            if (fs.existsSync(filepath)) {
                try { fs.unlinkSync(filepath); } catch (e) { /* ignore cleanup errors */ }
            }
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(`فشل رفع النسخة الاحتياطية: ${error.message}`);
        }
    }
}

