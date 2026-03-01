import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugBalances() {
    try {
        console.log('🔍 Debugging Debtors Balance Calculation\n');

        // Check total invoices
        const invoicesTotal = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(total), 0) as total
      FROM invoices
    `;
        console.log('📄 Total Invoices:', invoicesTotal[0]?.total || 0);

        // Check total receipt vouchers for customers
        const receiptsTotal = await prisma.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM vouchers
      WHERE type = 'RECEIPT' AND party_type = 'CUSTOMER'
    `;
        console.log('💰 Total Receipt Vouchers (CUSTOMER):', receiptsTotal[0]?.total || 0);

        // Check what the view returns
        const viewResult = await prisma.$queryRaw<Array<{ total_debtors: number }>>`
      SELECT COALESCE(SUM(current_balance), 0) as total_debtors
      FROM customers_with_balance
      WHERE current_balance > 0
    `;
        console.log('📊 View Result (Debtors):', viewResult[0]?.total_debtors || 0);

        // Check individual customer balances
        const customers = await prisma.$queryRaw<Array<any>>`
      SELECT id, name, total_invoices, total_payments, current_balance
      FROM customers_with_balance
      ORDER BY current_balance DESC
      LIMIT 5
    `;
        console.log('\n👥 Top 5 Customers by Balance:');
        customers.forEach(c => {
            console.log(`   ${c.name}: Invoices=${c.total_invoices}, Payments=${c.total_payments}, Balance=${c.current_balance}`);
        });

        // Check for duplicate counting
        const duplicateCheck = await prisma.$queryRaw<Array<any>>`
      SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT i.id) as invoice_count,
        COUNT(DISTINCT v.id) as voucher_count,
        COUNT(*) as total_rows
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id
      LEFT JOIN vouchers v ON v.party_type = 'CUSTOMER' AND v.party_id = c.id AND v.type = 'RECEIPT'
      GROUP BY c.id, c.name
      HAVING COUNT(*) > 10
      LIMIT 5
    `;
        console.log('\n⚠️  Customers with many joined rows (potential duplicates):');
        duplicateCheck.forEach(c => {
            console.log(`   ${c.name}: ${c.invoice_count} invoices, ${c.voucher_count} vouchers, ${c.total_rows} total rows`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugBalances();
