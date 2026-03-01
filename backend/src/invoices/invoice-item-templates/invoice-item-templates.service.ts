import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceItemTemplateDto, UpdateInvoiceItemTemplateDto } from './dto/invoice-item-template.dto';

@Injectable()
export class InvoiceItemTemplatesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.invoiceItemTemplate.findMany({
            where: { isActive: true },
            orderBy: [
                { sortOrder: 'asc' },
                { description: 'asc' }
            ],
        });
    }

    async search(query: string) {
        return this.prisma.invoiceItemTemplate.findMany({
            where: {
                isActive: true,
                description: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            orderBy: [
                { sortOrder: 'asc' },
                { description: 'asc' }
            ],
            take: 10,
        });
    }

    async create(createDto: CreateInvoiceItemTemplateDto) {
        return this.prisma.invoiceItemTemplate.create({
            data: createDto,
        });
    }

    async update(id: string, updateDto: UpdateInvoiceItemTemplateDto) {
        const template = await this.prisma.invoiceItemTemplate.findUnique({ where: { id } });

        if (template?.isProtected && updateDto.description) {
            throw new BadRequestException('لا يمكن تعديل وصف البنود المحمية');
        }

        return this.prisma.invoiceItemTemplate.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string) {
        const template = await this.prisma.invoiceItemTemplate.findUnique({ where: { id } });

        if (template?.isProtected) {
            throw new BadRequestException('لا يمكن حذف البنود المحمية (أجور تخليص، رسوم جمركية)');
        }

        return this.prisma.invoiceItemTemplate.delete({
            where: { id },
        });
    }
}
