import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantPermissionDto {
    @ApiProperty({
        description: 'User ID to grant permission to',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'Permission code to grant',
        example: 'customers.view',
    })
    @IsString()
    @IsNotEmpty()
    permissionCode: string;
}
