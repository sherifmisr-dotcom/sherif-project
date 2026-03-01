import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) { }

    async findAll(currentUserId: string) {
        // Check if the requesting user is a super admin
        const requestingUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
            select: { isSuperAdmin: true },
        });

        return this.prisma.user.findMany({
            where: requestingUser?.isSuperAdmin
                ? {} // Super admin sees everyone
                : { isSuperAdmin: false }, // Others don't see superadmin
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                isActive: true,
                isAdmin: true,
                isSuperAdmin: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                isActive: true,
                isAdmin: true,
                isSuperAdmin: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async create(createUserDto: CreateUserDto) {
        // Check if username already exists
        const existing = await this.prisma.user.findUnique({
            where: { username: createUserDto.username },
        });

        if (existing) {
            throw new ConflictException('Username already exists');
        }

        // Check if email already exists
        if (createUserDto.email) {
            const existingEmail = await this.prisma.user.findUnique({
                where: { email: createUserDto.email },
            });
            if (existingEmail) {
                throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
            }
        }

        // Validate password
        if (createUserDto.password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                username: createUserDto.username,
                fullName: createUserDto.fullName,
                email: createUserDto.email,
                passwordHash: hashedPassword,
                isAdmin: createUserDto.isAdmin || false,
                isActive: true,
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                isActive: true,
                isAdmin: true,
                createdAt: true,
            },
        });

        // Fire notification for new user creation
        try {
            await this.notificationService.createForAllAdmins({
                type: 'USER_CREATED',
                title: 'مستخدم جديد',
                message: `تم إضافة مستخدم جديد: ${user.fullName || user.username}`,
            });
        } catch (e) { /* ignore notification errors */ }

        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto, currentUserId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                isActive: true,
                isAdmin: true,
                isSuperAdmin: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Prevent modification of Super Admin
        if (user.isSuperAdmin) {
            // Allow Super Admin to update their own email
            if (id !== currentUserId || Object.keys(updateUserDto).some(k => k !== 'email' && k !== 'fullName')) {
                throw new ForbiddenException('لا يمكن تعديل بيانات المسؤول الرئيسي');
            }
        }

        // Prevent users from modifying their own admin status
        if (id === currentUserId && updateUserDto.isAdmin !== undefined) {
            throw new ForbiddenException('Cannot modify your own admin status');
        }

        // Check if username is being changed and if it's already taken
        if (updateUserDto.username && updateUserDto.username !== user.username) {
            const existing = await this.prisma.user.findUnique({
                where: { username: updateUserDto.username },
            });

            if (existing) {
                throw new ConflictException('Username already exists');
            }
        }

        // Check if email is being changed and if it's already taken
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingEmail = await this.prisma.user.findUnique({
                where: { email: updateUserDto.email },
            });
            if (existingEmail) {
                throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
            }
        }

        return this.prisma.user.update({
            where: { id },
            data: updateUserDto,
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                isActive: true,
                isAdmin: true,
                updatedAt: true,
            },
        });
    }

    async remove(id: string, currentUserId: string) {
        // Prevent users from deleting themselves
        if (id === currentUserId) {
            throw new ForbiddenException('Cannot delete your own account');
        }

        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                isActive: true,
                isAdmin: true,
                isSuperAdmin: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Prevent deletion of Super Admin
        if (user.isSuperAdmin) {
            throw new ForbiddenException('لا يمكن حذف المسؤول الرئيسي');
        }

        // Check if this is the last admin
        if (user.isAdmin) {
            const adminCount = await this.prisma.user.count({
                where: { isAdmin: true, isActive: true },
            });

            if (adminCount <= 1) {
                throw new ForbiddenException('Cannot delete the last admin user');
            }
        }

        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted successfully' };
    }

    async changePassword(id: string, changePasswordDto: ChangePasswordDto, currentUserId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, passwordHash: true, isAdmin: true, isSuperAdmin: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Block password changes for Super Admin (emergency account)
        if (user.isSuperAdmin) {
            throw new ForbiddenException('لا يمكن تغيير كلمة مرور المسؤول الرئيسي');
        }

        // If changing own password, verify current password
        if (id === currentUserId && changePasswordDto.currentPassword) {
            const isValid = await bcrypt.compare(
                changePasswordDto.currentPassword,
                user.passwordHash,
            );

            if (!isValid) {
                throw new BadRequestException('Current password is incorrect');
            }
        }

        // Validate new password
        if (changePasswordDto.newPassword.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

        await this.prisma.user.update({
            where: { id },
            data: { passwordHash: hashedPassword },
        });

        return { message: 'Password changed successfully' };
    }

    async toggleActive(id: string, isActive: boolean, currentUserId: string) {
        // Prevent users from deactivating themselves
        if (id === currentUserId) {
            throw new ForbiddenException('Cannot deactivate your own account');
        }

        // Check if user is Super Admin
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { isSuperAdmin: true },
        });

        if (user?.isSuperAdmin) {
            throw new ForbiddenException('لا يمكن تعطيل المسؤول الرئيسي');
        }

        return this.prisma.user.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                username: true,
                fullName: true,
                isActive: true,
            },
        }).then(async (updatedUser) => {
            // Fire notification for user activation/deactivation
            try {
                await this.notificationService.createForAllAdmins({
                    type: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
                    title: isActive ? 'تفعيل مستخدم' : 'تعطيل مستخدم',
                    message: isActive
                        ? `تم تفعيل مستخدم: ${updatedUser.fullName || updatedUser.username}`
                        : `تم تعطيل مستخدم: ${updatedUser.fullName || updatedUser.username}`,
                });
            } catch (e) { /* ignore notification errors */ }
            return updatedUser;
        });
    }
}
