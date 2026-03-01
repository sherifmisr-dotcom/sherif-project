import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.MAIL_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD,
            },
        });
    }

    async sendPasswordResetEmail(email: string, fullName: string | null, resetUrl: string): Promise<void> {
        const name = fullName || 'المستخدم';

        const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f4f6f9; direction: rtl;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">إعادة تعيين كلمة المرور</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">نظام إدارة العمليات الجمركية</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
            <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px;">مرحباً ${name}،</p>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0 0 24px;">
                لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه لإعادة تعيين كلمة المرور:
            </p>
            
            <!-- Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                    إعادة تعيين كلمة المرور
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; line-height: 1.8; margin: 0 0 16px;">
                إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان.
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ⏰ هذا الرابط صالح لمدة ساعة واحدة فقط.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                نظام إدارة العمليات الجمركية © ${new Date().getFullYear()}
            </p>
        </div>
    </div>
</body>
</html>`;

        try {
            await this.transporter.sendMail({
                from: `"نظام إدارة العمليات الجمركية" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
                to: email,
                subject: 'إعادة تعيين كلمة المرور',
                html: htmlContent,
            });
            this.logger.log(`Password reset email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset email to ${email}`, error);
            throw error;
        }
    }
}
