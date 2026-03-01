import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyViewsUpdate() {
    try {
        console.log('🔄 Updating database views for correct balance calculations...\n');

        // Drop existing view first to avoid column rename issues
        console.log('🗑️  Dropping existing customers_with_balance view...');
        await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS customers_with_balance CASCADE`);
        console.log('✅ View dropped successfully\n');

        // Create customers_with_balance view with correct formula
        console.log('📊 Creating customers_with_balance view with corrected formula...');
        await prisma.$executeRawUnsafe(`
            CREATE VIEW customers_with_balance AS
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
                -- حساب إجمالي الفواتير (مدين)
                COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) as total_invoices,
                -- حساب إجمالي سندات القبض من العملاء (دائن)
                COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) as total_receipts,
                -- حساب إجمالي سندات الصرف للعملاء (مدين) - مبالغ مصروفة للعملاء
                COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) as total_payment_vouchers,
                -- حساب الرصيد الحالي
                -- المعادلة: الرصيد الافتتاحي + الفواتير + سندات الصرف للعملاء - سندات القبض من العملاء
                (
                    -- الرصيد الافتتاحي (مدين موجب، دائن سالب)
                    COALESCE(c.opening_balance, 0) * CASE WHEN c.opening_side = 'DEBIT' THEN 1 ELSE -1 END +
                    -- إجمالي الفواتير (مدين)
                    COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) +
                    -- إجمالي سندات الصرف للعملاء (مدين)
                    COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'PAYMENT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) - 
                    -- إجمالي سندات القبض من العملاء (دائن)
                    COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0)
                ) as current_balance
            FROM customers c
        `);
        console.log('✅ customers_with_balance view created successfully\n');

        // Test the view
        console.log('🔍 Testing updated view...');
        const result = await prisma.$queryRaw<Array<{ total_debtors: number }>>`
            SELECT 
                COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as total_debtors
            FROM customers_with_balance
            WHERE is_active = true
        `;

        console.log('✅ View is working correctly!');
        console.log(`📊 Total Debtors Balance: ${Number(result[0]?.total_debtors || 0).toFixed(2)} SAR\n`);

        console.log('🎉 Database views updated successfully!\n');
        console.log('📌 Changes Applied:');
        console.log('   ✓ Updated customers_with_balance view');
        console.log('   ✓ Added payment vouchers to debtors calculation');
        console.log('   ✓ Formula: Opening Balance + Invoices + Payment Vouchers - Receipt Vouchers\n');

    } catch (error) {
        console.error('❌ Error updating database views:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

applyViewsUpdate()
    .then(() => {
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
