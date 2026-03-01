import {
    IsNumber,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetOpeningBalanceDto {
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty({ message: 'الرصيد الافتتاحي مطلوب' })
    openingBalance: number;
}

export class QueryTransactionsDto {
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

export class UpdateTreasurySettingsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    preventNegativeTreasury?: boolean;
}
