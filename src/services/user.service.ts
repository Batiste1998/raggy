import {
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { CreateUserDto, UserResponseDto, UpdateUserDto } from '../dto/user.dto';
import { AttributeExtractionService } from './attribute-extraction.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => AttributeExtractionService))
    private readonly attributeExtractionService: AttributeExtractionService,
  ) {}

  /**
   * Create a new user
   */
  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    try {
      this.logger.log('Creating new user with auto-generated UUID');

      // Create user (UUID will be auto-generated)
      const user = this.userRepository.create({
        required_attributes: dto.required_attributes,
      });

      await this.userRepository.save(user);

      this.logger.log(`User created successfully: ${user.id}`);

      return {
        id: user.id,
        required_attributes: user.required_attributes,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  /**
   * Find user by ID with extracted attributes
   */
  async findUserById(id: string): Promise<UserResponseDto> {
    try {
      this.logger.log(`Finding user with extracted attributes: ${id}`);

      const userWithAttributes =
        await this.attributeExtractionService.getUserWithExtractedAttributes(
          id,
        );

      if (!userWithAttributes) {
        this.logger.warn(`User not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      return userWithAttributes;
    } catch (error) {
      this.logger.error(`Failed to find user ${id}`, error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      this.logger.log(`Updating user: ${id}`);

      // Check if user exists
      const existingUser = await this.userRepository.findOne({
        where: { id },
      });

      if (!existingUser) {
        this.logger.warn(`User not found for update: ${id}`);
        throw new NotFoundException('User not found');
      }

      // Update user
      await this.userRepository.update(id, {
        ...dto,
        updatedAt: new Date(),
      });

      // Return updated user
      const updatedUser = await this.userRepository.findOne({ where: { id } });

      this.logger.log(`User updated successfully: ${id}`);

      return {
        id: updatedUser!.id,
        required_attributes: updatedUser!.required_attributes,
        createdAt: updatedUser!.createdAt,
        updatedAt: updatedUser!.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update user ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting user: ${id}`);

      // Check if user exists
      const existingUser = await this.userRepository.findOne({
        where: { id },
      });

      if (!existingUser) {
        this.logger.warn(`User not found for deletion: ${id}`);
        throw new NotFoundException('User not found');
      }

      // Delete user (cascade will handle conversations and messages)
      await this.userRepository.delete(id);

      this.logger.log(`User deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user ${id}`, error);
      throw error;
    }
  }

  /**
   * Check if user exists (utility method)
   */
  async userExists(id: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      return !!user;
    } catch (error) {
      this.logger.error(`Failed to check if user exists ${id}`, error);
      return false;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<UserResponseDto[]> {
    try {
      this.logger.log('Getting all users');

      const users = await this.userRepository.find({
        order: { createdAt: 'DESC' },
      });

      return users.map((user) => ({
        id: user.id,
        required_attributes: user.required_attributes,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get all users', error);
      throw error;
    }
  }
}
