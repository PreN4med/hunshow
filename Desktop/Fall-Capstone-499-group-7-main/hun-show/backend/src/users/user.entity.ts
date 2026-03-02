import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Session } from '../sessions/session.entity';
import { WatchpartyMember } from '../watchparty/watchparty-member.entity';
import { PlaybackProgress } from '../playback/playback-progress.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => WatchpartyMember, (member) => member.user)
  watchparties: WatchpartyMember[];

  @OneToMany(() => PlaybackProgress, (progress) => progress.user)
  playbackProgress: PlaybackProgress[];
}
