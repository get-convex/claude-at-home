import { Send } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface ChatInputProps {
  conversationId: Id<'conversations'>;
}

export function ChatInput({ conversationId }: ChatInputProps) {
  const [newMessageText, setNewMessageText] = useState('');
  const sendMessage = useMutation(api.messages.send);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage({
      conversationId,
      body: newMessageText,
    });
    setNewMessageText('');
  };

  return (
    <div className="bg-gradient-to-t from-white dark:from-gray-900 pt-6 pb-8">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4">
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
  );
}
