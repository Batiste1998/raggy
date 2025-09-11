import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('simple-array', { default: '' })
  required_attributes: string[];

  @Column('jsonb', { default: {} })
  extracted_attributes: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  last_extraction_date: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // One user can have many conversations
  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
