import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerGroupDto, UpdateCustomerGroupDto, QueryCustomerGroupsDto } from './dto/customer-groups.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerGroupsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateCustomerGroupDto) {
        // Check if name already exists
        const existing = await this.prisma.customerGroup.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('هذا الاسم مُسجَّل مسبقًا');
        }

        // Create group
        const group = await this.prisma.customerGroup.create({
            data: {
                name: dto.name,
                notes: dto.notes,
            },
        });

        // Link customers if provided
        if (dto.customerIds && dto.customerIds.length > 0) {
            await this.prisma.customer.updateMany({
                where: { id: { in: dto.customerIds } },
                data: { groupId: group.id },
            });
        }

        // Return with customers
        return this.prisma.customerGroup.findUnique({
            where: { id: group.id },
            include: {
                customers: {
                    where: { deletedAt: null },
                    select: { id: true, name: true, type: true, isActive: true },
                },
            },
        });
    }

    async findAll(query: QueryCustomerGroupsDto) {
        const { q, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.CustomerGroupWhereInput = {};

        if (q) {
            where.name = { contains: q, mode: 'insensitive' };
        }

        const [groups, total] = await Promise.all([
            this.prisma.customerGroup.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customers: {
                        where: { deletedAt: null },
                        select: { id: true, name: true, type: true, isActive: true },
                    },
                },
            }),
            this.prisma.customerGroup.count({ where }),
        ]);

        // Calculate total balance for each group from the DB view
        const groupsWithBalance = await Promise.all(
            groups.map(async (group) => {
                const customerIds = group.customers.map((c) => c.id);
                let totalBalance = 0;

                if (customerIds.length > 0) {
                    const result = await this.prisma.$queryRaw<Array<{ total: number }>>`
                        SELECT COALESCE(SUM(current_balance), 0) as total
                        FROM customers_with_balance
                        WHERE id = ANY(${customerIds})
                    `;
                    totalBalance = Number(result[0]?.total || 0);
                }

                return {
                    ...group,
                    totalBalance,
                    customerCount: group.customers.length,
                };
            }),
        );

        return {
            data: groupsWithBalance,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const group = await this.prisma.customerGroup.findUnique({
            where: { id },
            include: {
                customers: {
                    where: { deletedAt: null },
                    select: { id: true, name: true, type: true, isActive: true },
                },
            },
        });

        if (!group) {
            throw new NotFoundException('المجموعة غير موجودة');
        }

        // Get balance for each customer
        const customerIds = group.customers.map((c) => c.id);
        let customersWithBalance = group.customers.map((c) => ({
            ...c,
            currentBalance: 0,
        }));

        if (customerIds.length > 0) {
            const balances = await this.prisma.$queryRaw<
                Array<{ id: string; current_balance: number }>
            >`
                SELECT id, current_balance
                FROM customers_with_balance
                WHERE id = ANY(${customerIds})
            `;

            customersWithBalance = group.customers.map((c) => ({
                ...c,
                currentBalance: Number(
                    balances.find((b) => b.id === c.id)?.current_balance || 0,
                ),
            }));
        }

        const totalBalance = customersWithBalance.reduce(
            (sum, c) => sum + c.currentBalance,
            0,
        );

        return {
            ...group,
            customers: customersWithBalance,
            totalBalance,
            customerCount: customersWithBalance.length,
        };
    }

    async update(id: string, dto: UpdateCustomerGroupDto) {
        await this.findOne(id);

        // Check if new name conflicts
        if (dto.name) {
            const existing = await this.prisma.customerGroup.findFirst({
                where: { name: dto.name, NOT: { id } },
            });
            if (existing) {
                throw new ConflictException('هذا الاسم مُسجَّل مسبقًا');
            }
        }

        // Update group basic info
        await this.prisma.customerGroup.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
            },
        });

        // Update customer assignments if provided
        if (dto.customerIds !== undefined) {
            // Remove all existing assignments
            await this.prisma.customer.updateMany({
                where: { groupId: id },
                data: { groupId: null },
            });

            // Assign new customers
            if (dto.customerIds.length > 0) {
                await this.prisma.customer.updateMany({
                    where: { id: { in: dto.customerIds } },
                    data: { groupId: id },
                });
            }
        }

        return this.findOne(id);
    }

    async remove(id: string) {
        await this.findOne(id);

        // Unlink all customers
        await this.prisma.customer.updateMany({
            where: { groupId: id },
            data: { groupId: null },
        });

        // Delete group
        return this.prisma.customerGroup.delete({
            where: { id },
        });
    }
}
