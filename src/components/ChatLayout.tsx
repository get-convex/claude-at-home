import { useEffect, useState } from 'react';
import { useQuery } from 'convex-helpers/react/cache';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import 'katex/dist/katex.min.css';

// Define conversation type to match both preloaded and live data
type Conversation = {
  _id: Id<'conversations'>;
  name?: string;
  creatorId: Id<'users'>;
  _creationTime: number;
};

interface ChatLayoutProps {
  preloadedConversations?: Conversation[];
}

export function ChatLayout({ preloadedConversations }: ChatLayoutProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<Id<'conversations'> | null>(
    null
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Use preloaded data as fallback for initial render
  const liveConversations = useQuery(api.conversations.list);
  const conversations: Conversation[] = liveConversations ?? preloadedConversations ?? [];
  const messages = useQuery(
    api.messages.list,
    selectedConversationId ? { conversationId: selectedConversationId } : 'skip'
  );

  // Set initial conversation from preloaded data or live data
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0]._id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    const lastMessage = messages && messages[messages.length - 1];
    if (lastMessage && lastMessage.state.type === 'generating') {
      const chatContainer = document.querySelector('.chat-messages-container');
      if (chatContainer) {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-1 h-full">
      <ConversationSidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={(args) => {
          setSelectedConversationId(args);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className="flex-1 relative bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
        <div className="absolute inset-0 flex flex-col pt-12">
          <div className="flex-1 overflow-y-auto chat-messages-container">
            <div className="max-w-3xl mx-auto px-4">
              {selectedConversationId &&
                messages &&
                messages.map((message) => <ChatMessage key={message._id} message={message} />)}
            </div>
          </div>

          {selectedConversationId && <ChatInput conversationId={selectedConversationId} />}
        </div>
      </div>
    </div>
  );
}
