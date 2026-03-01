import { Controller, Post, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('system')
@UseGuards(JwtAuthGuard)
export class SystemController {
    constructor(private systemService: SystemService) { }

    @Post('reset')
    async resetSystem(@Request() req) {
        // Check if user is admin
        if (!req.user.isAdmin) {
            throw new ForbiddenException('هذه العملية متاحة للمسؤول فقط');
        }

        return this.systemService.resetSystem();
    }
}
