import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { WatchpartyMember } from './watchparty-member.entity';

export enum WatchpartyStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ENDED = 'ended',
}

@Entity()
export class Watchparty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hostId: string;

  @Column()
  videoId: string; // References MongoDB video _id

  @Column({
    type: 'enum',
    enum: WatchpartyStatus,
    default: WatchpartyStatus.WAITING,
  })
  status: WatchpartyStatus;

  @Column({ default: 0 })
  currentProgressSeconds: number; // Synced playback position for all members

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @OneToMany(() => WatchpartyMember, (member) => member.watchparty)
  members: WatchpartyMember[];
}
