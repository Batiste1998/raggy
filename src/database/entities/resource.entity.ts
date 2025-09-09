import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { DocumentChunk } from './document-chunk.entity';

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mimeType: string;

  @Column('bigint')
  fileSize: number;

  @CreateDateColumn()
  uploadedAt: Date;

  @OneToMany(() => DocumentChunk, (chunk) => chunk.resource, { cascade: true })
  chunks: DocumentChunk[];
}
