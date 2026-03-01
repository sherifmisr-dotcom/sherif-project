import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Activity {
    id: string;
    type: 'invoice' | 'voucher' | 'trip' | 'fee' | 'customer';
    description: string;
    date: Date;
    link: string;
}

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getRecentActivities(): Promise<Activity[]> {
        try {
            const activities: Activity[] = [];

            // Get recent invoices (last 5)
            const invoices = await this.prisma.invoice.findMany({
                include: { customer: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            });

            invoices.forEach((invoice) => {
                const typeMap: Record<string, string> = {
                    EXPORT: 'صادر',
                    IMPORT: 'استيراد',
                    TRANSIT: 'ترانزيت',
                    FREE: 'حر',
                };
                activities.push({
                    id: invoice.id,
                    type: 'invoice',
                    description: `إصدار فاتورة ${typeMap[invoice.type] || invoice.type} للعميل ${invoice.customer?.name || 'عميل محذوف'}`,
                    date: invoice.createdAt,
                    link: `/invoices/${invoice.type.toLowerCase()}`,
                });
            });

            // Get recent vouchers (last 5) with party info
            const vouchers = await this.prisma.voucher.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
            });

            for (const voucher of vouchers) {
                let partyName = '';
                let partyLabel = '';
                try {
                    if (voucher.partyType === 'CUSTOMER' && voucher.partyId) {
                        const customer = await this.prisma.customer.findUnique({
                            where: { id: voucher.partyId },
                        });
                        partyName = customer?.name || 'عميل محذوف';
                        partyLabel = 'للعميل';
                    } else if (voucher.partyType === 'AGENT' && voucher.partyId) {
                        const agent = await this.prisma.agent.findUnique({
                            where: { id: voucher.partyId },
                        });
                        partyName = agent?.name || 'وكيل محذوف';
                        partyLabel = 'للوكيل';
                    } else if (voucher.partyType === 'OTHER') {
                        partyName = voucher.partyName || 'عملية مالية';
                        partyLabel = '';
                    } else {
                        partyName = voucher.partyName || 'عملية مالية';
                        partyLabel = '';
                    }
                } catch (error) {
                    partyName = voucher.partyName || 'عملية مالية';
                    partyLabel = '';
                }

                const typeText = voucher.type === 'RECEIPT' ? 'سند قبض' : 'سند صرف';
                const desc = partyLabel
                    ? `${typeText} ${partyLabel} ${partyName}`
                    : `${typeText} - ${partyName}`;

                activities.push({
                    id: voucher.id,
                    type: 'voucher',
                    description: desc,
                    date: voucher.createdAt,
                    link: `/accounts?tab=vouchers&type=${voucher.type.toLowerCase()}`,
                });
            }

            // Get recent trips (last 5)
            const trips = await this.prisma.trip.findMany({
                include: { agent: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            });

            trips.forEach((trip) => {
                activities.push({
                    id: trip.id,
                    type: 'trip',
                    description: `تسجيل رحلة للوكيل ${trip.agent?.name || 'وكيل محذوف'}`,
                    date: trip.createdAt,
                    link: '/agents/trips',
                });
            });

            // Get recent customers added (last 3)
            const customers = await this.prisma.customer.findMany({
                orderBy: { createdAt: 'desc' },
                take: 3,
            });

            customers.forEach((customer) => {
                activities.push({
                    id: customer.id,
                    type: 'customer',
                    description: `إضافة عميل جديد: ${customer.name}`,
                    date: customer.createdAt,
                    link: '/customers',
                });
            });

            // Sort all activities by date and return top 12
            return activities
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, 12);
        } catch (error) {
            console.error('Error fetching recent activities:', error);
            return [];
        }
    }
}

