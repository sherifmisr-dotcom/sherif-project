import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'admin' })
    @IsString({ message: 'اسم المستخدم مطلوب' })
    @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
    username: string;

    @ApiProperty({ example: 'admin123' })
    @IsString({ message: 'كلمة المرور مطلوبة' })
    @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
    @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
    password: string;
}

export class RefreshTokenDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'admin' })
    @IsString({ message: 'اسم المستخدم مطلوب' })
    @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
    username: string;
}

export class ResetPasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'رمز إعادة التعيين مطلوب' })
    token: string;

    @ApiProperty()
    @IsString()
    @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
    newPassword: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'تأكيد كلمة المرور مطلوب' })
    confirmPassword: string;
}
