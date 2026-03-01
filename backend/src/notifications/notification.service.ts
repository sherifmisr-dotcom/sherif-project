import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, GetNotificationsQueryDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    /** In-memory dedup set: tracks recent notification keys to prevent duplicates from concurrent requests */
    private readonly recentNotifications = new Set<string>();

    constructor(private prisma: PrismaService) { }

    /**
     * Create a new notification
     */
    async create(dto: CreateNotificationDto) {
        try {
            const notification = await this.prisma.notification.create({
                data: {
                    userId: dto.userId || null,
                    type: dto.type,
                    title: dto.title,
                    message: dto.message,
                    data: dto.data || null,
                },
            });

            this.logger.log(`Notification created: ${notification.id} - ${notification.title}`);
            return notification;
        } catch (error) {
            this.logger.error('Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Create notification for all admins
     */
    async createForAllAdmins(dto: Omit<CreateNotificationDto, 'userId'>) {
        return this.create({
            ...dto,
            userId: null, // null = all admins
        });
    }

    /**
     * Create notification for all admins, but skip if a similar one was created recently (within 30 seconds).
     * Uses in-memory lock to handle concurrent requests (e.g., 99 permission changes at once).
     */
    async createForAllAdminsDeduped(dto: Omit<CreateNotificationDto, 'userId'>) {
        const key = `${dto.type}:${dto.message}`;

        // If this exact notification was already created recently, skip
        if (this.recentNotifications.has(key)) {
            return null;
        }

        // Mark as created and auto-clear after 30 seconds
        this.recentNotifications.add(key);
        setTimeout(() => this.recentNotifications.delete(key), 30_000);

        return this.createForAllAdmins(dto);
    }

    /**
     * Get notifications for a user
     */
    async findAll(userId: string, query: GetNotificationsQueryDto) {
        const { limit = 20, offset = 0, unreadOnly = false } = query;

        const where = {
            OR: [
                { userId: userId },
                { userId: null }, // Global notifications
            ],
            ...(unreadOnly && { isRead: false }),
        };

        const [notifications, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.notification.count({ where }),
        ]);

        return {
            data: notifications,
            total,
            limit,
            offset,
        };
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return this.prisma.notification.count({
            where: {
                OR: [
                    { userId: userId },
                    { userId: null },
                ],
                isRead: false,
            },
        });
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id: string, userId: string) {
        // Verify notification belongs to user or is global
        const notification = await this.prisma.notification.findFirst({
            where: {
                id,
                OR: [
                    { userId: userId },
                    { userId: null },
                ],
            },
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: {
                OR: [
                    { userId: userId },
                    { userId: null },
                ],
                isRead: false,
            },
            data: { isRead: true },
        });
    }

    /**
     * Delete old notifications (older than 30 days)
     */
    async deleteOldNotifications() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await this.prisma.notification.deleteMany({
            where: {
                createdAt: {
                    lt: thirtyDaysAgo,
                },
                isRead: true, // Only delete read notifications
            },
        });

        this.logger.log(`Deleted ${result.count} old notifications`);
        return result;
    }
}
