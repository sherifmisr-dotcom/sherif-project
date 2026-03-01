import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFixedInvoiceStats() {
    try {
        console.log('🔍 Testing FIXED Invoice Statistics...\n');

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const fromStr = firstDay.toISOString().split('T')[0];
        const toStr = lastDay.toISOString().split('T')[0];

        console.log('Current month filter:');
        console.log(`   From: ${fromStr} (${firstDay.toISOString()})`);
        console.log(`   To:   ${toStr} (${lastDay.toISOString()})`);
        console.log('');

        // Test with fixed date parsing
        const where = {
            date: {
                gte: new Date(fromStr + 'T00:00:00.000Z'),
                lte: new Date(toStr + 'T23:59:59.999Z'),
            },
        };

        console.log('Query where clause:');
        console.log(`   gte: ${where.date.gte.toISOString()}`);
        console.log(`   lte: ${where.date.lte.toISOString()}`);
        console.log('');

        const [count, totals] = await Promise.all([
            prisma.invoice.count({ where }),
            prisma.invoice.aggregate({
                where,
                _sum: {
                    total: true,
                },
            }),
        ]);

        console.log('✅ Results:');
        console.log(`   Count: ${count}`);
        console.log(`   Total Amount: ${totals._sum.total ? parseFloat(totals._sum.total.toString()).toFixed(2) : 0} SAR`);
        console.log('');

        if (count > 0) {
            const invoices = await prisma.invoice.findMany({
                where,
                select: {
                    id: true,
                    date: true,
                    total: true,
                    type: true,
                },
            });

            console.log('   Invoices found:');
            invoices.forEach((inv) => {
                console.log(`   - ${inv.type}: ${inv.total} SAR on ${inv.date.toISOString()}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

testFixedInvoiceStats()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
