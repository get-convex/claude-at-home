import { Button } from '@/components/ui/button';
import { SignInButton, UserButton } from '@clerk/clerk-react';
import { Authenticated, Unauthenticated } from 'convex/react';
import { ThemeSwitcher } from './components/theme-switcher';
import { ChatLayout } from './components/ChatLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function App() {
  return (
    <main className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <Authenticated>
        <>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <ThemeSwitcher />
            <UserButton afterSignOutUrl="#" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-4xl font-extrabold my-8 text-center text-gray-800 dark:text-gray-100">
              🍓 Chat for Pooj & Suj
            </h1>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>
          <div className="flex-1 flex overflow-hidden">
            <ChatLayout />
          </div>
        </>
      </Authenticated>
      <Unauthenticated>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">"We have Claude at home"</CardTitle>
              <CardDescription>
                Sign in with a pre-approved email address to get started.
              </CardDescription>
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
