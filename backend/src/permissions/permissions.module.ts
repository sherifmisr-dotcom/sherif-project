import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionGuard } from './guards/permission.guard';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [NotificationModule],
    controllers: [PermissionsController],
    providers: [PermissionsService, PermissionGuard],
    exports: [PermissionsService, PermissionGuard],
})
export class PermissionsModule { }
