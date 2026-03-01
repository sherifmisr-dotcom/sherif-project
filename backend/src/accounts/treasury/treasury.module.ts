import { Module, forwardRef } from '@nestjs/common';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';
import { LedgerModule } from '../../ledger/ledger.module';
import { CarryForwardSchedulerService } from '../services/carry-forward-scheduler.service';
import { BanksModule } from '../banks/banks.module';
import { NotificationModule } from '../../notifications/notification.module';

@Module({
    imports: [LedgerModule, forwardRef(() => BanksModule), NotificationModule],
    controllers: [TreasuryController],
    providers: [TreasuryService, CarryForwardSchedulerService],
    exports: [TreasuryService, CarryForwardSchedulerService],
})
export class TreasuryModule { }
