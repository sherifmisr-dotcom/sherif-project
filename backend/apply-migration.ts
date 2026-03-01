// Script to apply database views migration
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Applying database views migration...\n');

  try {
    // Create customers_with_balance view
    console.log('📊 Creating customers_with_balance view...');
    await prisma.$executeRawUnsafe(`
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
          COALESCE(SUM(i.total), 0) as total_invoices,
          COALESCE(SUM(CASE WHEN v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id THEN v.amount ELSE 0 END), 0) as total_payments,
          (
              COALESCE(c.opening_balance, 0) * CASE WHEN c.opening_side = 'DEBIT' THEN 1 ELSE -1 END +
              COALESCE(SUM(i.total), 0) - 
              COALESCE(SUM(CASE WHEN v.type = 'RECEIPT' AND v.party_type = 'CUSTOMER' AND v.party_id = c.id THEN v.amount ELSE 0 END), 0)
          ) as current_balance
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id
      LEFT JOIN vouchers v ON 1=1
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.phone, c.email, c.address, c.type, c.opening_balance, c.opening_side, c.is_active, c.created_at, c.updated_at
    `);
    console.log('✅ customers_with_balance view created successfully\n');

    // Create agents_with_balance view
    console.log('📊 Creating agents_with_balance view...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW agents_with_balance AS
      SELECT 
          a.id,
          a.name,
          a.opening_balance,
          a.opening_side,
          a.is_active,
          a.created_at,
          a.updated_at,
          COALESCE(SUM(t.total_amount), 0) as total_trips,
          COALESCE(SUM(CASE WHEN v.type = 'PAYMENT' AND v.party_type = 'AGENT' AND v.party_id = a.id THEN v.amount ELSE 0 END), 0) as total_payments,
          (
              COALESCE(SUM(t.total_amount), 0) - 
              COALESCE(SUM(CASE WHEN v.type = 'PAYMENT' AND v.party_type = 'AGENT' AND v.party_id = a.id THEN v.amount ELSE 0 END), 0)
          ) as current_balance
      FROM agents a
      LEFT JOIN trips t ON t.agent_id = a.id
      LEFT JOIN vouchers v ON 1=1
      WHERE a.deleted_at IS NULL
      GROUP BY a.id, a.name, a.opening_balance, a.opening_side, a.is_active, a.created_at, a.updated_at
    `);
    console.log('✅ agents_with_balance view created successfully\n');

    // Create indexes
    console.log('📑 Creating indexes for better performance...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_invoices_customer_active ON invoices(customer_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_trips_agent_active ON trips(agent_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_vouchers_party ON vouchers(party_type, party_id, type)
    `);
    console.log('✅ Indexes created successfully\n');

    console.log('🎉 Migration completed successfully!');
    console.log('\n📊 Testing the views...\n');

    // Test customers view
    const customersTest = await prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as total_debtors
      FROM customers_with_balance
      WHERE is_active = true
    `;
    console.log('✅ Customers view test:', customersTest);

    // Test agents view
    const agentsTest = await prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as total_creditors
      FROM agents_with_balance
      WHERE is_active = true
    `;
    console.log('✅ Agents view test:', agentsTest);

    console.log('\n✨ All done! You can now restart your backend server.');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
