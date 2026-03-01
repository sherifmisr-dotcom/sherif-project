import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.expenseCategory.findMany({
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ],
        });
    }

    async findOne(id: string) {
        return this.prisma.expenseCategory.findUnique({
            where: { id },
        });
    }

    async create(createDto: CreateExpenseCategoryDto) {
        return this.prisma.expenseCategory.create({
            data: createDto,
        });
    }

    async update(id: string, updateDto: UpdateExpenseCategoryDto) {
        const category = await this.prisma.expenseCategory.findUnique({ where: { id } });

        if (category?.isProtected) {
            throw new BadRequestException('لا يمكن تعديل التصنيفات المحمية');
        }

        return this.prisma.expenseCategory.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string) {
        const category = await this.prisma.expenseCategory.findUnique({ where: { id } });

        if (category?.isProtected) {
            throw new BadRequestException('لا يمكن حذف التصنيفات المحمية (رسوم جمركية، الوكلاء الملاحيين، رواتب وسلف)');
        }

        return this.prisma.expenseCategory.delete({
            where: { id },
        });
    }
}
