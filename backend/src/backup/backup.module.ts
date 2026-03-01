import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupScheduler } from './backup.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [
        PrismaModule,
        NotificationModule,
    ],
    controllers: [BackupController],
    providers: [BackupService, BackupScheduler],
    exports: [BackupService],
})
export class BackupModule { }
