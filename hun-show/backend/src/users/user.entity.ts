import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { WatchpartyMember } from '../watchparty/watchparty-member.entity';
import { PlaybackProgress } from '../playback/playback-progress.entity';
import { Comment } from '../comments/comment.entity';
import { Rating } from '../ratings/rating.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  supabaseId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => WatchpartyMember, (member) => member.user)
  watchparties: WatchpartyMember[];

  @OneToMany(() => PlaybackProgress, (progress) => progress.user)
  playbackProgress: PlaybackProgress[];

  // All comments made by this user
  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  // All ratings given by this user
  @OneToMany(() => Rating, (rating) => rating.user)
  ratings: Rating[];
}
