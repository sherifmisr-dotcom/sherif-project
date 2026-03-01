import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkViewDefinition() {
    try {
        console.log('🔍 Checking View Definition\n');

        // Get the actual view definition from database
        const viewDef = await prisma.$queryRaw<Array<any>>`
      SELECT pg_get_viewdef('customers_with_balance', true) as definition
    `;

        console.log('📋 Current View Definition:');
        console.log(viewDef[0]?.definition);

        console.log('\n\n🧪 Testing with manual query (using subqueries):');
        const manualResult = await prisma.$queryRaw<Array<any>>`
      SELECT 
        c.id,
        c.name,
        COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) as total_invoices,
        COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0) as total_payments,
        (
          COALESCE(c.opening_balance, 0) * CASE WHEN c.opening_side = 'debit' THEN 1 ELSE -1 END +
          COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) - 
          COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0)
        ) as current_balance
      FROM customers c
      ORDER BY current_balance DESC
      LIMIT 5
    `;

        console.log('\n👥 Top 5 Customers (Manual Query):');
        manualResult.forEach(c => {
            console.log(`   ${c.name}: Invoices=${c.total_invoices}, Payments=${c.total_payments}, Balance=${c.current_balance}`);
        });

        const totalDebtors = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT SUM(balance) as total FROM (
        SELECT 
          (
            COALESCE(c.opening_balance, 0) * CASE WHEN c.opening_side = 'debit' THEN 1 ELSE -1 END +
            COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id), 0) - 
            COALESCE((SELECT SUM(v.amount) FROM vouchers v WHERE v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id), 0)
          ) as balance
        FROM customers c
      ) as balances
      WHERE balance > 0
    `;

        console.log('\n📊 Total Debtors (Manual Query):', totalDebtors[0]?.total || 0);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkViewDefinition();
