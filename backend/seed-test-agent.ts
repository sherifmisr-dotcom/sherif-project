// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestAgentData() {
    console.log('🌱 إضافة بيانات تجريبية للوكلاء...\n');

    try {
        // حذف البيانات التجريبية القديمة
        console.log('🗑️  حذف البيانات التجريبية القديمة...');
        await prisma.$executeRaw`DELETE FROM "Voucher" WHERE id LIKE 'test-voucher-%'`;
        await prisma.$executeRaw`DELETE FROM "AdditionalFee" WHERE id LIKE 'test-fee-%'`;
        await prisma.$executeRaw`DELETE FROM "Trip" WHERE id LIKE 'test-trip-%'`;
        await prisma.$executeRaw`DELETE FROM "Vessel" WHERE id LIKE 'test-vessel-%'`;
        await prisma.$executeRaw`DELETE FROM "Agent" WHERE id LIKE 'test-agent-%'`;
        console.log('   ✅ تم الحذف\n');

        // إضافة البيانات
        console.log('📝 إضافة البيانات الجديدة...\n');

        // 1. الوكيل
        await prisma.$executeRaw`
      INSERT INTO "Agent" (id, name, "openingBalance", "openingSide", "isActive", "createdAt", "updatedAt")
      VALUES ('test-agent-001', 'شركة النقل البحري التجريبية', 5000, 'CREDIT', true, NOW(), NOW())
    `;
        console.log('✅ 1. وكيل: شركة النقل البحري التجريبية (رصيد افتتاحي: 5,000 ريال CREDIT)');

        // 2. العبارات
        await prisma.$executeRaw`
      INSERT INTO "Vessel" (id, "agentId", name, "createdAt", "updatedAt")
      VALUES 
        ('test-vessel-001', 'test-agent-001', 'عبارة الأمل', NOW(), NOW()),
        ('test-vessel-002', 'test-agent-001', 'عبارة النور', NOW(), NOW())
    `;
        console.log('✅ 2. عبارات: عبارة الأمل، عبارة النور');

        // 3. الرحلات
        await prisma.$executeRaw`
      INSERT INTO "Trip" (id, "agentId", "vesselId", date, quantity, "unitPrice", "totalAmount", "createdAt", "updatedAt")
      VALUES 
        ('test-trip-001', 'test-agent-001', 'test-vessel-001', '2025-12-10', 15, 200, 3000, NOW(), NOW()),
        ('test-trip-002', 'test-agent-001', 'test-vessel-002', '2025-12-20', 20, 200, 4000, NOW(), NOW()),
        ('test-trip-003', 'test-agent-001', 'test-vessel-001', '2026-01-05', 25, 200, 5000, NOW(), NOW()),
        ('test-trip-004', 'test-agent-001', 'test-vessel-002', '2026-01-15', 18, 200, 3600, NOW(), NOW()),
        ('test-trip-005', 'test-agent-001', 'test-vessel-001', '2026-01-25', 22, 200, 4400, NOW(), NOW())
    `;
        console.log('✅ 3. رحلات: 5 رحلات (2 في ديسمبر، 3 في يناير)');

        // 4. الرسوم الإضافية
        await prisma.$executeRaw`
      INSERT INTO "AdditionalFee" (id, "agentId", "vesselId", date, "feeType", quantity, amount, "createdAt", "updatedAt")
      VALUES 
        ('test-fee-001', 'test-agent-001', 'test-vessel-001', '2025-12-15', 'تأمين', 1, 1500, NOW(), NOW()),
        ('test-fee-002', 'test-agent-001', 'test-vessel-002', '2026-01-10', 'تأمين', 1, 2000, NOW(), NOW()),
        ('test-fee-003', 'test-agent-001', 'test-vessel-001', '2026-01-20', 'رسوم إضافية', 1, 1000, NOW(), NOW())
    `;
        console.log('✅ 4. رسوم إضافية: 3 رسوم (1 في ديسمبر، 2 في يناير)');

        // 5. سندات الصرف
        await prisma.$executeRaw`
      INSERT INTO "Voucher" (id, type, "partyType", "partyId", "partyName", date, amount, "paymentMethod", note, "createdAt", "updatedAt")
      VALUES 
        ('test-voucher-001', 'PAYMENT', 'AGENT', 'test-agent-001', 'شركة النقل البحري التجريبية', '2025-12-25', 6000, 'CASH', 'دفعة مقدمة ديسمبر', NOW(), NOW()),
        ('test-voucher-002', 'PAYMENT', 'AGENT', 'test-agent-001', 'شركة النقل البحري التجريبية', '2026-01-12', 5000, 'BANK_TRANSFER', 'دفعة يناير - الأسبوع الأول', NOW(), NOW()),
        ('test-voucher-003', 'PAYMENT', 'AGENT', 'test-agent-001', 'شركة النقل البحري التجريبية', '2026-01-28', 4000, 'CASH', 'دفعة يناير - نهاية الشهر', NOW(), NOW())
    `;
        console.log('✅ 5. سندات صرف: 3 سندات (1 في ديسمبر، 2 في يناير)\n');

        // عرض الملخص
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📊 ملخص البيانات التجريبية');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('💰 الرصيد الافتتاحي الأصلي: 5,000 ريال (CREDIT)');
        console.log('');
        console.log('📅 حركات قبل 1 يناير 2026:');
        console.log('   • رحلات: 3,000 + 4,000 = 7,000 ريال (دائن)');
        console.log('   • رسوم: 1,500 ريال (دائن)');
        console.log('   • سندات صرف: 6,000 ريال (مدين)');
        console.log('   • صافي الحركات: 7,000 + 1,500 - 6,000 = 2,500 ريال');
        console.log('');
        console.log('✅ رصيد أول المدة (1 يناير 2026): 5,000 + 2,500 = 7,500 ريال');
        console.log('');
        console.log('📅 حركات خلال يناير 2026:');
        console.log('   • رحلات: 5,000 + 3,600 + 4,400 = 13,000 ريال (دائن)');
        console.log('   • رسوم: 2,000 + 1,000 = 3,000 ريال (دائن)');
        console.log('   • سندات صرف: 5,000 + 4,000 = 9,000 ريال (مدين)');
        console.log('   • صافي الحركات: 13,000 + 3,000 - 9,000 = 7,000 ريال');
        console.log('');
        console.log('✅ رصيد آخر المدة (31 يناير 2026): 7,500 + 7,000 = 14,500 ريال');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('✨ تم إضافة البيانات التجريبية بنجاح!');
        console.log('');
        console.log('🔍 للتحقق:');
        console.log('   1. اذهب إلى تقارير الوكلاء');
        console.log('   2. اختر "شركة النقل البحري التجريبية"');
        console.log('   3. حدد الفترة من 2026-01-01 إلى 2026-01-31');
        console.log('   4. تحقق من أن رصيد أول المدة = 7,500 ريال');
        console.log('   5. تحقق من أن الرصيد النهائي = 14,500 ريال');
        console.log('');

    } catch (error) {
        console.error('❌ خطأ أثناء إضافة البيانات:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedTestAgentData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
