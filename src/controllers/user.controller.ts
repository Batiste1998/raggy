import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto, UserParamDto } from '../dto/user.dto';
import { StandardResponse } from '../dto/response.dto';

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
  async createUser(@Body() dto: CreateUserDto): Promise<
    StandardResponse<{
      id: string;
      required_attributes: string[];
      created_at: Date;
      updated_at: Date;
    }>
  > {
    this.logger.log('Creating new user');
    const user = await this.userService.createUser(dto);

    return {
      message: 'User created successfully',
      data: {
        id: user.id,
        required_attributes: user.required_attributes,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    };
  }

  /**
   * GET /users/:id - Get a user by ID
   * Returns: UserResponseDto
   * Errors: 400 (invalid ID), 404 (not found), 500 (system error)
   */
  @Get(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUser(@Param() params: UserParamDto): Promise<
    StandardResponse<{
      id: string;
      required_attributes: string[];
      created_at: Date;
      updated_at: Date;
    }>
  > {
    const { id } = params;
    this.logger.log(`Getting user: ${id}`);
    const user = await this.userService.findUserById(id);

    return {
      message: 'User retrieved successfully',
      data: {
        id: user.id,
        required_attributes: user.required_attributes,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    };
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
  ): Promise<
    StandardResponse<{
      id: string;
      required_attributes: string[];
      created_at: Date;
      updated_at: Date;
    }>
  > {
    const { id } = params;
    this.logger.log(`Updating user: ${id}`);
    const user = await this.userService.updateUser(id, dto);

    return {
      message: 'User updated successfully',
      data: {
        id: user.id,
        required_attributes: user.required_attributes,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    };
  }

  /**
   * DELETE /users/:id - Delete a user
   * Returns: Success message
   * Errors: 400 (invalid ID), 404 (not found), 500 (system error)
   */
  @Delete(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteUser(@Param() params: UserParamDto): Promise<
    StandardResponse<{
      id: string;
    }>
  > {
    const { id } = params;
    this.logger.log(`Deleting user: ${id}`);
    await this.userService.deleteUser(id);

    return {
      message: 'User deleted successfully',
      data: {
        id,
      },
    };
  }

  /**
   * GET /users - Get all users (admin endpoint)
   * Returns: Array of UserResponseDto
   * Errors: 500 (system error)
   */
  @Get()
  async getAllUsers(): Promise<
    StandardResponse<{
      users: Array<{
        id: string;
        required_attributes: string[];
        created_at: Date;
        updated_at: Date;
      }>;
      count: number;
    }>
  > {
    this.logger.log('Getting all users');
    const users = await this.userService.getAllUsers();

    return {
      message: 'Users retrieved successfully',
      data: {
        users: users.map((user) => ({
          id: user.id,
          required_attributes: user.required_attributes,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        })),
        count: users.length,
      },
    };
  }
}
