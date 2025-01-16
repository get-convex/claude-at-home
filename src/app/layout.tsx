import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { ConvexClientProvider } from '../components/ConvexClientProvider';
import '../index.css';

export const metadata = {
  title: 'We have Claude at home',
  description: 'A chat interface powered by Claude',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
