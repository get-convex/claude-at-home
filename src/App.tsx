'use client';

import { Button } from '@/components/ui/button';
import { SignInButton, UserButton } from '@clerk/clerk-react';
import { Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { ThemeSwitcher } from './components/theme-switcher';
import { ChatLayout } from './components/ChatLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

function WaitForAuth(props: { children: React.ReactNode }) {
  const status = useQuery(api.auth.currentUser);
  if (status === 'Logged in') {
    return <>{props.children}</>;
  }
  let message = '';
  if (status === undefined) {
    message = 'Waiting for login...';
  } else if (status === 'No JWT token') {
    message = 'Not logged in';
  } else if (status === 'No Clerk user') {
    message = 'Waiting for Clerk user...';
  } else if (status === 'Disallowed email') {
    message = 'Email not allowed. Contact the webmaster.';
  }
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 dark:border-gray-200 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">
          Loading <span className="animate-pulse">...</span>
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">{message}</p>
      </div>
    </div>
  );
}

interface AppProps {
  preloadedConversations?: Array<{
    _id: Id<'conversations'>;
    name?: string;
    creatorId: Id<'users'>;
  }>;
}

export default function App({ preloadedConversations }: AppProps) {
  return (
    <main className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <Authenticated>
        <WaitForAuth>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <ThemeSwitcher />
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/sujayakar/claude-at-home"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on GitHub"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </Button>
            <UserButton afterSignOutUrl="#" />
          </div>
          <div className="absolute top-16 right-4 flex items-center gap-2">
            <a
              target="_blank"
              href="https://convex.dev"
              className="font-['Kanit']"
              style={{ fontWeight: '700' }}
            >
              convex labs
            </a>
          </div>
          <div className="flex flex-col">
            <h1 className="text-4xl font-extrabold my-8 text-center text-gray-800 dark:text-gray-100">
              {process.env.NEXT_PUBLIC_CHAT_TITLE ?? '"We have Claude at home"'}
            </h1>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>
          <div className="flex-1 flex overflow-hidden">
            <ChatLayout preloadedConversations={preloadedConversations} />
          </div>
        </WaitForAuth>
      </Authenticated>
      <Unauthenticated>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">"We have Claude at home"</CardTitle>
              <CardDescription>Sign in to get started!</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <SignInButton mode="modal">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
                  Sign in
                </Button>
              </SignInButton>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
    </main>
  );
}
