import { GetServerSideProps } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { preloadQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import { Conversation } from '../../types';

export interface HomeProps {
  preloadedConversations: Conversation[];
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({ req }) => {
  try {
    // Get Clerk auth token for Convex
    const auth = getAuth(req);
    const token = await auth.getToken({ template: 'convex' });

    if (!token) {
      return {
        props: {
          preloadedConversations: [],
        },
      };
    }

    // Preload conversations data for SSR with auth token
    const preloadedQuery = await preloadQuery(
      api.conversations.list,
      {},
      { token }
    );

    // Extract the conversations from the preloaded query
    const conversations = (preloadedQuery as unknown as Conversation[]) || [];

    return {
      props: {
        preloadedConversations: conversations,
      },
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      props: {
        preloadedConversations: [],
      },
    };
  }
};
