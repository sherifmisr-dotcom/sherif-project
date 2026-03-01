import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    IsEnum,
    IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType, BalanceSide } from '@prisma/client';

export class CreateCustomerDto {
    @ApiProperty({ example: 'شركة النقل السريع' })
    @IsString({ message: 'اسم العميل مطلوب' })
    @IsNotEmpty({ message: 'اسم العميل مطلوب' })
    name: string;

    @ApiPropertyOptional({ example: '0501234567' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'info@example.com' })
    @IsOptional()
    @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
    email?: string;

    @ApiPropertyOptional({ example: 'الرياض، المملكة العربية السعودية' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ enum: CustomerType })
    @IsOptional()
    @IsEnum(CustomerType)
    type?: CustomerType;

    @ApiPropertyOptional({ example: 5000 })
    @IsOptional()
    @IsNumber()
    openingBalance?: number;

    @ApiPropertyOptional({ enum: BalanceSide })
    @IsOptional()
    @IsEnum(BalanceSide)
    openingSide?: BalanceSide;
}

export class UpdateCustomerDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ enum: CustomerType })
    @IsOptional()
    @IsEnum(CustomerType)
    type?: CustomerType;
}

export class QueryCustomersDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({ enum: CustomerType })
    @IsOptional()
    @IsEnum(CustomerType)
    type?: CustomerType;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    limit?: number;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    includeInactive?: boolean;

    @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'] })
    @IsOptional()
    @IsString()
    activeStatus?: 'active' | 'inactive' | 'all';
}
