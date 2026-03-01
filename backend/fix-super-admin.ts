import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Fixing Super Admin...\n');

    // Check current admin user
    const currentAdmin = await prisma.user.findUnique({
        where: { username: 'admin' },
        select: {
            id: true,
            username: true,
            isAdmin: true,
            isSuperAdmin: true,
            isActive: true,
        },
    });

    if (!currentAdmin) {
        console.log('❌ Admin user not found! Creating...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const newAdmin = await prisma.user.create({
            data: {
                username: 'admin',
                passwordHash: hashedPassword,
                isAdmin: true,
                isSuperAdmin: true,
                isActive: true,
            },
        });
        
        console.log('✅ Super Admin created successfully!');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   isSuperAdmin:', newAdmin.isSuperAdmin);
    } else {
        console.log('📋 Current admin status:');
        console.log('   Username:', currentAdmin.username);
        console.log('   isAdmin:', currentAdmin.isAdmin);
        console.log('   isSuperAdmin:', currentAdmin.isSuperAdmin);
        console.log('   isActive:', currentAdmin.isActive);
        
        if (!currentAdmin.isSuperAdmin) {
            console.log('\n⚠️  isSuperAdmin is FALSE! Fixing...');
            
            const updated = await prisma.user.update({
                where: { id: currentAdmin.id },
                data: {
                    isSuperAdmin: true,
                    isAdmin: true,
                    isActive: true,
                },
            });
            
            console.log('✅ Super Admin fixed!');
            console.log('   isSuperAdmin:', updated.isSuperAdmin);
        } else {
            console.log('\n✅ Super Admin is already configured correctly!');
        }
    }

    // Verify permissions count
    const permissionsCount = await prisma.permission.count();
    console.log(`\n📊 Total permissions in database: ${permissionsCount}`);
    
    if (permissionsCount === 0) {
        console.log('⚠️  No permissions found! Run: npm run seed');
    }

    console.log('\n🎉 Done!');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
