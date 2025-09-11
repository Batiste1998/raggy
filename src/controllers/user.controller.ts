import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import {
  CreateUserDto,
  UserResponseDto,
  UpdateUserDto,
  UserParamDto,
} from '../dto/user.dto';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * POST /users - Create a new user
   * Body: { required_attributes: string[] }
   * Returns: { id: string (UUID), required_attributes: string[], createdAt: Date, updatedAt: Date }
   * Errors: 400 (validation), 500 (system error)
   */
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createUser(@Body() dto: CreateUserDto): Promise<{
    id: string;
    message: string;
    user: UserResponseDto;
  }> {
    try {
      this.logger.log('Creating new user');

      const user = await this.userService.createUser(dto);

      return {
        id: user.id,
        message: 'User created successfully',
        user,
      };
    } catch (error) {
      this.logger.error('Failed to create user', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /users/:id - Get a user by ID
   * Returns: UserResponseDto
   * Errors: 400 (invalid ID), 404 (not found), 500 (system error)
   */
  @Get(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUser(@Param() params: UserParamDto): Promise<{
    message: string;
    user: UserResponseDto;
  }> {
    try {
      const { id } = params;
      this.logger.log(`Getting user: ${id}`);

      const user = await this.userService.findUserById(id);

      return {
        message: 'User retrieved successfully',
        user,
      };
    } catch (error) {
      const { id } = params;
      this.logger.error(`Failed to get user ${id}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /users/:id - Update a user
   * Body: { required_attributes?: string[] }
   * Returns: UserResponseDto
   * Errors: 400 (validation), 404 (not found), 500 (system error)
   */
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUser(
    @Param() params: UserParamDto,
    @Body() dto: UpdateUserDto,
  ): Promise<{
    message: string;
    user: UserResponseDto;
  }> {
    try {
      const { id } = params;
      this.logger.log(`Updating user: ${id}`);

      const user = await this.userService.updateUser(id, dto);

      return {
        message: 'User updated successfully',
        user,
      };
    } catch (error) {
      const { id } = params;
      this.logger.error(`Failed to update user ${id}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /users/:id - Delete a user
   * Returns: Success message
   * Errors: 400 (invalid ID), 404 (not found), 500 (system error)
   */
  @Delete(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteUser(@Param() params: UserParamDto): Promise<{
    id: string;
    message: string;
  }> {
    try {
      const { id } = params;
      this.logger.log(`Deleting user: ${id}`);

      await this.userService.deleteUser(id);

      return {
        id,
        message: 'User deleted successfully',
      };
    } catch (error) {
      const { id } = params;
      this.logger.error(`Failed to delete user ${id}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /users - Get all users (admin endpoint)
   * Returns: Array of UserResponseDto
   * Errors: 500 (system error)
   */
  @Get()
  async getAllUsers(): Promise<{
    message: string;
    users: UserResponseDto[];
    count: number;
  }> {
    try {
      this.logger.log('Getting all users');

      const users = await this.userService.getAllUsers();

      return {
        message: 'Users retrieved successfully',
        users,
        count: users.length,
      };
    } catch (error) {
      this.logger.error('Failed to get all users', error);

      throw new HttpException(
        'Failed to retrieve users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
