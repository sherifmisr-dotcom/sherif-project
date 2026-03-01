import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  userId?: string; // null = all admins

  @IsString()
  type: string; // CARRY_FORWARD_REMINDER, CARRY_FORWARD_SUCCESS, CARRY_FORWARD_FAILED, SYSTEM

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  data?: any; // Extra data (e.g., carry forward date, amount)
}

export class GetNotificationsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean = false;
}

export class MarkAsReadDto {
  @IsString()
  id: string;
}

export class NotificationResponseDto {
  id: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: Date;
}
