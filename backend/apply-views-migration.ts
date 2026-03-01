import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyViewsMigration() {
    try {
        console.log('📝 Reading migration file...');
        const sqlFile = fs.readFileSync(
            path.join(__dirname, 'apply_views_migration.sql'),
            'utf-8'
        );

        // Split by semicolon and filter out comments and empty lines
        const statements = sqlFile
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt =>
                stmt &&
                !stmt.startsWith('--') &&
                !stmt.startsWith('\\c') &&
                !stmt.startsWith('COMMENT')
            );

        console.log(`🔄 Applying ${statements.length} SQL statements...`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement) {
                console.log(`   [${i + 1}/${statements.length}] Executing...`);
                await prisma.$executeRawUnsafe(statement);
            }
        }

        console.log('✅ Views migration applied successfully!');
        console.log('📊 The following views have been updated:');
        console.log('   - customers_with_balance');
        console.log('   - agents_with_balance');
        console.log('');
        console.log('🎯 Debtors and Creditors balances should now be calculated correctly!');
    } catch (error) {
        console.error('❌ Error applying migration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

applyViewsMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
