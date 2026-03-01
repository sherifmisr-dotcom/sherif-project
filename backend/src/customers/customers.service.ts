import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto/customer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) { }

    async create(createCustomerDto: CreateCustomerDto) {
        // Check if customer with same name exists
        const existing = await this.prisma.customer.findUnique({
            where: { name: createCustomerDto.name },
        });

        // If customer exists and is not deleted, throw error
        if (existing && !existing.deletedAt) {
            throw new ConflictException('هذا الاسم مُسجَّل مسبقًا');
        }

        // If customer exists but is deleted, restore and update it
        if (existing && existing.deletedAt) {
            const data: any = {
                phone: createCustomerDto.phone,
                email: createCustomerDto.email,
                address: createCustomerDto.address,
                type: createCustomerDto.type,
                deletedAt: null,
                isActive: true,
            };

            if (createCustomerDto.openingBalance !== undefined) {
                data.openingBalance = new Prisma.Decimal(createCustomerDto.openingBalance);
                data.openingSide = createCustomerDto.openingSide;
            }

            return this.prisma.customer.update({
                where: { id: existing.id },
                data,
            });
        }

        // Create new customer
        const data: Prisma.CustomerCreateInput = {
            name: createCustomerDto.name,
            phone: createCustomerDto.phone,
            email: createCustomerDto.email,
            address: createCustomerDto.address,
            type: createCustomerDto.type,
        };

        if (createCustomerDto.openingBalance !== undefined) {
            data.openingBalance = new Prisma.Decimal(createCustomerDto.openingBalance);
            data.openingSide = createCustomerDto.openingSide;
        }

        return this.prisma.customer.create({ data });
    }

    async findAll(query: QueryCustomersDto) {
        const { q, type, page = 1, limit = 20, includeInactive, activeStatus } = query;
        const noPagination = Number(limit) === 0;

        const where: Prisma.CustomerWhereInput = {
            deletedAt: null,
        };

        // Handle activeStatus parameter (takes precedence over includeInactive)
        if (activeStatus) {
            if (activeStatus === 'active') {
                where.isActive = true;
            } else if (activeStatus === 'inactive') {
                where.isActive = false;
            }
            // If 'all', don't filter by isActive
        } else {
            // Fallback to old includeInactive logic for backward compatibility
            if (!includeInactive) {
                where.isActive = true;
            }
        }

        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ];
        }

        if (type) {
            where.type = type;
        }

        if (noPagination) {
            // limit=0 means return ALL customers (used by dropdown menus)
            const customers = await this.prisma.customer.findMany({
                where,
                orderBy: { name: 'asc' },
            });

            return {
                data: customers,
                meta: {
                    total: customers.length,
                    page: 1,
                    limit: 0,
                    totalPages: 1,
                },
            };
        }

        const skip = (page - 1) * limit;

        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.customer.count({ where }),
        ]);

        return {
            data: customers,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
        });

        if (!customer || customer.deletedAt) {
            throw new NotFoundException('العميل غير موجود');
        }

        return customer;
    }

    async update(id: string, updateCustomerDto: UpdateCustomerDto) {
        await this.findOne(id);

        return this.prisma.customer.update({
            where: { id },
            data: updateCustomerDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        // Check if customer has linked invoices
        const invoiceCount = await this.prisma.invoice.count({
            where: { customerId: id },
        });

        if (invoiceCount > 0) {
            throw new BadRequestException(
                'لا يمكن حذف العميل لارتباطه بسجلات مالية.\nيمكنك بدلاً من ذلك تعطيل العميل مع الاحتفاظ بسجلاته المحاسبية.'
            );
        }

        // Soft delete
        return this.prisma.customer.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async restore(id: string) {
        return this.prisma.customer.update({
            where: { id },
            data: { deletedAt: null },
        });
    }


    async toggleStatus(id: string) {
        const customer = await this.findOne(id);
        const newIsActive = !customer.isActive;

        const updated = await this.prisma.customer.update({
            where: { id },
            data: { isActive: newIsActive },
        });

        // Send notification
        try {
            await this.notificationService.createForAllAdmins({
                type: newIsActive ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED',
                title: newIsActive ? 'تم تفعيل عميل' : 'تم تعطيل عميل',
                message: newIsActive
                    ? `تم تفعيل العميل: ${customer.name}.`
                    : `تم تعطيل العميل: ${customer.name}.`,
                data: { customerId: id, customerName: customer.name, isActive: newIsActive },
            });
        } catch (notifError) {
            console.error('Failed to create customer status notification:', notifError);
        }

        return updated;
    }

    async getStats() {
        const total = await this.prisma.customer.count({
            where: { deletedAt: null, isActive: true },
        });

        const byType = await this.prisma.customer.groupBy({
            by: ['type'],
            where: { deletedAt: null, isActive: true },
            _count: true,
        });

        return {
            total,
            export: byType.find((t) => t.type === 'EXPORT')?._count || 0,
            import: byType.find((t) => t.type === 'IMPORT')?._count || 0,
            transit: byType.find((t) => t.type === 'TRANSIT')?._count || 0,
            free: byType.find((t) => t.type === 'FREE')?._count || 0,
        };
    }

    async getTotalBalance() {
        // Query the database view to get total debtors balance
        const result = await this.prisma.$queryRaw<Array<{ total_debtors: number }>>`
            SELECT 
                COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as total_debtors
            FROM customers_with_balance
            WHERE is_active = true
        `;

        return Number(result[0]?.total_debtors || 0);
    }
}
