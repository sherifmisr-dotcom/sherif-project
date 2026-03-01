import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SourceType, Prisma } from '@prisma/client';

export interface CreateLedgerEntryDto {
    sourceType: SourceType;
    sourceId: string;
    debitAccount: string;
    creditAccount: string;
    amount: number | Prisma.Decimal;
    currency?: string;
    exchangeRate?: number | Prisma.Decimal;
    description?: string;
}

@Injectable()
export class LedgerService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a ledger entry (central accounting record)
     */
    async createEntry(data: CreateLedgerEntryDto) {
        return this.prisma.ledgerEntry.create({
            data: {
                sourceType: data.sourceType,
                sourceId: data.sourceId,
                debitAccount: data.debitAccount,
                creditAccount: data.creditAccount,
                amount: new Prisma.Decimal(data.amount.toString()),
                currency: data.currency || 'SAR',
                exchangeRate: data.exchangeRate
                    ? new Prisma.Decimal(data.exchangeRate.toString())
                    : new Prisma.Decimal(1),
                description: data.description,
            },
        });
    }

    /**
     * Get balance for an account
     */
    async getAccountBalance(account: string): Promise<number> {
        const debits = await this.prisma.ledgerEntry.aggregate({
            where: { debitAccount: account },
            _sum: { amount: true },
        });

        const credits = await this.prisma.ledgerEntry.aggregate({
            where: { creditAccount: account },
            _sum: { amount: true },
        });

        const debitSum = debits._sum.amount
            ? parseFloat(debits._sum.amount.toString())
            : 0;
        const creditSum = credits._sum.amount
            ? parseFloat(credits._sum.amount.toString())
            : 0;

        return debitSum - creditSum;
    }

    /**
     * Get ledger entries for an account
     */
    async getAccountEntries(
        account: string,
        options?: {
            from?: Date;
            to?: Date;
            limit?: number;
            offset?: number;
        },
    ) {
        const where: Prisma.LedgerEntryWhereInput = {
            OR: [{ debitAccount: account }, { creditAccount: account }],
        };

        if (options?.from || options?.to) {
            where.createdAt = {};
            if (options.from) where.createdAt.gte = options.from;
            if (options.to) where.createdAt.lte = options.to;
        }

        const [entries, total] = await Promise.all([
            this.prisma.ledgerEntry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: options?.limit,
                skip: options?.offset,
            }),
            this.prisma.ledgerEntry.count({ where }),
        ]);

        return { entries, total };
    }

    /**
     * Get entries by source
     */
    async getEntriesBySource(sourceType: SourceType, sourceId: string) {
        return this.prisma.ledgerEntry.findMany({
            where: {
                sourceType,
                sourceId,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
