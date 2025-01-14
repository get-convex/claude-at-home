import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';
import { ConversationList } from './ConversationList';
import { Conversation } from '../types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedConversationId: Id<'conversations'> | null;
  onSelectConversation: (id: Id<'conversations'>) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ConversationSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  isCollapsed,
  onToggleCollapse,
}: ConversationSidebarProps) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${isCollapsed ? 'w-0' : 'w-80'} overflow-hidden transition-all duration-300`}
      >
        <div
          className={`${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'} transition-opacity duration-300`}
        >
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={onSelectConversation}
          />
        </div>
      </div>

      <button
        onClick={onToggleCollapse}
        className={`absolute top-1/2 -translate-y-1/2 ${
          isCollapsed ? '-right-3' : '-right-3'
        } z-40 p-1 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700`}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>
    </div>
  );
}
