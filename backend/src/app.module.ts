import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AgentsModule } from './agents/agents.module';
import { AccountsModule } from './accounts/accounts.module';
import { LedgerModule } from './ledger/ledger.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { BackupModule } from './backup/backup.module';
import { PdfModule } from './pdf/pdf.module';
import { SystemModule } from './system/system.module';
import { NotificationModule } from './notifications/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomsFeesModule } from './customs-fees/customs-fees.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CustomerGroupsModule } from './customer-groups/customer-groups.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        ThrottlerModule.forRoot([{
            ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
            limit: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
        }]),
        PrismaModule,
        AuthModule,
        PermissionsModule,
        CustomersModule,
        InvoicesModule,
        AgentsModule,
        AccountsModule,
        LedgerModule,
        ReportsModule,
        SettingsModule,
        UsersModule,
        BackupModule,
        PdfModule,
        SystemModule,
        NotificationModule,
        DashboardModule,
        CustomsFeesModule,
        CustomerGroupsModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
