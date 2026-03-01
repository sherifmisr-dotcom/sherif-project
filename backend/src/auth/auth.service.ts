import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notifications/notification.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private permissionsService: PermissionsService,
        private mailService: MailService,
        private notificationService: NotificationService,
    ) { }

    async login(loginDto: LoginDto) {
        const { username, password } = loginDto;

        // Find user
        const user = await this.prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new UnauthorizedException('هذا الحساب غير نشط');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
        }

        // Load user permissions
        const permissions = await this.permissionsService.getUserPermissions(user.id);

        // Generate tokens with isSuperAdmin in payload
        const payload = {
            sub: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
        };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        });

        // Fire login notification for all users except super admins
        if (!user.isSuperAdmin) {
            try {
                await this.notificationService.createForAllAdmins({
                    type: 'USER_LOGIN',
                    title: 'تسجيل دخول',
                    message: `قام ${user.fullName || user.username} بتسجيل الدخول`,
                });
            } catch (e) { /* ignore notification errors */ }
        }

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin,
                isSuperAdmin: user.isSuperAdmin,
            },
            permissions,
        };
    }

    async refresh(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            // Load user to get latest isSuperAdmin status
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: {
                    id: true,
                    username: true,
                    isAdmin: true,
                    isSuperAdmin: true,
                    isActive: true,
                },
            });

            if (!user || !user.isActive) {
                throw new UnauthorizedException('المستخدم غير نشط');
            }

            // Generate new access token with updated isSuperAdmin
            const newPayload = {
                sub: user.id,
                username: user.username,
                isAdmin: user.isAdmin,
                isSuperAdmin: user.isSuperAdmin,
            };
            const accessToken = this.jwtService.sign(newPayload);

            return { accessToken };
        } catch (error) {
            throw new UnauthorizedException('رمز التحديث غير صالح');
        }
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                isAdmin: true,
                isSuperAdmin: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) {
            return null;
        }

        return user;
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const { username } = forgotPasswordDto;

        // Find user by username
        const user = await this.prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                isAdmin: true,
                isSuperAdmin: true,
                passwordResetExpires: true,
            },
        });

        // If user not found, return generic message (don't reveal user existence)
        if (!user) {
            return {
                message: 'إذا كان الحساب موجوداً وله بريد إلكتروني مرتبط، سيتم إرسال رابط إعادة التعيين.',
                hasEmail: false,
            };
        }

        // Block password reset for Super Admin (emergency account)
        if (user.isSuperAdmin) {
            return {
                message: 'إذا كان الحساب موجوداً وله بريد إلكتروني مرتبط، سيتم إرسال رابط إعادة التعيين.',
                hasEmail: false,
            };
        }

        // If user has no email, tell them to contact admin
        if (!user.email) {
            return {
                message: 'هذا الحساب غير مرتبط ببريد إلكتروني. يرجى التواصل مع مدير النظام لإعادة تعيين كلمة المرور.',
                hasEmail: false,
            };
        }

        // Cooldown: prevent requesting a new token if a valid one was issued less than 2 minutes ago
        if (user.passwordResetExpires) {
            const tokenIssuedAt = new Date(user.passwordResetExpires.getTime() - 60 * 60 * 1000); // token expires in 1h, so issued = expires - 1h
            const cooldownMs = 2 * 60 * 1000; // 2 minutes
            const timeSinceIssued = Date.now() - tokenIssuedAt.getTime();
            if (timeSinceIssued < cooldownMs) {
                const remainingSeconds = Math.ceil((cooldownMs - timeSinceIssued) / 1000);
                throw new BadRequestException(
                    `تم إرسال رابط إعادة التعيين مؤخراً. يرجى الانتظار ${remainingSeconds} ثانية قبل المحاولة مرة أخرى.`
                );
            }
        }

        // Generate secure token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Save hashed token and expiry to user (overwrites any previous token)
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: hashedToken,
                passwordResetExpires: expiresAt,
            },
        });

        // Build reset URL
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

        // Send email
        try {
            await this.mailService.sendPasswordResetEmail(user.email, user.fullName, resetUrl);
            this.logger.log(`Password reset email sent for user: ${user.username}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset email for user: ${user.username}`, error);
            // Clear the token if email sending fails
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordResetToken: null,
                    passwordResetExpires: null,
                },
            });
            throw new BadRequestException('فشل إرسال البريد الإلكتروني. يرجى التحقق من إعدادات البريد والمحاولة مرة أخرى.');
        }

        // Mask email for security (show first 2 chars + domain)
        const emailParts = user.email.split('@');
        const maskedEmail = emailParts[0].substring(0, 2) + '***@' + emailParts[1];

        return {
            message: `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${maskedEmail}`,
            hasEmail: true,
        };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const { token, newPassword, confirmPassword } = resetPasswordDto;

        if (newPassword !== confirmPassword) {
            throw new BadRequestException('كلمات المرور غير متطابقة');
        }

        if (newPassword.length < 8) {
            throw new BadRequestException('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        }

        // Hash the provided token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Use a transaction to atomically find and consume the token (one-time use)
        const result = await this.prisma.$transaction(async (tx) => {
            // Find user with matching token that hasn't expired
            const user = await tx.user.findFirst({
                where: {
                    passwordResetToken: hashedToken,
                    passwordResetExpires: {
                        gt: new Date(),
                    },
                },
                select: {
                    id: true,
                    username: true,
                },
            });

            if (!user) {
                throw new BadRequestException('رابط إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.');
            }

            // Hash new password and update, clearing the token atomically
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await tx.user.update({
                where: { id: user.id },
                data: {
                    passwordHash: hashedPassword,
                    passwordResetToken: null,
                    passwordResetExpires: null,
                },
            });

            return user;
        });

        this.logger.log(`Password reset successfully for user: ${result.username}`);

        return {
            message: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
        };
    }
}
