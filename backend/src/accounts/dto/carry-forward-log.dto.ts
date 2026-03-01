import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CarryForwardLogDto {
    id: string;
    type: string;
    entityId: string | null;
    executionType: string;
    executedBy: string | null;
    periodType: string;
    fromDate: Date;
    toDate: Date;
    balanceAmount: number;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
}

export class GetCarryForwardLogsQueryDto {
    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    executionType?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    startDate?: string;

    @IsOptional()
    @IsString()
    endDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number;
}
