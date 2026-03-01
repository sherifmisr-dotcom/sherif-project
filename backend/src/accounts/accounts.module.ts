import { Module } from '@nestjs/common';
import { TreasuryModule } from './treasury/treasury.module';
import { BanksModule } from './banks/banks.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { PayrollModule } from './payroll/payroll.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';

@Module({
    imports: [TreasuryModule, BanksModule, VouchersModule, PayrollModule, ExpenseCategoriesModule],
    exports: [TreasuryModule, BanksModule, VouchersModule, PayrollModule, ExpenseCategoriesModule],
})
export class AccountsModule { }
