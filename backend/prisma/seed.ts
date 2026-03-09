import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { permissionsSeedData } from './seeds/permissions.seed';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Create Super Admin (hidden emergency account)
    const superAdminPassword = await bcrypt.hash('SuperAdmin@2026', 10);

    const superAdmin = await prisma.user.upsert({
        where: { username: 'superadmin' },
        update: {
            isSuperAdmin: true,
            isAdmin: true,
            isActive: true,
        },
        create: {
            username: 'superadmin',
            passwordHash: superAdminPassword,
            isAdmin: true,
            isSuperAdmin: true,
            isActive: true,
        },
    });

    console.log('✅ Super Admin (emergency account) created:', superAdmin.username);
    console.log('   Username: superadmin');
    console.log('   Password: SuperAdmin@2026');
    console.log('   Super Admin: Yes (hidden from user list)');

    // Create default settings
    await prisma.companySetting.upsert({
        where: { id: 'single_row' },
        update: {},
        create: { id: 'single_row' },
    });

    await prisma.appSetting.upsert({
        where: { id: 'single_row' },
        update: {},
        create: { id: 'single_row' },
    });

    await prisma.printSetting.upsert({
        where: { id: 'single_row' },
        update: {},
        create: { id: 'single_row' },
    });

    await prisma.treasury.upsert({
        where: { id: 'single_row' },
        update: {},
        create: { id: 'single_row' },
    });

    console.log('✅ Default settings created');

    // Create expense categories with protection and sort order
    const expenseCategories = [
        // Protected categories (cannot be deleted)
        { name: 'رسوم جمركية', isProtected: true, sortOrder: 1 },
        { name: 'الوكلاء الملاحيين', isProtected: true, sortOrder: 2 },
        { name: 'رواتب وسلف', isProtected: true, sortOrder: 3 },
        // Non-protected default categories (can be deleted)
        { name: 'إيجار', isProtected: false, sortOrder: 10 },
        { name: 'كهرباء وماء', isProtected: false, sortOrder: 11 },
        { name: 'صيانة', isProtected: false, sortOrder: 12 },
        { name: 'مصاريف إدارية', isProtected: false, sortOrder: 13 },
        { name: 'مصاريف أخرى', isProtected: false, sortOrder: 14 },
    ];

    for (const category of expenseCategories) {
        await prisma.expenseCategory.upsert({
            where: { name: category.name },
            update: {
                isProtected: category.isProtected,
                sortOrder: category.sortOrder,
            },
            create: category,
        });
    }

    console.log('✅ Expense categories created');

    // Create default invoice item templates
    const invoiceItemTemplates = [
        { description: 'أجور تخليص', vatRate: 15.00, isProtected: true, sortOrder: 1, isActive: true },
        { description: 'رسوم جمركية', vatRate: 0, isProtected: true, sortOrder: 2, isActive: true },
    ];

    for (const template of invoiceItemTemplates) {
        await prisma.invoiceItemTemplate.upsert({
            where: { description: template.description },
            update: {
                isProtected: template.isProtected,
                sortOrder: template.sortOrder,
            },
            create: template,
        });
    }

    console.log('✅ Default invoice item templates created');

    // Seed permissions
    console.log('🔐 Seeding permissions...');

    console.log(`📝 Upserting ${permissionsSeedData.length} permissions...`);

    for (const permission of permissionsSeedData) {
        await prisma.permission.upsert({
            where: { code: permission.code },
            update: {
                screen: permission.screen,
                subScreen: permission.subScreen,
                action: permission.action,
                nameAr: permission.nameAr,
                nameEn: permission.nameEn,
                description: permission.description,
                category: permission.category,
                isViewPermission: permission.isViewPermission,
            },
            create: {
                code: permission.code,
                screen: permission.screen,
                subScreen: permission.subScreen,
                action: permission.action,
                nameAr: permission.nameAr,
                nameEn: permission.nameEn,
                description: permission.description,
                category: permission.category,
                isViewPermission: permission.isViewPermission,
            },
        });
    }

    console.log('✅ Permissions seeded successfully!');
    console.log(`   Total permissions: ${permissionsSeedData.length}`);

    // Summary by screen
    const summary = permissionsSeedData.reduce((acc, perm) => {
        acc[perm.screen] = (acc[perm.screen] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Permissions by screen:');
    Object.entries(summary).forEach(([screen, count]) => {
        console.log(`   - ${screen}: ${count} permissions`);
    });

    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
