import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from './ui/button';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Conversation } from '../types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: Id<'conversations'> | null;
  onSelectConversation: (id: Id<'conversations'>) => void;
}

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  previousWeek: Conversation[];
  older: Conversation[];
}

function groupConversationsByDate(conversations: Conversation[]): GroupedConversations {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return conversations.reduce(
    (groups, conversation) => {
      const date = new Date(conversation._creationTime);
      if (date >= today) {
        groups.today.push(conversation);
      } else if (date >= yesterday) {
        groups.yesterday.push(conversation);
      } else if (date >= weekAgo) {
        groups.previousWeek.push(conversation);
      } else {
        groups.older.push(conversation);
      }
      return groups;
    },
    { today: [], yesterday: [], previousWeek: [], older: [] } as GroupedConversations
  );
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [editingConversationId, setEditingConversationId] = useState<Id<'conversations'> | null>(
    null
  );
  const [editingName, setEditingName] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Id<'conversations'> | null>(
    null
  );

  const createConversation = useMutation(api.conversations.create);
  const updateConversation = useMutation(api.conversations.update);
  const deleteConversation = useMutation(api.conversations.remove);

  const groupedConversations = groupConversationsByDate(conversations);

  const handleNewConversation = async () => {
    const id = await createConversation({});
    onSelectConversation(id);
  };

  const handleUpdateConversation = async (id: Id<'conversations'>) => {
    await updateConversation({ id, name: editingName });
    setEditingConversationId(null);
    setEditingName('');
  };

  const handleDeleteClick = (conversationId: Id<'conversations'>) => {
    setConversationToDelete(conversationId);
    setIsDeleteModalOpen(true);
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && editingConversationId) {
      setEditingConversationId(null);
      setEditingName('');
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [editingConversationId]);

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <div
      key={conversation._id}
      className={`rounded-lg relative group ${
        selectedConversationId === conversation._id
          ? 'bg-white dark:bg-gray-700'
          : 'hover:bg-white dark:hover:bg-gray-700'
      } p-2`}
    >
      {editingConversationId === conversation._id ? (
        <input
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleUpdateConversation(conversation._id);
            }
          }}
          onBlur={() => {
            setEditingConversationId(null);
            setEditingName('');
          }}
          className="w-full bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100"
          autoFocus
        />
      ) : (
        <>
          <button
            onClick={() => onSelectConversation(conversation._id)}
            className="w-full text-left truncate text-gray-900 dark:text-gray-100 pr-16"
          >
            {conversation.name || 'New Chat'}
          </button>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 invisible group-hover:visible">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingConversationId(conversation._id);
                setEditingName(conversation.name || '');
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-400"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(conversation._id);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConversationToDelete(null);
        }}
        onConfirm={() => {
          if (conversationToDelete) {
            deleteConversation({ id: conversationToDelete });
          }
        }}
        conversationName={conversations.find((c) => c._id === conversationToDelete)?.name || ''}
      />

      <div className="flex flex-col px-4">
        <Button
          onClick={handleNewConversation}
          className="w-full mb-6 mt-4 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
        >
          <Plus className="w-4 h-4 mr-2" /> New Chat
        </Button>

        <div className="space-y-6">
          {groupedConversations.today.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                Today
              </h2>
              <div className="space-y-1">
                {groupedConversations.today.map((conversation) => (
                  <ConversationItem key={conversation._id} conversation={conversation} />
                ))}
              </div>
            </div>
          )}

          {groupedConversations.yesterday.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                Yesterday
              </h2>
              <div className="space-y-1">
                {groupedConversations.yesterday.map((conversation) => (
                  <ConversationItem key={conversation._id} conversation={conversation} />
                ))}
              </div>
            </div>
          )}

          {groupedConversations.previousWeek.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                Previous 7 Days
              </h2>
              <div className="space-y-1">
                {groupedConversations.previousWeek.map((conversation) => (
                  <ConversationItem key={conversation._id} conversation={conversation} />
                ))}
              </div>
            </div>
          )}

          {groupedConversations.older.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                Older
              </h2>
              <div className="space-y-1">
                {groupedConversations.older.map((conversation) => (
                  <ConversationItem key={conversation._id} conversation={conversation} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
