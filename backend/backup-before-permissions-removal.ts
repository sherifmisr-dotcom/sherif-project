/**
 * Backup script to export user_permissions data before removal
 * Run this before applying the migration to remove the user_permissions table
 * 
 * Usage: npx ts-node backup-before-permissions-removal.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupUserPermissions() {
    try {
        console.log('Starting backup of user_permissions table...');

        // Fetch all user permissions
        const permissions = await prisma.$queryRaw`
            SELECT * FROM user_permissions ORDER BY user_id, screen;
        `;

        // Create backup directory if it doesn't exist
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `user_permissions_backup_${timestamp}.json`;
        const filepath = path.join(backupDir, filename);

        // Write to file
        fs.writeFileSync(filepath, JSON.stringify(permissions, null, 2));

        console.log(`✅ Backup completed successfully!`);
        console.log(`📁 File saved to: ${filepath}`);
        console.log(`📊 Total records backed up: ${(permissions as any[]).length}`);

        return filepath;
    } catch (error) {
        console.error('❌ Error during backup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the backup
backupUserPermissions()
    .then((filepath) => {
        console.log('\n✨ Backup process completed successfully!');
        console.log('You can now safely run the migration to remove the user_permissions table.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Backup process failed:', error);
        process.exit(1);
    });
