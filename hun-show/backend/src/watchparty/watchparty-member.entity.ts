import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Watchparty } from './watchparty.entity';

@Entity()
export class WatchpartyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  watchpartyId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Watchparty, (watchparty) => watchparty.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'watchpartyId' })
  watchparty: Watchparty;

  @ManyToOne(() => User, (user) => user.watchparties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
