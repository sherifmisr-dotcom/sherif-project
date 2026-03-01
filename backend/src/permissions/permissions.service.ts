import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get all permissions for a user
     * @param userId - User ID
     * @returns Array of permission codes
     */
    async getUserPermissions(userId: string): Promise<string[]> {
        // Check if user is super admin
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true },
        });

        // Super admin has all permissions
        if (user?.isSuperAdmin) {
            const allPermissions = await this.prisma.permission.findMany({
                select: { code: true },
            });
            return allPermissions.map(p => p.code);
        }

        // Get user's granted permissions
        const userPermissions = await this.prisma.userPermission.findMany({
            where: { userId },
            include: {
                permission: {
                    select: { code: true },
                },
            },
        });

        return userPermissions.map(up => up.permission.code);
    }

    /**
     * Grant a permission to a user
     * Auto-grants view permission if granting an action permission
     * @param userId - User ID
     * @param permissionCode - Permission code (e.g., "customers.create")
     * @param grantedBy - User ID who is granting the permission
     */
    async grantPermission(userId: string, permissionCode: string, grantedBy: string): Promise<void> {
        // Check if user is super admin
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true },
        });

        if (user?.isSuperAdmin) {
            throw new ForbiddenException('لا يمكن تعديل صلاحيات المسؤول الرئيسي');
        }

        // Find the permission
        const permission = await this.prisma.permission.findUnique({
            where: { code: permissionCode },
        });

        if (!permission) {
            throw new BadRequestException(`الصلاحية ${permissionCode} غير موجودة`);
        }

        // Check if permission already granted
        const existing = await this.prisma.userPermission.findUnique({
            where: {
                userId_permissionId: {
                    userId,
                    permissionId: permission.id,
                },
            },
        });

        if (existing) {
            return; // Already granted, no action needed
        }

        // Auto-grant view permission if this is an action permission
        if (!permission.isViewPermission) {
            const viewPermissionCode = this.getViewPermissionCode(permissionCode);
            if (viewPermissionCode) {
                await this.autoGrantViewPermission(userId, viewPermissionCode, grantedBy);
            }
        }

        // Grant the permission
        await this.prisma.userPermission.create({
            data: {
                userId,
                permissionId: permission.id,
                grantedBy,
            },
        });

        // Log the action
        await this.logPermissionChange(userId, permission.id, 'granted', grantedBy);
    }

    /**
     * Revoke a permission from a user
     * @param userId - User ID
     * @param permissionCode - Permission code
     * @param revokedBy - User ID who is revoking the permission
     */
    async revokePermission(userId: string, permissionCode: string, revokedBy: string): Promise<void> {
        // Check if user is super admin
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true },
        });

        if (user?.isSuperAdmin) {
            throw new ForbiddenException('لا يمكن تعديل صلاحيات المسؤول الرئيسي');
        }

        // Find the permission
        const permission = await this.prisma.permission.findUnique({
            where: { code: permissionCode },
        });

        if (!permission) {
            throw new BadRequestException(`الصلاحية ${permissionCode} غير موجودة`);
        }

        // Delete the permission
        await this.prisma.userPermission.deleteMany({
            where: {
                userId,
                permissionId: permission.id,
            },
        });

        // Log the action
        await this.logPermissionChange(userId, permission.id, 'revoked', revokedBy);
    }

    /**
     * Check if a user has a specific permission
     * @param userId - User ID
     * @param permissionCode - Permission code
     * @returns true if user has permission, false otherwise
     */
    async userHasPermission(userId: string, permissionCode: string): Promise<boolean> {
        // Check if user is super admin
        const isSuperAdmin = await this.isSuperAdmin(userId);
        if (isSuperAdmin) {
            return true;
        }

        // Check if user has the permission
        const permission = await this.prisma.permission.findUnique({
            where: { code: permissionCode },
        });

        if (!permission) {
            return false;
        }

        const userPermission = await this.prisma.userPermission.findUnique({
            where: {
                userId_permissionId: {
                    userId,
                    permissionId: permission.id,
                },
            },
        });

        return !!userPermission;
    }

    /**
     * Check if a user is a super admin
     * @param userId - User ID
     * @returns true if user is super admin, false otherwise
     */
    async isSuperAdmin(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true },
        });

        return user?.isSuperAdmin || false;
    }

    /**
     * Get all available permission definitions
     * @returns Array of all permissions
     */
    async getAllPermissions() {
        return this.prisma.permission.findMany({
            orderBy: [
                { screen: 'asc' },
                { subScreen: 'asc' },
                { action: 'asc' },
            ],
        });
    }

    /**
     * Auto-grant view permission if not already granted
     * @param userId - User ID
     * @param viewPermissionCode - View permission code
     * @param grantedBy - User ID who is granting the permission
     */
    private async autoGrantViewPermission(userId: string, viewPermissionCode: string, grantedBy: string): Promise<void> {
        const hasViewPermission = await this.userHasPermission(userId, viewPermissionCode);
        if (!hasViewPermission) {
            const viewPermission = await this.prisma.permission.findUnique({
                where: { code: viewPermissionCode },
            });

            if (viewPermission) {
                await this.prisma.userPermission.create({
                    data: {
                        userId,
                        permissionId: viewPermission.id,
                        grantedBy,
                    },
                });

                // Log the auto-grant
                await this.logPermissionChange(userId, viewPermission.id, 'granted', grantedBy);
            }
        }
    }

    /**
     * Extract view permission code from an action permission code
     * @param permissionCode - Action permission code (e.g., "customers.create")
     * @returns View permission code (e.g., "customers.view") or null
     */
    private getViewPermissionCode(permissionCode: string): string | null {
        const parts = permissionCode.split('.');
        if (parts.length < 2) {
            return null;
        }

        // For simple permissions like "customers.create" -> "customers.view"
        if (parts.length === 2) {
            return `${parts[0]}.view`;
        }

        // For nested permissions like "invoices.type1.create" -> "invoices.type1.view"
        // or "accounts.treasury.carry_forward" -> "accounts.treasury.view"
        const viewParts = parts.slice(0, -1);
        viewParts.push('view');
        return viewParts.join('.');
    }

    /**
     * Log permission change to audit log
     * @param userId - User ID
     * @param permissionId - Permission ID
     * @param action - Action performed (granted/revoked)
     * @param performedBy - User ID who performed the action
     */
    private async logPermissionChange(
        userId: string,
        permissionId: string,
        action: string,
        performedBy: string,
    ): Promise<void> {
        await this.prisma.permissionAuditLog.create({
            data: {
                userId,
                permissionId,
                action,
                performedBy,
            },
        });
    }
}
