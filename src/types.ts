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
  state:
    | {
        type: 'generating';
      }
    | {
        type: 'complete';
      }
    | {
        type: 'error';
        error: string;
      };
}

export interface Conversation {
  _id: Id<'conversations'>;
  name?: string;
  _creationTime: number;
  creatorId: Id<'users'>;
}
