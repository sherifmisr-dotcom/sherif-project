import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsBoolean,
    IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Bank DTOs
export class CreateBankDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'اسم البنك مطلوب' })
    name: string;
}

export class UpdateBankDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;
}

// Bank Account DTOs
export class CreateBankAccountDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'البنك مطلوب' })
    bankId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'رقم الحساب مطلوب' })
    accountNo: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    openingBalance?: number;
}

export class UpdateBankAccountDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    accountNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class QueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    active?: boolean;

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
