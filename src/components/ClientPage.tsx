'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import App from '../App';

interface ClientPageProps {
  preloadedConversations: any; // Server-side preloaded data
}

export function ClientPage({ preloadedConversations }: ClientPageProps) {
  // Use useQuery for reactive data fetching, with preloaded data as initial value
  const conversations = useQuery(api.conversations.list) ?? preloadedConversations;

  return <App preloadedConversations={conversations} />;
}
