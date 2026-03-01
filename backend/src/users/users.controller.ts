import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    findAll(@Request() req) {
        return this.usersService.findAll(req.user.userId);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user info' })
    getCurrentUser(@Request() req) {
        return this.usersService.findOne(req.user.userId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Get user by ID (Admin only)' })
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Create new user (Admin only)' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update user (Admin only)' })
    update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @Request() req,
    ) {
        return this.usersService.update(id, updateUserDto, req.user.userId);
    }

    @Patch(':id/password')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Change user password' })
    changePassword(
        @Param('id') id: string,
        @Body() changePasswordDto: ChangePasswordDto,
        @Request() req,
    ) {
        return this.usersService.changePassword(id, changePasswordDto, req.user.userId);
    }

    @Patch(':id/toggle-active')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Activate/Deactivate user (Admin only)' })
    toggleActive(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
        @Request() req,
    ) {
        return this.usersService.toggleActive(id, isActive, req.user.userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete user (Admin only)' })
    remove(@Param('id') id: string, @Request() req) {
        return this.usersService.remove(id, req.user.userId);
    }
}
