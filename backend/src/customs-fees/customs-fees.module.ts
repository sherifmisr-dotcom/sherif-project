import { Module } from '@nestjs/common';
import { CustomsFeesService } from './customs-fees.service';
import { CustomsFeesController } from './customs-fees.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CustomsFeesController],
    providers: [CustomsFeesService],
    exports: [CustomsFeesService],
})
export class CustomsFeesModule { }
