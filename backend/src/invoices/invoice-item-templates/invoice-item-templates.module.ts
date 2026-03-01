import { Module } from '@nestjs/common';
import { InvoiceItemTemplatesController } from './invoice-item-templates.controller';
import { InvoiceItemTemplatesService } from './invoice-item-templates.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [InvoiceItemTemplatesController],
    providers: [InvoiceItemTemplatesService],
    exports: [InvoiceItemTemplatesService],
})
export class InvoiceItemTemplatesModule { }
