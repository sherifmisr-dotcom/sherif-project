import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    async onModuleInit() {
        await this.$connect();
        await this.ensureDatabaseViews();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Ensures required database views exist.
     * This runs on every startup so that restoring old backups
     * (which may drop these views) doesn't break the app.
     */
    private async ensureDatabaseViews() {
        try {
            // customers_with_balance view
            await this.$executeRawUnsafe(`
                CREATE OR REPLACE VIEW customers_with_balance AS
                SELECT 
                    c.id,
                    c.name,
                    c.phone,
                    c.email,
                    c.address,
                    c.type,
                    c.opening_balance,
                    c.opening_side,
                    c.is_active,
                    c.created_at,
                    c.updated_at,
                    COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) as total_invoices,
                    COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) as total_receipts,
                    COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) as total_payment_vouchers,
                    (
                        COALESCE(c.opening_balance, 0) * CASE WHEN c.opening_side = 'DEBIT' THEN 1 ELSE -1 END +
                        COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) +
                        COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) - 
                        COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0)
                    ) as current_balance
                FROM customers c
            `);

            // agents_with_balance view
            await this.$executeRawUnsafe(`
                CREATE OR REPLACE VIEW agents_with_balance AS
                SELECT 
                    a.id,
                    a.name,
                    a.is_active,
                    a.created_at,
                    a.updated_at,
                    COALESCE(a.opening_balance, 0) as opening_balance,
                    a.opening_side,
                    COALESCE((SELECT SUM(t.total_amount) FROM trips t WHERE t.agent_id = a.id), 0) as total_trips,
                    COALESCE((SELECT SUM(af.amount * COALESCE(af.quantity, 1)) FROM additional_fees af WHERE af.agent_id = a.id), 0) as total_additional_fees,
                    COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'AGENT' AND v.party_id = a.id), 0) as total_payments,
                    (
                        COALESCE(a.opening_balance, 0) * CASE WHEN a.opening_side = 'CREDIT' THEN 1 ELSE -1 END +
                        COALESCE((SELECT SUM(t.total_amount) FROM trips t WHERE t.agent_id = a.id), 0) +
                        COALESCE((SELECT SUM(af.amount * COALESCE(af.quantity, 1)) FROM additional_fees af WHERE af.agent_id = a.id), 0) -
                        COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'AGENT' AND v.party_id = a.id), 0)
                    ) as current_balance
                FROM agents a
            `);

            // Ensure indexes exist for performance
            await this.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_invoices_customer_active ON invoices(customer_id)`);
            await this.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_trips_agent_active ON trips(agent_id)`);
            await this.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_vouchers_party ON vouchers(party_type, party_id, type)`);

            this.logger.log('✅ Database views ensured successfully');
        } catch (error) {
            this.logger.warn(`⚠️ Could not ensure database views: ${error.message}`);
        }
    }
}
