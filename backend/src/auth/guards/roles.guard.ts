import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/types/user-role.type';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // If user is admin, grant access to everything
        if (user.isAdmin) {
            return true;
        }

        // For backward compatibility: check if ADMIN role is required
        // If ADMIN is required and user is not admin, deny access
        if (requiredRoles.includes('ADMIN')) {
            throw new ForbiddenException('Admin access required');
        }

        // For ACCOUNTANT and VIEWER roles, allow access
        // (In the future, this should check permissions instead)
        return true;
    }
}
