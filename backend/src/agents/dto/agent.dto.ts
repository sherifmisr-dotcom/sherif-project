import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsArray,
    IsEnum,
    IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BalanceSide } from '@prisma/client';

// Agent DTOs
export class CreateAgentDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'اسم الوكيل مطلوب' })
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    vessels?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    openingBalance?: number;

    @ApiPropertyOptional({ enum: BalanceSide })
    @IsOptional()
    @IsEnum(BalanceSide)
    openingSide?: BalanceSide;
}

export class UpdateAgentDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    vessels?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    openingBalance?: number;

    @ApiPropertyOptional({ enum: BalanceSide })
    @IsOptional()
    @IsEnum(BalanceSide)
    openingSide?: BalanceSide;
}

// Trip DTOs
export class CreateTripDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'الوكيل مطلوب' })
    agentId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vesselId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    tripNumber?: string;

    @ApiProperty()
    @IsDateString()
    date: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    costType: string; // 'DETAILED' or 'TOTAL'

    // Detailed cost fields
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    trucksWithFreight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    trucksWithoutFreight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    transitTrucksWithFreight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    transitTrucksWithoutFreight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    freightPerTruck?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    portFeesPerTruck?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    transitPortFeesPerTruck?: number;

    // Total cost fields
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    quantity?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    totalAmount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateTripDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vesselId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    tripNumber?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    costType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    trucksWithFreight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    trucksWithoutFreight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    transitTrucksWithFreight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    transitTrucksWithoutFreight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    freightPerTruck?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    portFeesPerTruck?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    transitPortFeesPerTruck?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    quantity?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    totalAmount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

// Additional Fee DTOs
export class CreateAdditionalFeeDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'الوكيل مطلوب' })
    agentId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vesselId?: string;

    @ApiProperty()
    @IsDateString()
    date: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'نوع الرسوم مطلوب' })
    feeType: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    quantity?: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty({ message: 'المبلغ مطلوب' })
    amount: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    policyNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    tripNumber?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    details?: string;
}

export class UpdateAdditionalFeeDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vesselId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    feeType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    quantity?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    amount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    policyNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    tripNumber?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    details?: string;
}

export class QueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    agentId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    limit?: number;
}

// Agent Settings DTO
export class UpdateAgentSettingsDto {
    @ApiProperty()
    @IsNumber()
    defaultFreightPerTruck: number;

    @ApiProperty()
    @IsNumber()
    defaultPortFeesPerTruck: number;

    @ApiProperty()
    @IsNumber()
    defaultTransitPortFees: number;
}
