import { IsString, IsBoolean, IsOptional, MinLength, IsEmail } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @MinLength(3)
    username: string;

    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
    email?: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsBoolean()
    isAdmin?: boolean;
}

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
    email?: string;

    @IsOptional()
    @IsBoolean()
    isAdmin?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class ChangePasswordDto {
    @IsOptional()
    @IsString()
    currentPassword?: string; // Required for own password

    @IsString()
    @MinLength(8)
    newPassword: string;

    @IsString()
    confirmPassword: string;
}
