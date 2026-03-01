import {
    IsString,
    IsOptional,
    IsNumber,
    IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanySettingsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    nameAr?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    nameEn?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    activityAr?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    activityEn?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    taxNumber?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    licenseNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    addressAr?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    addressEn?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    logoPath?: string;
}

export class UpdateAppSettingsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    fontSize?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    theme?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    language?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    dateFormat?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    defaultCurrency?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    preventNegativeTreasury?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    preventNegativeBank?: boolean;
}

export class UpdatePrintSettingsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    headerRightAr?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    headerLeftEn?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    numberingFormat?: string;
}
