import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    IsDateString,
    IsBoolean,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType, PartyType, PaymentMethod } from '@prisma/client';

export class GroupDistributionItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    customerId: string;

    @ApiProperty()
    @IsNumber()
    amount: number;
}

export class CreateVoucherDto {
    @ApiProperty({ enum: VoucherType })
    @IsEnum(VoucherType)
    type: VoucherType;

    @ApiProperty({ enum: PartyType })
    @IsEnum(PartyType)
    partyType: PartyType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    partyId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    partyName?: string;

    @ApiProperty({ enum: PaymentMethod })
    @IsEnum(PaymentMethod)
    method: PaymentMethod;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankAccountId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty({ message: 'المبلغ مطلوب' })
    amount: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    note?: string;

    @ApiProperty()
    @IsDateString()
    date: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    hasBankFees?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    actualAmountReceived?: number;

    @ApiPropertyOptional({ type: [GroupDistributionItemDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GroupDistributionItemDto)
    groupDistribution?: GroupDistributionItemDto[];
}

export class UpdateVoucherDto {
    @ApiPropertyOptional({ enum: PartyType })
    @IsOptional()
    @IsEnum(PartyType)
    partyType?: PartyType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    partyId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    partyName?: string;

    @ApiPropertyOptional({ enum: PaymentMethod })
    @IsOptional()
    @IsEnum(PaymentMethod)
    method?: PaymentMethod;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankAccountId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    amount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    note?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sourceType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sourceAccountId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    destType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    destAccountId?: string;
}

export class QueryVouchersDto {
    @ApiPropertyOptional({ enum: VoucherType })
    @IsOptional()
    @IsEnum(VoucherType)
    type?: VoucherType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    limit?: number;
}
