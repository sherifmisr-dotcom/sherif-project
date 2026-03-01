import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    IsBoolean,
    IsArray,
    ValidateNested,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceType } from '@prisma/client';

export class InvoiceItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty()
    @IsNumber()
    unitPrice: number; // سعر الوحدة

    @ApiProperty()
    @IsNumber()
    quantity: number; // الكمية

    @ApiProperty()
    @IsNumber()
    vatRate: number; // نسبة الضريبة لهذا البند

    @ApiProperty()
    @IsNumber()
    amount: number; // الإجمالي (محسوب)

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    hasVat?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    sortOrder?: number;
}

export class CreateInvoiceDto {
    @ApiProperty({ enum: InvoiceType })
    @IsEnum(InvoiceType)
    type: InvoiceType;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'العميل مطلوب' })
    customerId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    customsNo?: string;

    @ApiProperty()
    @IsDateString()
    date: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    driverName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    shipperName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vehicleNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cargoType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    vatEnabled?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    vatRate?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ type: [InvoiceItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceItemDto)
    items: InvoiceItemDto[];
}

export class UpdateInvoiceDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    customsNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    driverName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    shipperName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vehicleNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cargoType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    vatEnabled?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    vatRate?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ type: [InvoiceItemDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceItemDto)
    items?: InvoiceItemDto[];
}

export class QueryInvoicesDto {
    @ApiPropertyOptional({ enum: InvoiceType })
    @IsOptional()
    @IsEnum(InvoiceType)
    type?: InvoiceType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    customerId?: string;

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
    @Type(() => Number)
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    limit?: number;
}
