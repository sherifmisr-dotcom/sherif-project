import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: any) {
        const user = await this.authService.validateUser(payload.sub);
        if (!user) {
            return null;
        }
        // Return user object with both id and userId for compatibility
        return {
            userId: user.id,
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
        };
    }
}
