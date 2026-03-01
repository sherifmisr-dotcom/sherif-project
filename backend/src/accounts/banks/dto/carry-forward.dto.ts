import { IsEnum, IsDateString } from 'class-validator';

export class CarryForwardDto {
    @IsEnum(['MONTH', 'YEAR'])
    periodType: 'MONTH' | 'YEAR';

    @IsDateString()
    newPeriodStartDate: string;
}
