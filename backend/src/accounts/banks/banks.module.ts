import { Module } from '@nestjs/common';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';
import { LedgerModule } from '../../ledger/ledger.module';
import { NotificationModule } from '../../notifications/notification.module';

@Module({
    imports: [LedgerModule, NotificationModule],
    controllers: [BanksController],
    providers: [BanksService],
    exports: [BanksService],
})
export class BanksModule { }
