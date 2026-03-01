import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { PermissionGuard } from '../guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Decorator to require specific permissions for a route
 * Automatically applies JWT authentication and permission checking
 * 
 * @param permissions - One or more permission codes required to access the route
 * 
 * @example
 * ```typescript
 * @Get()
 * @RequirePermission('customers.view')
 * async getCustomers() {
 *   // Implementation
 * }
 * 
 * @Post()
 * @RequirePermission('customers.view', 'customers.create')
 * async createCustomer(@Body() dto: CreateCustomerDto) {
 *   // Implementation
 * }
 * ```
 */
export const RequirePermission = (...permissions: string[]) => {
    return applyDecorators(
        SetMetadata('permissions', permissions),
        UseGuards(JwtAuthGuard, PermissionGuard),
    );
};
