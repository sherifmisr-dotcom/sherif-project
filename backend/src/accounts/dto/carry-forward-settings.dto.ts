import { IsBoolean, IsInt, IsEnum, IsOptional, Min, Max } from 'class-validator';

export class UpdateCarryForwardSettingsDto {
    @IsOptional()
    @IsBoolean()
    autoCarryForwardEnabled?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(31)
    carryForwardDay?: number;

    @IsOptional()
    @IsEnum(['MONTH', 'YEAR'])
    carryForwardType?: 'MONTH' | 'YEAR';

    @IsOptional()
    @IsBoolean()
    notifyBeforeCarryForward?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(30)
    notifyDaysBefore?: number;
}

export class CarryForwardSettingsResponseDto {
    id: string;
    autoCarryForwardEnabled: boolean;
    carryForwardDay: number;
    carryForwardType: string;
    notifyBeforeCarryForward: boolean;
    notifyDaysBefore: number;
    lastAutoCarryForward: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
