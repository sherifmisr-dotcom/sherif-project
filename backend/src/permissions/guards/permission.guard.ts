import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class PermissionGuard implements CanActivate {
    private readonly logger = new Logger(PermissionGuard.name);

    constructor(
        private reflector: Reflector,
        private permissionsService: PermissionsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get required permissions from decorator metadata
        const requiredPermissions = this.reflector.get<string[]>(
            'permissions',
            context.getHandler(),
        );

        // If no permissions required, allow access
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Check if user is authenticated
        if (!user || !user.id) {
            throw new UnauthorizedException('يجب تسجيل الدخول للوصول إلى هذا المورد');
        }

        // Admin bypass - admins have full access to all resources
        if (user.isAdmin) {
            return true;
        }

        // Super Admin bypass - always allow access
        const isSuperAdmin = await this.permissionsService.isSuperAdmin(user.id);
        if (isSuperAdmin) {
            return true;
        }

        // Check if user has all required permissions
        const hasAllPermissions = await this.checkAllPermissions(user.id, requiredPermissions);

        if (!hasAllPermissions) {
            // Log the denied access attempt with detailed information
            const request = context.switchToHttp().getRequest();
            await this.logAccessDenied(
                user.id,
                requiredPermissions,
                request.method,
                request.url,
            );

            throw new ForbiddenException('ليس لديك صلاحية للوصول إلى هذا المورد');
        }

        return true;
    }

    /**
     * Check if user has all required permissions
     * @param userId - User ID
     * @param permissions - Array of required permission codes
     * @returns true if user has all permissions, false otherwise
     */
    private async checkAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
        for (const permission of permissions) {
            const hasPermission = await this.permissionsService.userHasPermission(userId, permission);
            if (!hasPermission) {
                return false;
            }
        }
        return true;
    }

    /**
     * Log access denied attempt
     * @param userId - User ID
     * @param permissions - Required permissions that were denied
     * @param method - HTTP method (GET, POST, etc.)
     * @param url - Request URL
     */
    private async logAccessDenied(
        userId: string,
        permissions: string[],
        method: string,
        url: string,
    ): Promise<void> {
        const logData = {
            event: 'ACCESS_DENIED',
            userId,
            requiredPermissions: permissions,
            action: `${method} ${url}`,
            timestamp: new Date().toISOString(),
        };

        // Log as warning with structured data
        this.logger.warn(
            `Access denied for user ${userId} attempting ${method} ${url}. Required permissions: ${permissions.join(', ')}`,
            JSON.stringify(logData),
        );
    }
}
