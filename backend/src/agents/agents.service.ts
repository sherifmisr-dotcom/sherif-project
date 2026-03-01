import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import {
    CreateAgentDto,
    UpdateAgentDto,
    CreateTripDto,
    UpdateTripDto,
    CreateAdditionalFeeDto,
    UpdateAdditionalFeeDto,
    UpdateAgentSettingsDto,
    QueryDto,
} from './dto/agent.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AgentsService {
    constructor(
        private prisma: PrismaService,
        private ledger: LedgerService,
    ) { }

    // ============ AGENTS ============

    async createAgent(dto: CreateAgentDto) {
        const existing = await this.prisma.agent.findUnique({
            where: { name: dto.name },
        });

        // If agent exists and is not deleted, throw error
        if (existing && !existing.deletedAt) {
            throw new ConflictException('هذا الاسم مُسجَّل مسبقاً');
        }

        // If agent exists but was deleted, restore it
        if (existing && existing.deletedAt) {
            // Delete old vessels
            await this.prisma.vessel.deleteMany({
                where: { agentId: existing.id },
            });

            // Update the agent
            const data: any = {
                deletedAt: null,
                isActive: true,
            };

            if (dto.openingBalance !== undefined) {
                data.openingBalance = new Prisma.Decimal(dto.openingBalance);
                data.openingSide = dto.openingSide;
            }

            const agent = await this.prisma.agent.update({
                where: { id: existing.id },
                data,
            });

            // Create new vessels if provided
            if (dto.vessels && dto.vessels.length > 0) {
                await this.prisma.vessel.createMany({
                    data: dto.vessels.map((name) => ({
                        agentId: agent.id,
                        name,
                    })),
                });
            }

            return this.prisma.agent.findUnique({
                where: { id: agent.id },
                include: { vessels: true },
            });
        }

        // Create new agent
        const data: Prisma.AgentCreateInput = {
            name: dto.name,
        };

        if (dto.openingBalance !== undefined) {
            data.openingBalance = new Prisma.Decimal(dto.openingBalance);
            data.openingSide = dto.openingSide;
        }

        const agent = await this.prisma.agent.create({
            data,
        });

        // Create vessels if provided
        if (dto.vessels && dto.vessels.length > 0) {
            await this.prisma.vessel.createMany({
                data: dto.vessels.map((name) => ({
                    agentId: agent.id,
                    name,
                })),
            });
        }

        return this.prisma.agent.findUnique({
            where: { id: agent.id },
            include: { vessels: true },
        });
    }

    async findAllAgents(query: QueryDto) {
        const { q, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.AgentWhereInput = {
            deletedAt: null,
            isActive: true,
        };

        if (q) {
            where.name = { contains: q, mode: 'insensitive' };
        }

        const [agents, total] = await Promise.all([
            this.prisma.agent.findMany({
                where,
                skip,
                take: limit,
                include: {
                    vessels: true,
                    _count: {
                        select: {
                            trips: true,
                            additionalFees: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.agent.count({ where }),
        ]);

        return {
            data: agents,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOneAgent(id: string) {
        const agent = await this.prisma.agent.findUnique({
            where: { id },
            include: {
                vessels: true,
                _count: {
                    select: {
                        trips: true,
                        additionalFees: true,
                    },
                },
            },
        });

        if (!agent || agent.deletedAt) {
            throw new NotFoundException('الوكيل غير موجود');
        }

        // Calculate current balance
        const openingBalance = agent.openingBalance ? parseFloat(agent.openingBalance.toString()) : 0;
        const openingSide = agent.openingSide || 'DEBIT';
        const adjustedOpening = openingSide === 'CREDIT' ? openingBalance : -openingBalance;

        const [tripsAgg, feesAgg, paymentsAgg] = await Promise.all([
            this.prisma.trip.aggregate({
                where: { agentId: id },
                _sum: { totalAmount: true },
            }),
            this.prisma.additionalFee.aggregate({
                where: { agentId: id },
                _sum: { amount: true },
            }),
            this.prisma.voucher.aggregate({
                where: {
                    partyType: 'AGENT',
                    partyId: id,
                    type: 'PAYMENT',
                },
                _sum: { amount: true },
            }),
        ]);

        const totalTrips = tripsAgg._sum.totalAmount ? parseFloat(tripsAgg._sum.totalAmount.toString()) : 0;
        const totalFees = feesAgg._sum.amount ? parseFloat(feesAgg._sum.amount.toString()) : 0;
        const totalPayments = paymentsAgg._sum.amount ? parseFloat(paymentsAgg._sum.amount.toString()) : 0;

        const currentBalance = adjustedOpening + totalTrips + totalFees - totalPayments;

        return {
            ...agent,
            currentBalance,
        };
    }

    async updateAgent(id: string, dto: UpdateAgentDto) {
        await this.findOneAgent(id);

        const updateData: any = {};

        if (dto.name !== undefined) {
            updateData.name = dto.name;
        }

        if (dto.openingBalance !== undefined) {
            updateData.openingBalance = new Prisma.Decimal(dto.openingBalance);
        }

        if (dto.openingSide !== undefined) {
            updateData.openingSide = dto.openingSide;
        }

        const agent = await this.prisma.agent.update({
            where: { id },
            data: updateData,
        });

        // Update vessels if provided
        // Update vessels if provided
        if (dto.vessels) {
            // Get current vessels
            const currentVessels = await this.prisma.vessel.findMany({
                where: { agentId: id },
            });

            const currentVesselNames = currentVessels.map(v => v.name);
            const newVesselNames = dto.vessels;

            // Identify vessels to delete (exist in DB but not in new list)
            const vesselsToDelete = currentVessels.filter(v => !newVesselNames.includes(v.name));

            // Identify vessels to create (exist in new list but not in DB)
            const vesselsToCreate = newVesselNames.filter(name => !currentVesselNames.includes(name));

            // Delete removed vessels
            if (vesselsToDelete.length > 0) {
                // Check if any to-be-deleted vessels have related records
                for (const vessel of vesselsToDelete) {
                    const tripCount = await this.prisma.trip.count({ where: { vesselId: vessel.id } });
                    const feeCount = await this.prisma.additionalFee.count({ where: { vesselId: vessel.id } });

                    if (tripCount > 0 || feeCount > 0) {
                        // If vessel has related records, we can't delete it.
                        // For now, we'll throw a conflict exception to warn the user.
                        // Or we could silently keep it, but that desyncs the UI.
                        // A friendly error is better.
                        throw new ConflictException(`لا يمكن حذف العبارة "${vessel.name}" لوجود رحلات أو رسوم مرتبطة بها`);
                    }
                }

                await this.prisma.vessel.deleteMany({
                    where: {
                        id: { in: vesselsToDelete.map(v => v.id) }
                    }
                });
            }

            // Create new vessels
            if (vesselsToCreate.length > 0) {
                await this.prisma.vessel.createMany({
                    data: vesselsToCreate.map((name) => ({
                        agentId: id,
                        name,
                    })),
                });
            }
        }

        return this.prisma.agent.findUnique({
            where: { id },
            include: { vessels: true },
        });
    }

    async removeAgent(id: string) {
        await this.findOneAgent(id);

        // Check if agent has trips or fees
        const count = await this.prisma.trip.count({
            where: { agentId: id },
        });

        const feesCount = await this.prisma.additionalFee.count({
            where: { agentId: id },
        });

        if (count > 0 || feesCount > 0) {
            throw new ConflictException('لا يمكن حذف الوكيل لوجود عمليات مرتبطة به');
        }

        await this.prisma.agent.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false // Mark as inactive so it doesn't show in balances
            },
        });

        return { message: 'تم حذف الوكيل بنجاح' };
    }

    // ============ TRIPS ============

    async createTrip(dto: CreateTripDto) {
        const agent = await this.findOneAgent(dto.agentId);

        let totalAmount: number;
        let quantity: number;

        if (dto.costType === 'DETAILED') {
            const twf = dto.trucksWithFreight || 0;
            const twof = dto.trucksWithoutFreight || 0;
            const ttwf = dto.transitTrucksWithFreight || 0;
            const ttwof = dto.transitTrucksWithoutFreight || 0;
            const freight = dto.freightPerTruck || 0;
            const portFees = dto.portFeesPerTruck || 0;
            const transitPortFees = dto.transitPortFeesPerTruck || 0;
            totalAmount = (twf * (freight + portFees)) + (twof * portFees)
                + (ttwf * (freight + transitPortFees)) + (ttwof * transitPortFees);
            quantity = twf + twof + ttwf + ttwof;
        } else {
            // TOTAL
            totalAmount = dto.totalAmount || 0;
            quantity = dto.quantity || 0;
        }

        const trip = await this.prisma.trip.create({
            data: {
                agentId: dto.agentId,
                vesselId: dto.vesselId,
                tripNumber: dto.tripNumber,
                date: new Date(dto.date),
                costType: dto.costType,
                trucksWithFreight: dto.trucksWithFreight || 0,
                trucksWithoutFreight: dto.trucksWithoutFreight || 0,
                transitTrucksWithFreight: dto.transitTrucksWithFreight || 0,
                transitTrucksWithoutFreight: dto.transitTrucksWithoutFreight || 0,
                freightPerTruck: new Prisma.Decimal(dto.freightPerTruck || 0),
                portFeesPerTruck: new Prisma.Decimal(dto.portFeesPerTruck || 0),
                transitPortFeesPerTruck: new Prisma.Decimal(dto.transitPortFeesPerTruck || 0),
                quantity,
                unitPrice: new Prisma.Decimal(0),
                totalAmount: new Prisma.Decimal(totalAmount),
                notes: dto.notes,
            },
            include: {
                agent: true,
                vessel: true,
            },
        });

        // Create ledger entry (credit to agent)
        await this.ledger.createEntry({
            sourceType: 'TRIP',
            sourceId: trip.id,
            debitAccount: 'expense:shipping',
            creditAccount: `agent:${dto.agentId}`,
            amount: totalAmount,
            description: `رحلة ${agent.name}`,
        });

        return trip;
    }

    async findAllTrips(query: QueryDto) {
        const { agentId, from, to, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.TripWhereInput = {};

        if (agentId) where.agentId = agentId;
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        const [trips, total] = await Promise.all([
            this.prisma.trip.findMany({
                where,
                skip,
                take: limit,
                include: {
                    agent: true,
                    vessel: true,
                },
                orderBy: { date: 'desc' },
            }),
            this.prisma.trip.count({ where }),
        ]);

        return {
            data: trips,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async updateTrip(id: string, dto: UpdateTripDto) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip) throw new NotFoundException('الرحلة غير موجودة');

        const costType = dto.costType || trip.costType;
        let totalAmount: number;
        let quantity: number;

        if (costType === 'DETAILED') {
            const twf = dto.trucksWithFreight !== undefined ? dto.trucksWithFreight : trip.trucksWithFreight;
            const twof = dto.trucksWithoutFreight !== undefined ? dto.trucksWithoutFreight : trip.trucksWithoutFreight;
            const ttwf = dto.transitTrucksWithFreight !== undefined ? dto.transitTrucksWithFreight : trip.transitTrucksWithFreight;
            const ttwof = dto.transitTrucksWithoutFreight !== undefined ? dto.transitTrucksWithoutFreight : trip.transitTrucksWithoutFreight;
            const freight = dto.freightPerTruck !== undefined ? dto.freightPerTruck : parseFloat(trip.freightPerTruck.toString());
            const portFees = dto.portFeesPerTruck !== undefined ? dto.portFeesPerTruck : parseFloat(trip.portFeesPerTruck.toString());
            const transitPortFees = dto.transitPortFeesPerTruck !== undefined ? dto.transitPortFeesPerTruck : parseFloat(trip.transitPortFeesPerTruck.toString());
            totalAmount = (twf * (freight + portFees)) + (twof * portFees)
                + (ttwf * (freight + transitPortFees)) + (ttwof * transitPortFees);
            quantity = twf + twof + ttwf + ttwof;
        } else {
            totalAmount = dto.totalAmount !== undefined ? dto.totalAmount : parseFloat(trip.totalAmount.toString());
            quantity = dto.quantity !== undefined ? dto.quantity : trip.quantity;
        }

        return this.prisma.trip.update({
            where: { id },
            data: {
                vesselId: dto.vesselId,
                tripNumber: dto.tripNumber,
                date: dto.date ? new Date(dto.date) : undefined,
                costType,
                trucksWithFreight: dto.trucksWithFreight,
                trucksWithoutFreight: dto.trucksWithoutFreight,
                transitTrucksWithFreight: dto.transitTrucksWithFreight,
                transitTrucksWithoutFreight: dto.transitTrucksWithoutFreight,
                freightPerTruck: dto.freightPerTruck !== undefined ? new Prisma.Decimal(dto.freightPerTruck) : undefined,
                portFeesPerTruck: dto.portFeesPerTruck !== undefined ? new Prisma.Decimal(dto.portFeesPerTruck) : undefined,
                transitPortFeesPerTruck: dto.transitPortFeesPerTruck !== undefined ? new Prisma.Decimal(dto.transitPortFeesPerTruck) : undefined,
                quantity,
                totalAmount: new Prisma.Decimal(totalAmount),
                notes: dto.notes,
            },
            include: {
                agent: true,
                vessel: true,
            },
        });
    }

    async removeTrip(id: string) {
        const trip = await this.prisma.trip.findUnique({ where: { id } });
        if (!trip) throw new NotFoundException('الرحلة غير موجودة');

        await this.prisma.trip.delete({ where: { id } });
        return { message: 'تم حذف الرحلة بنجاح' };
    }

    // ============ AGENT SETTINGS ============

    async getAgentSettings() {
        const settings = await this.prisma.appSetting.findFirst();
        return {
            defaultFreightPerTruck: settings ? parseFloat(settings.defaultFreightPerTruck.toString()) : 0,
            defaultPortFeesPerTruck: settings ? parseFloat(settings.defaultPortFeesPerTruck.toString()) : 0,
            defaultTransitPortFees: settings ? parseFloat(settings.defaultTransitPortFees.toString()) : 0,
        };
    }

    async updateAgentSettings(dto: UpdateAgentSettingsDto) {
        // Get current settings
        const current = await this.prisma.appSetting.findFirst();

        // Mark all existing logs as not current
        await this.prisma.agentSettingLog.updateMany({
            where: { isCurrent: true },
            data: { isCurrent: false },
        });

        // Create change log entry
        await this.prisma.agentSettingLog.create({
            data: {
                freight: new Prisma.Decimal(dto.defaultFreightPerTruck),
                portFees: new Prisma.Decimal(dto.defaultPortFeesPerTruck),
                transitPortFees: new Prisma.Decimal(dto.defaultTransitPortFees),
                isCurrent: true,
            },
        });

        // Update settings
        await this.prisma.appSetting.updateMany({
            data: {
                defaultFreightPerTruck: new Prisma.Decimal(dto.defaultFreightPerTruck),
                defaultPortFeesPerTruck: new Prisma.Decimal(dto.defaultPortFeesPerTruck),
                defaultTransitPortFees: new Prisma.Decimal(dto.defaultTransitPortFees),
            },
        });

        return {
            defaultFreightPerTruck: dto.defaultFreightPerTruck,
            defaultPortFeesPerTruck: dto.defaultPortFeesPerTruck,
            defaultTransitPortFees: dto.defaultTransitPortFees,
        };
    }

    async getAgentSettingsLogs() {
        return this.prisma.agentSettingLog.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteAgentSettingLog(id: string) {
        const log = await this.prisma.agentSettingLog.findUnique({ where: { id } });
        if (!log) throw new NotFoundException('السجل غير موجود');
        if (log.isCurrent) throw new ConflictException('لا يمكن حذف السجل الحالي');
        await this.prisma.agentSettingLog.delete({ where: { id } });
        return { message: 'تم حذف السجل بنجاح' };
    }

    // ============ ADDITIONAL FEES ============

    async createAdditionalFee(dto: CreateAdditionalFeeDto) {
        const agent = await this.findOneAgent(dto.agentId);

        const fee = await this.prisma.additionalFee.create({
            data: {
                agentId: dto.agentId,
                vesselId: dto.vesselId,
                date: new Date(dto.date),
                feeType: dto.feeType,
                quantity: dto.quantity || 1,
                amount: new Prisma.Decimal(dto.amount),
                policyNo: dto.policyNo,
                tripNumber: dto.tripNumber,
                details: dto.details,
            },
            include: {
                agent: true,
                vessel: true,
            },
        });

        // Create ledger entry
        await this.ledger.createEntry({
            sourceType: 'ADDITIONAL_FEE',
            sourceId: fee.id,
            debitAccount: 'expense:agent_fees',
            creditAccount: `agent:${dto.agentId}`,
            amount: dto.amount,
            description: `${dto.feeType} - ${agent.name}`,
        });

        return fee;
    }

    async findAllFees(query: QueryDto) {
        const { agentId, from, to, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.AdditionalFeeWhereInput = {};

        if (agentId) where.agentId = agentId;
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        const [fees, total] = await Promise.all([
            this.prisma.additionalFee.findMany({
                where,
                skip,
                take: limit,
                include: {
                    agent: true,
                    vessel: true,
                },
                orderBy: { date: 'desc' },
            }),
            this.prisma.additionalFee.count({ where }),
        ]);

        return {
            data: fees,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async updateFee(id: string, dto: UpdateAdditionalFeeDto) {
        const fee = await this.prisma.additionalFee.findUnique({ where: { id } });
        if (!fee) throw new NotFoundException('الرسوم غير موجودة');

        return this.prisma.additionalFee.update({
            where: { id },
            data: {
                ...(dto.vesselId !== undefined && { vesselId: dto.vesselId }),
                ...(dto.date && { date: new Date(dto.date) }),
                ...(dto.feeType && { feeType: dto.feeType }),
                ...(dto.quantity && { quantity: dto.quantity }),
                ...(dto.amount && { amount: new Prisma.Decimal(dto.amount) }),
                ...(dto.policyNo !== undefined && { policyNo: dto.policyNo }),
                ...(dto.tripNumber !== undefined && { tripNumber: dto.tripNumber }),
                ...(dto.details !== undefined && { details: dto.details }),
            },
            include: {
                agent: true,
                vessel: true,
            },
        });
    }

    async removeFee(id: string) {
        const fee = await this.prisma.additionalFee.findUnique({ where: { id } });
        if (!fee) throw new NotFoundException('الرسوم غير موجودة');

        await this.prisma.additionalFee.delete({ where: { id } });
        return { message: 'تم حذف الرسوم بنجاح' };
    }

    // ============ AGENT STATEMENT ============

    async getAgentStatement(agentId: string, startDate?: string, endDate?: string) {
        // Verify agent exists
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            throw new NotFoundException('الوكيل غير موجود');
        }

        // Build date filter
        const dateFilter: any = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) dateFilter.date.gte = new Date(startDate);
            if (endDate) dateFilter.date.lte = new Date(endDate);
        }

        // Get trips
        const trips = await this.prisma.trip.findMany({
            where: {
                agentId,
                ...dateFilter,
            },
            include: {
                vessel: true,
            },
            orderBy: { date: 'asc' },
        });

        // Get additional fees with vessel data
        const fees = await this.prisma.additionalFee.findMany({
            where: {
                agentId,
                ...dateFilter,
            },
            include: {
                vessel: true,
            },
            orderBy: { date: 'asc' },
        });

        // Get payment vouchers (سندات صرف) for this agent
        const voucherQuery = {
            where: {
                partyType: 'AGENT',
                partyId: agentId,
                type: 'PAYMENT',
                ...dateFilter,
            },
            orderBy: { date: 'asc' as const },
        };


        const vouchers = await this.prisma.voucher.findMany(voucherQuery);

        // Also check ALL vouchers for this agent (no date filter)
        const allVouchers = await this.prisma.voucher.findMany({
            where: {
                partyType: 'AGENT',
                partyId: agentId,
                type: 'PAYMENT',
            },
        });

        // Calculate summary
        const totalTrips = trips.reduce((sum, trip) => sum + parseFloat(trip.totalAmount.toString()), 0);
        const totalFees = fees.reduce((sum, fee) => sum + parseFloat(fee.amount.toString()), 0);
        const totalVouchers = vouchers.reduce((sum, v) => sum + parseFloat(v.amount.toString()), 0);

        // Calculate opening balance for the period
        let periodOpeningBalance = agent.openingBalance ? parseFloat(agent.openingBalance.toString()) : 0;
        const openingSide = agent.openingSide || 'DEBIT';

        // If startDate is provided, calculate balance from all transactions before startDate
        if (startDate) {
            const beforeStartDate = new Date(startDate);

            // Get all trips before start date
            const tripsBefore = await this.prisma.trip.findMany({
                where: {
                    agentId,
                    date: { lt: beforeStartDate },
                },
            });

            // Get all fees before start date
            const feesBefore = await this.prisma.additionalFee.findMany({
                where: {
                    agentId,
                    date: { lt: beforeStartDate },
                },
            });

            // Get all vouchers before start date
            const vouchersBefore = await this.prisma.voucher.findMany({
                where: {
                    partyType: 'AGENT',
                    partyId: agentId,
                    type: 'PAYMENT',
                    date: { lt: beforeStartDate },
                },
            });

            // Calculate totals before start date
            const tripsTotalBefore = tripsBefore.reduce((sum, trip) => sum + parseFloat(trip.totalAmount.toString()), 0);
            const feesTotalBefore = feesBefore.reduce((sum, fee) => sum + parseFloat(fee.amount.toString()), 0);
            const vouchersTotalBefore = vouchersBefore.reduce((sum, v) => sum + parseFloat(v.amount.toString()), 0);

            // Calculate period opening balance
            // If opening side is CREDIT, we owe the agent (positive balance for agent)
            // If opening side is DEBIT, agent owes us (negative balance for agent)
            const originalBalance = openingSide === 'CREDIT' ? periodOpeningBalance : -periodOpeningBalance;

            // Add all transactions before start date
            // Trips and fees increase agent's balance (credit to agent)
            // Vouchers decrease agent's balance (debit from agent - we paid them)
            periodOpeningBalance = originalBalance + tripsTotalBefore + feesTotalBefore - vouchersTotalBefore;
        } else {
            // No start date, use original opening balance
            periodOpeningBalance = openingSide === 'CREDIT' ? periodOpeningBalance : -periodOpeningBalance;
        }

        return {
            agent: {
                id: agent.id,
                name: agent.name,
                openingBalance: periodOpeningBalance,
                openingSide: periodOpeningBalance >= 0 ? 'CREDIT' : 'DEBIT',
            },
            trips: trips.map(trip => ({
                id: trip.id,
                date: trip.date,
                tripNumber: trip.tripNumber,
                quantity: trip.quantity,
                totalAmount: parseFloat(trip.totalAmount.toString()),
                notes: trip.notes,
                vessel: trip.vessel ? {
                    id: trip.vessel.id,
                    name: trip.vessel.name,
                } : null,
            })),
            fees: fees.map(fee => ({
                id: fee.id,
                date: fee.date,
                feeType: fee.feeType,
                tripNumber: fee.tripNumber,
                quantity: fee.quantity || 1,
                amount: parseFloat(fee.amount.toString()),
                vessel: fee.vessel ? {
                    id: fee.vessel.id,
                    name: fee.vessel.name,
                } : null,
            })),
            vouchers: vouchers.map(v => ({
                id: v.id,
                code: v.code,
                date: v.date,
                amount: parseFloat(v.amount.toString()),
                notes: v.note,
                counterparty: v.partyName || 'غير محدد',
            })),
            summary: {
                totalCredit: totalTrips + totalFees, // What agent should receive
                totalDebit: totalVouchers,            // What was paid to agent
                balance: (totalTrips + totalFees) - totalVouchers,
            },
        };
    }

    async getTotalBalance() {
        // Calculate total creditors balance directly via Prisma
        // The DB view (agents_with_balance) was missing additional_fees, so we calculate here
        const agents = await this.prisma.agent.findMany({
            where: {
                isActive: true,
                deletedAt: null,
            },
            select: {
                id: true,
                openingBalance: true,
                openingSide: true,
            },
        });

        let totalCreditors = 0;

        for (const agent of agents) {
            const openingBalance = agent.openingBalance ? parseFloat(agent.openingBalance.toString()) : 0;
            const openingSide = agent.openingSide || 'DEBIT';
            // CREDIT = we owe the agent (positive). DEBIT = agent owes us (negative).
            const adjustedOpening = openingSide === 'CREDIT' ? openingBalance : -openingBalance;

            // Sum trips
            const tripsAgg = await this.prisma.trip.aggregate({
                where: { agentId: agent.id },
                _sum: { totalAmount: true },
            });
            const totalTrips = tripsAgg._sum.totalAmount ? parseFloat(tripsAgg._sum.totalAmount.toString()) : 0;

            // Sum additional fees (was missing from the DB view!)
            const feesAgg = await this.prisma.additionalFee.aggregate({
                where: { agentId: agent.id },
                _sum: { amount: true },
            });
            const totalFees = feesAgg._sum.amount ? parseFloat(feesAgg._sum.amount.toString()) : 0;

            // Sum payment vouchers (what we already paid the agent)
            const paymentsAgg = await this.prisma.voucher.aggregate({
                where: {
                    partyType: 'AGENT',
                    partyId: agent.id,
                    type: 'PAYMENT',
                },
                _sum: { amount: true },
            });
            const totalPayments = paymentsAgg._sum.amount ? parseFloat(paymentsAgg._sum.amount.toString()) : 0;

            // Current balance = opening + trips + fees - payments
            const currentBalance = adjustedOpening + totalTrips + totalFees - totalPayments;

            // Only sum agents where we owe them money (creditors)
            if (currentBalance > 0) {
                totalCreditors += currentBalance;
            }
        }

        return totalCreditors;
    }
}
