import { Controller, Get, Patch, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { GetNotificationsQueryDto } from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get user notifications' })
    async getNotifications(@Request() req, @Query() query: GetNotificationsQueryDto) {
        return this.notificationService.findAll(req.user.id, query);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notifications count' })
    async getUnreadCount(@Request() req) {
        const count = await this.notificationService.getUnreadCount(req.user.id);
        return { count };
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    async markAsRead(@Param('id') id: string, @Request() req) {
        return this.notificationService.markAsRead(id, req.user.id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    async markAllAsRead(@Request() req) {
        return this.notificationService.markAllAsRead(req.user.id);
    }
}
