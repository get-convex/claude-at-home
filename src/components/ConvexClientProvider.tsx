'use client';

import React from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
    </ConvexProviderWithClerk>
  );
}
