import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionsModule } from '../permissions/permissions.module';
import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: (() => {
                if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
                return process.env.JWT_SECRET;
            })(),
            signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
        }),
        PermissionsModule,
        MailModule,
        NotificationModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
