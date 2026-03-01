import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { GrantPermissionDto, RevokePermissionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from './decorators/require-permission.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionsController {
    constructor(
        private readonly permissionsService: PermissionsService,
        private readonly notificationService: NotificationService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Get all available permission definitions
     */
    @Get('definitions')
    @ApiOperation({ summary: 'Get all permission definitions' })
    @ApiResponse({ status: 200, description: 'List of all permissions' })
    async getAllPermissions() {
        return this.permissionsService.getAllPermissions();
    }

    /**
     * Get current user's permissions
     */
    @Get('me/permissions')
    @ApiOperation({ summary: 'Get current user permissions' })
    async getMyPermissions(@CurrentUser() user: any) {
        const permissions = await this.permissionsService.getUserPermissions(user.id);
        const isSuperAdmin = await this.permissionsService.isSuperAdmin(user.id);
        return { permissions, isSuperAdmin };
    }

    /**
     * Get a specific user's permissions
     */
    @Get('user/:userId')
    @RequirePermission('users.manage_permissions')
    @ApiOperation({ summary: 'Get a specific user\'s permissions' })
    async getUserPermissions(@Param('userId') userId: string) {
        const permissions = await this.permissionsService.getUserPermissions(userId);
        const isSuperAdmin = await this.permissionsService.isSuperAdmin(userId);
        return { permissions, isSuperAdmin };
    }

    /**
     * Grant a permission to a user
     */
    @Post('grant')
    @RequirePermission('users.manage_permissions')
    @ApiOperation({ summary: 'Grant a permission to a user' })
    @ApiResponse({ status: 200, description: 'Permission granted successfully' })
    @ApiResponse({ status: 400, description: 'Invalid permission code' })
    @ApiResponse({ status: 403, description: 'Cannot modify super admin permissions' })
    async grantPermission(
        @Body() dto: GrantPermissionDto,
        @CurrentUser() currentUser: any,
    ) {
        await this.permissionsService.grantPermission(
            dto.userId,
            dto.permissionCode,
            currentUser.id,
        );

        return {
            message: 'تم منح الصلاحية بنجاح',
            success: true,
        };
    }

    /**
     * Revoke a permission from a user
     */
    @Post('revoke')
    @RequirePermission('users.manage_permissions')
    @ApiOperation({ summary: 'Revoke a permission from a user' })
    @ApiResponse({ status: 200, description: 'Permission revoked successfully' })
    @ApiResponse({ status: 400, description: 'Invalid permission code' })
    @ApiResponse({ status: 403, description: 'Cannot modify super admin permissions' })
    async revokePermission(
        @Body() dto: RevokePermissionDto,
        @CurrentUser() currentUser: any,
    ) {
        await this.permissionsService.revokePermission(
            dto.userId,
            dto.permissionCode,
            currentUser.id,
        );

        return {
            message: 'تم إلغاء الصلاحية بنجاح',
            success: true,
        };
    }

    /**
     * Fire a single notification after permission changes are complete.
     * Called by the frontend once after all grant/revoke operations finish.
     */
    @Post('notify-change')
    @RequirePermission('users.manage_permissions')
    @ApiOperation({ summary: 'Fire notification for permission changes' })
    async notifyPermissionChange(
        @Body('userId') userId: string,
    ) {
        try {
            const targetUser = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { fullName: true, username: true },
            });
            await this.notificationService.createForAllAdminsDeduped({
                type: 'PERMISSIONS_CHANGED',
                title: 'تعديل صلاحيات',
                message: `تم تعديل صلاحيات مستخدم: ${targetUser?.fullName || targetUser?.username}`,
            });
        } catch (e) { /* ignore notification errors */ }

        return { success: true };
    }
}
