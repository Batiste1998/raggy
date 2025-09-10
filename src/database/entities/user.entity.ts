import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string; // user_id from external API

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // One user can have many conversations
  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
