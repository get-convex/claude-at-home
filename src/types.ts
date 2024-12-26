import { Id } from '../convex/_generated/dataModel';

export interface Message {
  _id: Id<'messages'>;
  agent:
  | {
    type: 'user';
    name: string;
    imageUrl: string;
  }
  | {
    type: 'openai';
  };
  body: string;
  isComplete: boolean;
}

export interface Conversation {
  _id: Id<'conversations'>;
  name?: string;
  _creationTime: number;
  creatorId: Id<'users'>;
} 