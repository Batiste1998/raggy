import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Resource } from './resource.entity';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column('float', { array: true, nullable: true })
  embedding: number[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @ManyToOne(() => Resource, (resource) => resource.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column('uuid')
  resource_id: string;
}
