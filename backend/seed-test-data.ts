// @ts-nocheck
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// Helper Functions
// ============================================

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomAmount(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

// ============================================
// Arabic Name Generators
// ============================================

const firstNames = [
    'محمد', 'أحمد', 'عبدالله', 'خالد', 'سعد', 'فهد', 'عبدالرحمن', 'سلطان', 'نايف', 'بندر',
    'عمر', 'يوسف', 'إبراهيم', 'علي', 'حسن', 'ياسر', 'طارق', 'ماجد', 'سامي', 'وليد',
    'تركي', 'مشعل', 'منصور', 'صالح', 'ناصر', 'مساعد', 'سعود', 'فيصل', 'حمد', 'زياد',
];

const lastNames = [
    'العتيبي', 'الشمري', 'الحربي', 'القحطاني', 'الدوسري', 'المطيري', 'الغامدي', 'الزهراني',
    'السبيعي', 'البلوي', 'العنزي', 'الرشيدي', 'الشهري', 'المالكي', 'الأحمدي', 'العمري',
    'السهلي', 'الجهني', 'البقمي', 'الثبيتي', 'الحازمي', 'الكلثمي', 'العسيري', 'الخثعمي',
    'الفيفي', 'الوادعي', 'النعمي', 'الشهراني', 'القرني', 'الزيادي',
];

const companyPrefixes = [
    'مؤسسة', 'شركة', 'مجموعة', 'مصنع', 'منشأة',
];

const companyActivities = [
    'التجارة العامة', 'الاستيراد والتصدير', 'المواد الغذائية', 'مواد البناء', 'الإلكترونيات',
    'الأدوية', 'الأثاث', 'قطع الغيار', 'المعدات الثقيلة', 'الملابس والأقمشة',
    'المواد الكيميائية', 'الأجهزة المنزلية', 'البلاستيك', 'الحديد والصلب', 'الخشب',
    'الأسمنت', 'الزجاج', 'الورق والتغليف', 'المنتجات الزراعية', 'الأعلاف',
];

const agentNames = [
    'شركة الخليج للملاحة', 'مؤسسة البحر للنقل البحري', 'شركة الميناء للخدمات اللوجستية',
    'مؤسسة الساحل للشحن', 'شركة النجم البحري', 'مؤسسة الأمواج للنقل',
    'شركة الرياح البحرية', 'مؤسسة المرفأ للشحن', 'شركة الشراع للنقل البحري',
    'مؤسسة الأفق البحرية', 'شركة السفينة للخدمات', 'مؤسسة القبطان للشحن',
    'شركة المرسى للنقل', 'مؤسسة الخليج الأزرق', 'شركة بوابة البحر',
];

const vesselNames = [
    'عبارة الأمل', 'عبارة النور', 'عبارة السلام', 'عبارة الخير', 'عبارة الفجر',
    'عبارة الرياح', 'عبارة النجم', 'عبارة القمر', 'عبارة البحر', 'عبارة الموج',
    'عبارة الساحل', 'عبارة المرفأ', 'عبارة الشروق', 'عبارة الغروب', 'عبارة المنار',
    'عبارة الأفق', 'عبارة الصباح', 'عبارة المساء', 'عبارة الربيع', 'عبارة الشمال',
    'عبارة الجنوب', 'عبارة الشرق', 'عبارة الغرب', 'عبارة الثريا', 'عبارة الدانة',
    'عبارة اللؤلؤة', 'عبارة الزمرد', 'عبارة الياقوت', 'عبارة المرجان', 'عبارة العنبر',
];

const departments = ['الإدارة', 'المحاسبة', 'التخليص الجمركي', 'الشحن', 'المبيعات', 'خدمة العملاء', 'تقنية المعلومات', 'الموارد البشرية'];

const feeTypes = ['تأمين', 'رسوم إضافية', 'رسوم تخزين', 'رسوم أرضيات', 'غرامات تأخير', 'رسوم فحص', 'رسوم تعقيم'];

const invoiceItemDescriptions = [
    'أجور تخليص', 'رسوم جمركية', 'رسوم نقل', 'رسوم فحص', 'رسوم تعقيم',
    'أجور تحميل', 'أجور تفريغ', 'رسوم تخزين', 'رسوم أرضيات', 'تأمين',
    'رسوم ميناء', 'أجور معاينة', 'رسوم وزن', 'رسوم ختم', 'أجور مناولة',
];

const cargoTypes = [
    'حاويات', 'بضائع عامة', 'مواد غذائية', 'مواد بناء', 'معدات ثقيلة',
    'سيارات', 'إلكترونيات', 'ملابس', 'أدوية', 'كيماويات',
    'أثاث', 'قطع غيار', 'حديد', 'خشب', 'أسمنت',
];

const cities = ['جدة', 'الرياض', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'تبوك', 'أبها', 'جازان', 'ينبع', 'الجبيل'];

// ============================================
// Main Seed Function
// ============================================

async function seedTestData() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🌱 بدء إنشاء البيانات التجريبية الواقعية...');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // ── Phase 0: Clean existing data (preserve settings, permissions, admin) ──
    console.log('🗑️  تنظيف البيانات القديمة...');

    await prisma.ledgerEntry.deleteMany();
    await prisma.bankTransaction.deleteMany();
    await prisma.treasuryTransaction.deleteMany();
    await prisma.payrollItem.deleteMany();
    await prisma.payrollRun.deleteMany();
    await prisma.customsFeeBatchItem.deleteMany();
    await prisma.customsFeeBatch.deleteMany();
    await prisma.voucher.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.additionalFee.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.vessel.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.bank.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.agentSettingLog.deleteMany();
    await prisma.carryForwardLog.deleteMany();

    // Reset treasury
    await prisma.treasury.upsert({
        where: { id: 'single_row' },
        update: { currentBalance: 0 },
        create: { id: 'single_row', currentBalance: 0 },
    });

    console.log('   ✅ تم التنظيف\n');

    // ── Phase 1: Get admin user ──
    const admin = await prisma.user.findFirst({ where: { isAdmin: true } });
    if (!admin) {
        console.error('❌ لم يتم العثور على مستخدم admin. الرجاء تشغيل prisma db seed أولاً.');
        return;
    }
    const adminId = admin.id;
    console.log(`👤 المستخدم: ${admin.username} (${adminId})\n`);

    // ── Phase 2: Get expense categories ──
    const expenseCategories = await prisma.expenseCategory.findMany();
    if (expenseCategories.length === 0) {
        console.error('❌ لم يتم العثور على فئات المصروفات. الرجاء تشغيل prisma db seed أولاً.');
        return;
    }
    console.log(`📂 فئات المصروفات: ${expenseCategories.length}\n`);

    // ── Phase 3: Banks & Bank Accounts ──
    console.log('🏦 إنشاء البنوك والحسابات البنكية...');

    const banksData = [
        { name: 'مصرف الراجحي' },
        { name: 'البنك الأهلي السعودي' },
        { name: 'بنك البلاد' },
    ];

    const banks = [];
    for (const b of banksData) {
        const bank = await prisma.bank.create({ data: { id: uuid(), name: b.name } });
        banks.push(bank);
    }

    const bankAccountsData = [
        { bankIdx: 0, accountNo: 'SA0380000000608010167519', openingBalance: 150000 },
        { bankIdx: 0, accountNo: 'SA0380000000608010198742', openingBalance: 85000 },
        { bankIdx: 1, accountNo: 'SA4410000001234567891011', openingBalance: 200000 },
        { bankIdx: 1, accountNo: 'SA4410000001234567891022', openingBalance: 50000 },
        { bankIdx: 2, accountNo: 'SA1515000000678901234567', openingBalance: 120000 },
    ];

    const bankAccounts = [];
    for (const ba of bankAccountsData) {
        const account = await prisma.bankAccount.create({
            data: {
                id: uuid(),
                bankId: banks[ba.bankIdx].id,
                accountNo: ba.accountNo,
                openingBalance: ba.openingBalance,
                currentBalance: ba.openingBalance,
                openingBalanceDate: new Date('2025-01-01'),
                isInitialBalance: true,
            },
        });
        bankAccounts.push(account);
    }
    console.log(`   ✅ ${banks.length} بنوك، ${bankAccounts.length} حسابات\n`);

    // ── Phase 4: Customers ──
    console.log('👥 إنشاء العملاء...');

    const customerTypes = ['EXPORT', 'IMPORT', 'TRANSIT', 'FREE'];
    const customers = [];

    for (let i = 0; i < 200; i++) {
        const isCompany = Math.random() > 0.4;
        const type = pick(customerTypes);
        let name: string;

        if (isCompany) {
            const prefix = pick(companyPrefixes);
            const firstName = pick(firstNames);
            const lastName = pick(lastNames);
            const activity = pick(companyActivities);
            name = `${prefix} ${firstName} ${lastName} لـ${activity}`;
        } else {
            name = `${pick(firstNames)} ${pick(firstNames)} ${pick(lastNames)}`;
        }

        // Make unique
        name = `${name} - ${i + 1}`;

        const hasOpening = Math.random() > 0.7;
        const customer = await prisma.customer.create({
            data: {
                id: uuid(),
                name,
                phone: `05${Math.floor(10000000 + Math.random() * 90000000)}`,
                email: Math.random() > 0.5 ? `customer${i + 1}@example.com` : null,
                address: Math.random() > 0.5 ? `${pick(cities)} - حي ${pick(lastNames)}` : null,
                type: type as any,
                openingBalance: hasOpening ? new Prisma.Decimal(randomAmount(1000, 50000)) : null,
                openingSide: hasOpening ? (Math.random() > 0.5 ? 'DEBIT' : 'CREDIT') : null,
            },
        });
        customers.push(customer);
    }
    console.log(`   ✅ ${customers.length} عميل\n`);

    // ── Phase 5: Agents, Vessels ──
    console.log('🚢 إنشاء الوكلاء والعبارات...');

    const agents = [];
    const vessels = [];

    for (let i = 0; i < 15; i++) {
        const hasOpening = Math.random() > 0.3;
        const agent = await prisma.agent.create({
            data: {
                id: uuid(),
                name: agentNames[i],
                openingBalance: hasOpening ? new Prisma.Decimal(randomAmount(5000, 100000)) : null,
                openingSide: hasOpening ? (Math.random() > 0.5 ? 'DEBIT' : 'CREDIT') : null,
            },
        });
        agents.push(agent);

        // 2 vessels per agent
        const vesselNamePool = pickN(vesselNames, 2);
        for (const vName of vesselNamePool) {
            const vessel = await prisma.vessel.create({
                data: {
                    id: uuid(),
                    agentId: agent.id,
                    name: `${vName} (${agentNames[i].split(' ').pop()})`,
                },
            });
            vessels.push(vessel);
        }
    }
    console.log(`   ✅ ${agents.length} وكيل، ${vessels.length} عبارة\n`);

    // ── Phase 6: Employees ──
    console.log('👷 إنشاء الموظفين...');

    const employees = [];
    for (let i = 0; i < 25; i++) {
        const employee = await prisma.employee.create({
            data: {
                id: uuid(),
                name: `${pick(firstNames)} ${pick(lastNames)}`,
                department: pick(departments),
                startDate: randomDate(new Date('2020-01-01'), new Date('2025-06-01')),
                baseSalary: new Prisma.Decimal(randomAmount(4000, 15000)),
                allowances: new Prisma.Decimal(randomAmount(500, 3000)),
                status: Math.random() > 0.1 ? 'ACTIVE' : 'INACTIVE',
            },
        });
        employees.push(employee);
    }
    console.log(`   ✅ ${employees.length} موظف\n`);

    // ── Phase 7: Invoices ──
    console.log('📄 إنشاء الفواتير...');

    const invoiceTypes = ['EXPORT', 'IMPORT', 'TRANSIT', 'FREE'];
    const typePrefixes = { EXPORT: 'EX', IMPORT: 'IM', TRANSIT: 'TR', FREE: 'FR' };
    const typeCounters: Record<string, Record<number, number>> = {};

    for (const t of invoiceTypes) {
        typeCounters[t] = { 2025: 0, 2026: 0 };
    }

    const invoices = [];
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2026-02-19');

    // Generate ~2500 invoices
    for (let i = 0; i < 2500; i++) {
        const type = pick(invoiceTypes);
        const date = randomDate(startDate, endDate);
        const year = date.getFullYear();
        const yearShort = year.toString().slice(-2);

        typeCounters[type][year] = (typeCounters[type][year] || 0) + 1;
        const seq = typeCounters[type][year];
        const code = `${typePrefixes[type]}${yearShort}-${seq}`;

        // Pick customer matching type (or any)
        const matchingCustomers = customers.filter(c => c.type === type);
        const customer = matchingCustomers.length > 0 ? pick(matchingCustomers) : pick(customers);

        const vatEnabled = type === 'IMPORT' && Math.random() > 0.6;
        const vatRate = vatEnabled ? 15 : 0;

        // Generate 2-4 items
        const itemCount = 2 + Math.floor(Math.random() * 3);
        const items = [];
        let subtotal = 0;

        for (let j = 0; j < itemCount; j++) {
            const unitPrice = randomAmount(100, 5000);
            const quantity = 1 + Math.floor(Math.random() * 10);
            const amount = Math.round(unitPrice * quantity * 100) / 100;
            subtotal += amount;
            items.push({
                id: uuid(),
                description: pick(invoiceItemDescriptions),
                unitPrice,
                quantity,
                amount,
                vatRate: vatEnabled ? 15 : 0,
                hasVat: vatEnabled,
                sortOrder: j,
            });
        }

        const vatAmount = vatEnabled ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
        const total = Math.round((subtotal + vatAmount) * 100) / 100;

        const invoice = await prisma.invoice.create({
            data: {
                id: uuid(),
                code,
                type: type as any,
                customerId: customer.id,
                customsNo: (type === 'IMPORT' || type === 'TRANSIT') ? `${year}${Math.floor(10000 + Math.random() * 90000)}` : null,
                date,
                total: new Prisma.Decimal(total),
                currency: 'SAR',
                exchangeRate: 1,
                notes: Math.random() > 0.7 ? `ملاحظة على الفاتورة ${code}` : null,
                driverName: Math.random() > 0.6 ? `${pick(firstNames)} ${pick(lastNames)}` : null,
                vehicleNo: Math.random() > 0.5 ? `${Math.floor(1000 + Math.random() * 9000)} ${pick(['أ ب ج', 'ر ه و', 'ح ن م', 'ص ع ق'])}` : null,
                cargoType: Math.random() > 0.4 ? pick(cargoTypes) : null,
                vatEnabled,
                vatRate: vatEnabled ? new Prisma.Decimal(vatRate) : null,
                vatAmount: vatEnabled ? new Prisma.Decimal(vatAmount) : null,
                items: {
                    create: items.map(item => ({
                        id: item.id,
                        description: item.description,
                        unitPrice: new Prisma.Decimal(item.unitPrice),
                        quantity: new Prisma.Decimal(item.quantity),
                        amount: new Prisma.Decimal(item.amount),
                        vatRate: new Prisma.Decimal(item.vatRate),
                        hasVat: item.hasVat,
                        sortOrder: item.sortOrder,
                    })),
                },
            },
        });
        invoices.push(invoice);

        // Create ledger entry for invoice
        await prisma.ledgerEntry.create({
            data: {
                id: uuid(),
                sourceType: 'INVOICE',
                sourceId: invoice.id,
                debitAccount: `customer:${customer.id}`,
                creditAccount: 'revenue:services',
                amount: new Prisma.Decimal(total),
                currency: 'SAR',
                exchangeRate: 1,
                description: `فاتورة ${code} - ${customer.name}`,
                createdAt: date,
            },
        });

        if (i % 500 === 0 && i > 0) console.log(`   ... ${i} فاتورة`);
    }
    console.log(`   ✅ ${invoices.length} فاتورة\n`);

    // ── Phase 8: Trips ──
    console.log('🚛 إنشاء رحلات الوكلاء...');

    const trips = [];
    for (let i = 0; i < 500; i++) {
        const agent = pick(agents);
        const agentVessels = vessels.filter(v => v.agentId === agent.id);
        const vessel = agentVessels.length > 0 ? pick(agentVessels) : null;
        const date = randomDate(startDate, endDate);

        const trucksWithFreight = 5 + Math.floor(Math.random() * 30);
        const trucksWithoutFreight = Math.floor(Math.random() * 5);
        const freightPerTruck = randomAmount(150, 500);
        const portFeesPerTruck = randomAmount(50, 200);
        const totalAmount = Math.round((trucksWithFreight * (freightPerTruck + portFeesPerTruck) + trucksWithoutFreight * portFeesPerTruck) * 100) / 100;

        const trip = await prisma.trip.create({
            data: {
                id: uuid(),
                agentId: agent.id,
                vesselId: vessel?.id || null,
                tripNumber: `R-${date.getFullYear().toString().slice(-2)}-${i + 1}`,
                date,
                costType: Math.random() > 0.3 ? 'DETAILED' : 'LUMP_SUM',
                trucksWithFreight,
                trucksWithoutFreight,
                freightPerTruck: new Prisma.Decimal(freightPerTruck),
                portFeesPerTruck: new Prisma.Decimal(portFeesPerTruck),
                quantity: trucksWithFreight + trucksWithoutFreight,
                unitPrice: new Prisma.Decimal(freightPerTruck),
                totalAmount: new Prisma.Decimal(totalAmount),
                notes: Math.random() > 0.7 ? `رحلة رقم ${i + 1}` : null,
            },
        });
        trips.push(trip);

        // Ledger entry
        await prisma.ledgerEntry.create({
            data: {
                id: uuid(),
                sourceType: 'TRIP',
                sourceId: trip.id,
                debitAccount: 'expense:agents',
                creditAccount: `agent:${agent.id}`,
                amount: new Prisma.Decimal(totalAmount),
                description: `رحلة ${trip.tripNumber} - ${agent.name}`,
                createdAt: date,
            },
        });
    }
    console.log(`   ✅ ${trips.length} رحلة\n`);

    // ── Phase 9: Additional Fees ──
    console.log('💰 إنشاء الرسوم الإضافية...');

    const additionalFees = [];
    for (let i = 0; i < 300; i++) {
        const agent = pick(agents);
        const agentVessels = vessels.filter(v => v.agentId === agent.id);
        const vessel = agentVessels.length > 0 ? pick(agentVessels) : null;
        const date = randomDate(startDate, endDate);
        const amount = randomAmount(500, 10000);

        const fee = await prisma.additionalFee.create({
            data: {
                id: uuid(),
                agentId: agent.id,
                vesselId: vessel?.id || null,
                date,
                feeType: pick(feeTypes),
                quantity: 1 + Math.floor(Math.random() * 3),
                amount: new Prisma.Decimal(amount),
                policyNo: Math.random() > 0.5 ? `POL-${Math.floor(10000 + Math.random() * 90000)}` : null,
                tripNumber: Math.random() > 0.5 ? `R-${date.getFullYear().toString().slice(-2)}-${Math.floor(Math.random() * 500)}` : null,
                details: Math.random() > 0.6 ? `تفاصيل الرسوم الإضافية #${i + 1}` : null,
            },
        });
        additionalFees.push(fee);

        // Ledger entry
        await prisma.ledgerEntry.create({
            data: {
                id: uuid(),
                sourceType: 'ADDITIONAL_FEE',
                sourceId: fee.id,
                debitAccount: 'expense:agents_fees',
                creditAccount: `agent:${agent.id}`,
                amount: new Prisma.Decimal(amount),
                description: `رسوم إضافية - ${agent.name}`,
                createdAt: date,
            },
        });
    }
    console.log(`   ✅ ${additionalFees.length} رسم إضافي\n`);

    // ── Phase 10: Receipt Vouchers (سندات قبض) ──
    console.log('📥 إنشاء سندات القبض...');

    let treasuryBalance = 0;
    const bankBalances: Record<string, number> = {};
    for (const ba of bankAccounts) {
        bankBalances[ba.id] = parseFloat(ba.openingBalance.toString());
    }

    // Sort dates for sequential processing
    const receiptDates: Date[] = [];
    for (let i = 0; i < 800; i++) {
        receiptDates.push(randomDate(startDate, endDate));
    }
    receiptDates.sort((a, b) => a.getTime() - b.getTime());

    const rcCounters: Record<number, number> = { 2025: 0, 2026: 0 };
    const receiptVouchers = [];

    for (let i = 0; i < 800; i++) {
        const date = receiptDates[i];
        const year = date.getFullYear();
        const yearShort = year.toString().slice(-2);
        rcCounters[year] = (rcCounters[year] || 0) + 1;
        const code = `RC${yearShort}-${rcCounters[year]}`;

        const isCash = Math.random() > 0.4;
        const method = isCash ? 'CASH' : 'BANK_TRANSFER';
        const bankAccount = !isCash ? pick(bankAccounts) : null;
        const amount = randomAmount(500, 30000);

        // Pick party
        const partyRoll = Math.random();
        let partyType: string, partyId: string | null, partyName: string;
        if (partyRoll < 0.7) {
            const customer = pick(customers);
            partyType = 'CUSTOMER';
            partyId = customer.id;
            partyName = customer.name;
        } else if (partyRoll < 0.85) {
            const agent = pick(agents);
            partyType = 'AGENT';
            partyId = agent.id;
            partyName = agent.name;
        } else {
            partyType = 'OTHER';
            partyId = null;
            partyName = `${pick(firstNames)} ${pick(lastNames)}`;
        }

        const voucher = await prisma.voucher.create({
            data: {
                id: uuid(),
                code,
                type: 'RECEIPT',
                partyType: partyType as any,
                partyId,
                partyName,
                method: method as any,
                bankAccountId: bankAccount?.id || null,
                referenceNumber: !isCash ? `REF-${Math.floor(100000 + Math.random() * 900000)}` : null,
                amount: new Prisma.Decimal(amount),
                note: Math.random() > 0.6 ? `سند قبض - ${partyName}` : null,
                date,
                createdBy: adminId,
            },
        });
        receiptVouchers.push(voucher);

        // Update balances and create transactions
        if (isCash) {
            treasuryBalance += amount;
            await prisma.treasuryTransaction.create({
                data: {
                    id: uuid(),
                    date,
                    type: 'IN',
                    amount: new Prisma.Decimal(amount),
                    note: `سند قبض ${code} - ${partyName}`,
                    balanceAfter: new Prisma.Decimal(treasuryBalance),
                    voucherId: voucher.id,
                    createdBy: adminId,
                },
            });
        } else {
            bankBalances[bankAccount!.id] += amount;
            await prisma.bankTransaction.create({
                data: {
                    id: uuid(),
                    date,
                    type: 'IN',
                    amount: new Prisma.Decimal(amount),
                    description: `سند قبض ${code} - ${partyName}`,
                    balanceAfter: new Prisma.Decimal(bankBalances[bankAccount!.id]),
                    bankAccountId: bankAccount!.id,
                    voucherId: voucher.id,
                    createdBy: adminId,
                },
            });
        }

        // Ledger entry
        await prisma.ledgerEntry.create({
            data: {
                id: uuid(),
                sourceType: 'VOUCHER',
                sourceId: voucher.id,
                debitAccount: isCash ? 'treasury' : `bank:${bankAccount!.id}`,
                creditAccount: `${partyType.toLowerCase()}:${partyId || 'other'}`,
                amount: new Prisma.Decimal(amount),
                description: `سند قبض ${code}`,
                createdAt: date,
            },
        });

        if (i % 200 === 0 && i > 0) console.log(`   ... ${i} سند قبض`);
    }
    console.log(`   ✅ ${receiptVouchers.length} سند قبض\n`);

    // ── Phase 11: Payment Vouchers (سندات صرف) ──
    console.log('📤 إنشاء سندات الصرف...');

    const paymentDates: Date[] = [];
    for (let i = 0; i < 600; i++) {
        paymentDates.push(randomDate(startDate, endDate));
    }
    paymentDates.sort((a, b) => a.getTime() - b.getTime());

    const pyCounters: Record<number, number> = { 2025: 0, 2026: 0 };
    const paymentVouchers = [];

    for (let i = 0; i < 600; i++) {
        const date = paymentDates[i];
        const year = date.getFullYear();
        const yearShort = year.toString().slice(-2);
        pyCounters[year] = (pyCounters[year] || 0) + 1;
        const code = `PY${yearShort}-${pyCounters[year]}`;

        const isCash = Math.random() > 0.4;
        const method = isCash ? 'CASH' : 'BANK_TRANSFER';
        const bankAccount = !isCash ? pick(bankAccounts) : null;
        const amount = randomAmount(300, 20000);

        // Pick party
        const partyRoll = Math.random();
        let partyType: string, partyId: string | null, partyName: string, categoryId: string | null = null;
        if (partyRoll < 0.3) {
            const employee = pick(employees);
            partyType = 'EMPLOYEE';
            partyId = employee.id;
            partyName = employee.name;
            categoryId = expenseCategories.find(c => c.name === 'رواتب وسلف')?.id || null;
        } else if (partyRoll < 0.55) {
            const agent = pick(agents);
            partyType = 'AGENT';
            partyId = agent.id;
            partyName = agent.name;
            categoryId = expenseCategories.find(c => c.name === 'الوكلاء الملاحيين')?.id || null;
        } else if (partyRoll < 0.75) {
            const customer = pick(customers);
            partyType = 'CUSTOMER';
            partyId = customer.id;
            partyName = customer.name;
        } else {
            partyType = 'OTHER';
            partyId = null;
            partyName = `مصاريف ${pick(['إدارية', 'صيانة', 'كهرباء', 'إيجار', 'نثرية', 'مكتبية', 'نقل', 'ضيافة'])}`;
            categoryId = pick(expenseCategories.filter(c => !c.isProtected))?.id || null;
        }

        const voucher = await prisma.voucher.create({
            data: {
                id: uuid(),
                code,
                type: 'PAYMENT',
                partyType: partyType as any,
                partyId,
                partyName,
                method: method as any,
                bankAccountId: bankAccount?.id || null,
                referenceNumber: !isCash ? `REF-${Math.floor(100000 + Math.random() * 900000)}` : null,
                amount: new Prisma.Decimal(amount),
                note: Math.random() > 0.5 ? `سند صرف - ${partyName}` : null,
                date,
                categoryId,
                createdBy: adminId,
            },
        });
        paymentVouchers.push(voucher);

        // Update balances and create transactions
        if (isCash) {
            treasuryBalance -= amount;
            await prisma.treasuryTransaction.create({
                data: {
                    id: uuid(),
                    date,
                    type: 'OUT',
                    amount: new Prisma.Decimal(amount),
                    note: `سند صرف ${code} - ${partyName}`,
                    balanceAfter: new Prisma.Decimal(treasuryBalance),
                    voucherId: voucher.id,
                    createdBy: adminId,
                },
            });
        } else {
            bankBalances[bankAccount!.id] -= amount;
            await prisma.bankTransaction.create({
                data: {
                    id: uuid(),
                    date,
                    type: 'OUT',
                    amount: new Prisma.Decimal(amount),
                    description: `سند صرف ${code} - ${partyName}`,
                    balanceAfter: new Prisma.Decimal(bankBalances[bankAccount!.id]),
                    bankAccountId: bankAccount!.id,
                    voucherId: voucher.id,
                    createdBy: adminId,
                },
            });
        }

        // Ledger entry
        await prisma.ledgerEntry.create({
            data: {
                id: uuid(),
                sourceType: 'VOUCHER',
                sourceId: voucher.id,
                debitAccount: `${partyType.toLowerCase()}:${partyId || 'other'}`,
                creditAccount: isCash ? 'treasury' : `bank:${bankAccount!.id}`,
                amount: new Prisma.Decimal(amount),
                description: `سند صرف ${code}`,
                createdAt: date,
            },
        });

        if (i % 200 === 0 && i > 0) console.log(`   ... ${i} سند صرف`);
    }
    console.log(`   ✅ ${paymentVouchers.length} سند صرف\n`);

    // ── Phase 12: Internal Transfers ──
    console.log('🔄 إنشاء التحويلات الداخلية...');

    const transferDates: Date[] = [];
    for (let i = 0; i < 50; i++) {
        transferDates.push(randomDate(startDate, endDate));
    }
    transferDates.sort((a, b) => a.getTime() - b.getTime());

    const trCounters: Record<number, number> = { 2025: 0, 2026: 0 };
    const transfers = [];

    for (let i = 0; i < 50; i++) {
        const date = transferDates[i];
        const year = date.getFullYear();
        const yearShort = year.toString().slice(-2);
        trCounters[year] = (trCounters[year] || 0) + 1;
        const code = `TR-${yearShort}-${trCounters[year].toString().padStart(4, '0')}`;

        const amount = randomAmount(5000, 50000);

        // Different transfer types
        const roll = Math.random();
        let sourceType: string, sourceAccountId: string | null = null;
        let destType: string, destAccountId: string | null = null;
        let sourceAccountName = 'الخزنة', destAccountName = 'الخزنة';

        if (roll < 0.4) {
            // Treasury → Bank
            sourceType = 'TREASURY';
            const ba = pick(bankAccounts);
            destType = 'BANK';
            destAccountId = ba.id;
            destAccountName = `${banks.find(b => b.id === ba.bankId)?.name} - ${ba.accountNo}`;
            treasuryBalance -= amount;
            bankBalances[ba.id] += amount;
        } else if (roll < 0.8) {
            // Bank → Treasury
            const ba = pick(bankAccounts);
            sourceType = 'BANK';
            sourceAccountId = ba.id;
            sourceAccountName = `${banks.find(b => b.id === ba.bankId)?.name} - ${ba.accountNo}`;
            destType = 'TREASURY';
            bankBalances[ba.id] -= amount;
            treasuryBalance += amount;
        } else {
            // Bank → Bank
            const sourceBa = pick(bankAccounts);
            const destBa = pick(bankAccounts.filter(b => b.id !== sourceBa.id));
            sourceType = 'BANK';
            sourceAccountId = sourceBa.id;
            sourceAccountName = `${banks.find(b => b.id === sourceBa.bankId)?.name} - ${sourceBa.accountNo}`;
            destType = 'BANK';
            destAccountId = destBa.id;
            destAccountName = `${banks.find(b => b.id === destBa.bankId)?.name} - ${destBa.accountNo}`;
            bankBalances[sourceBa.id] -= amount;
            bankBalances[destBa.id] += amount;
        }

        const voucher = await prisma.voucher.create({
            data: {
                id: uuid(),
                code,
                type: 'INTERNAL_TRANSFER',
                partyType: 'OTHER',
                partyName: `تحويل من ${sourceAccountName} إلى ${destAccountName}`,
                method: 'CASH',
                amount: new Prisma.Decimal(amount),
                date,
                note: Math.random() > 0.5 ? `تحويل داخلي #${i + 1}` : null,
                sourceType,
                sourceAccountId,
                destType,
                destAccountId,
                createdBy: adminId,
            },
        });
        transfers.push(voucher);

        // Treasury transactions
        if (sourceType === 'TREASURY') {
            await prisma.treasuryTransaction.create({
                data: {
                    id: uuid(),
                    date,
                    type: 'OUT',
                    amount: new Prisma.Decimal(amount),
                    note: `إيداع بنكي من الخزنة - ${code}`,
                    balanceAfter: new Prisma.Decimal(treasuryBalance),
                    voucherId: voucher.id,
                    createdBy: adminId,
                },
            });
        }
        if (destType === 'TREASURY') {
            await prisma.treasuryTransaction.create({
                data: {
                    id: uuid(),
                    date,
                    type: 'IN',
                    amount: new Prisma.Decimal(amount),
                    note: `سحب من البنك للخزنة - ${code}`,
                    balanceAfter: new Prisma.Decimal(treasuryBalance),
                    voucherId: voucher.id,
                    createdBy: adminId,
                },
            });
        }

        // Bank transactions
        if (sourceType === 'BANK') {
            await prisma.bankTransaction.create({
                data: {
                    id: uuid(),
                    date,
                    type: 'OUT',
                    amount: new Prisma.Decimal(amount),
                    description: `تحويل داخلي إلى ${destAccountName} - ${code}`,
                    balanceAfter: new Prisma.Decimal(bankBalances[sourceAccountId!]),
                    bankAccountId: sourceAccountId!,
                    voucherId: voucher.id,
                    createdBy: adminId,
                },
            });
        }
        if (destType === 'BANK') {
            await prisma.bankTransaction.create({
                data: {
                    id: uuid(),
                    date,
                    type: 'IN',
                    amount: new Prisma.Decimal(amount),
                    description: `تحويل داخلي من ${sourceAccountName} - ${code}`,
                    balanceAfter: new Prisma.Decimal(bankBalances[destAccountId!]),
                    bankAccountId: destAccountId!,
                    voucherId: voucher.id,
                    createdBy: adminId,
                },
            });
        }

        // Ledger entry
        await prisma.ledgerEntry.create({
            data: {
                id: uuid(),
                sourceType: 'VOUCHER',
                sourceId: voucher.id,
                debitAccount: destType === 'TREASURY' ? 'treasury' : `bank:${destAccountId}`,
                creditAccount: sourceType === 'TREASURY' ? 'treasury' : `bank:${sourceAccountId}`,
                amount: new Prisma.Decimal(amount),
                description: `تحويل داخلي ${code}`,
                createdAt: date,
            },
        });
    }
    console.log(`   ✅ ${transfers.length} تحويل داخلي\n`);

    // ── Phase 13: Update final balances ──
    console.log('💳 تحديث الأرصدة النهائية...');

    await prisma.treasury.update({
        where: { id: 'single_row' },
        data: { currentBalance: new Prisma.Decimal(treasuryBalance) },
    });

    for (const ba of bankAccounts) {
        await prisma.bankAccount.update({
            where: { id: ba.id },
            data: { currentBalance: new Prisma.Decimal(bankBalances[ba.id]) },
        });
    }
    console.log(`   ✅ رصيد الخزنة: ${treasuryBalance.toLocaleString()} ريال`);
    for (const ba of bankAccounts) {
        console.log(`   ✅ ${ba.accountNo}: ${bankBalances[ba.id].toLocaleString()} ريال`);
    }
    console.log();

    // ── Summary ──
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 ملخص البيانات التجريبية');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   👥 العملاء: ${customers.length}`);
    console.log(`   📄 الفواتير: ${invoices.length}`);
    console.log(`   🚢 الوكلاء: ${agents.length}`);
    console.log(`   ⛵ العبارات: ${vessels.length}`);
    console.log(`   🚛 الرحلات: ${trips.length}`);
    console.log(`   💰 الرسوم الإضافية: ${additionalFees.length}`);
    console.log(`   👷 الموظفون: ${employees.length}`);
    console.log(`   🏦 البنوك: ${banks.length}`);
    console.log(`   💳 الحسابات البنكية: ${bankAccounts.length}`);
    console.log(`   📥 سندات القبض: ${receiptVouchers.length}`);
    console.log(`   📤 سندات الصرف: ${paymentVouchers.length}`);
    console.log(`   🔄 التحويلات الداخلية: ${transfers.length}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n✨ تم إنشاء البيانات التجريبية بنجاح!');
    console.log('📦 يمكنك الآن إنشاء نسخة احتياطية من خلال الإعدادات في التطبيق.\n');
}

seedTestData()
    .catch((e) => {
        console.error('❌ خطأ:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
