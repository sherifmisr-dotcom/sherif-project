import { IsIn, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CarryForwardDto {
    @ApiProperty({ enum: ['MONTH', 'YEAR'] })
    @IsIn(['MONTH', 'YEAR'])
    periodType: 'MONTH' | 'YEAR';

    @ApiProperty()
    @IsDateString()
    newPeriodStartDate: string;
}
