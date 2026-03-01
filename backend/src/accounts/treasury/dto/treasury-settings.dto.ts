import { IsNumber, IsDateString, IsString, IsOptional } from 'class-validator';

export class UpdateTreasurySettingsDto {
    @IsNumber()
    @IsOptional()
    openingBalance?: number;

    @IsDateString()
    @IsOptional()
    openingBalanceDate?: string;

    @IsString()
    @IsOptional()
    carryForwardNote?: string;
}
