import React from 'react';
import { preloadQuery } from 'convex/nextjs';
import { api } from '../../convex/_generated/api';
import { ClientPage } from '../components/ClientPage';

export default async function Page() {
  // Preload the conversations query for the client
  const preloadedConversations = await preloadQuery(api.conversations.list);

  // Pass the preloaded data to the client component
  return <ClientPage preloadedConversations={preloadedConversations} />;
}
