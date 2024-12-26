import { Button } from '@/components/ui/button';
import { SignInButton, UserButton } from '@clerk/clerk-react';
import { Authenticated, Unauthenticated, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useEffect, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import openAiLogo from './assets/openai-white-logomark.svg';
import { ThemeSwitcher } from './components/theme-switcher';

export default function App() {
  return (
    <main className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-extrabold my-8 text-center text-gray-800 dark:text-gray-100">
          "We have Claude at home"
        </h1>
        <Authenticated>
          <SignedIn />
        </Authenticated>
        <Unauthenticated>
          <div className="flex justify-center">
            <SignInButton mode="modal">
              <Button className="bg-blue-600 hover:bg-blue-700">Sign in</Button>
            </SignInButton>
          </div>
        </Unauthenticated>
      </div>
    </main>
  );
}

function SignedIn() {
  const messages = useQuery(api.messages.list) ?? [];
  const sendMessage = useMutation(api.messages.send);
  const [newMessageText, setNewMessageText] = useState('');

  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeSwitcher />
        <UserButton afterSignOutUrl="#" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-3xl mx-auto px-4">
          {messages.map((message) => (
            <article
              key={message._id}
              className="py-6 border-b border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-start gap-4">
                {message.agent.type === 'user' ? (
                  <div
                    className="w-8 h-8 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${message.agent.imageUrl})` }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center p-1.5">
                    <img src={openAiLogo} alt="OpenAI" className="w-full h-full" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                    {message.agent.type === 'user' ? message.agent.name : 'ChatGPT'}
                    {!message.isComplete && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {message.body}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 dark:from-gray-900 pt-6 pb-8">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await sendMessage({
              body: newMessageText,
            });
            setNewMessageText('');
          }}
          className="max-w-3xl mx-auto px-4"
        >
          <div className="relative">
            <input
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Write a message…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 pr-12 text-sm focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-400 dark:text-gray-100 dark:placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!newMessageText}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
