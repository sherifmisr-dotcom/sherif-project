import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { LedgerModule } from '../ledger/ledger.module';
import { InvoiceItemTemplatesModule } from './invoice-item-templates/invoice-item-templates.module';

@Module({
    imports: [LedgerModule, InvoiceItemTemplatesModule],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService],
})
export class InvoicesModule { }
