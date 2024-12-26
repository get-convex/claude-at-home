import { Button } from '@/components/ui/button';
import { SignInButton, UserButton } from '@clerk/clerk-react';
import { Authenticated, Unauthenticated, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useEffect, useState } from 'react';
import { Send, Loader2, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import openAiLogo from './assets/openai-white-logomark.svg';
import { ThemeSwitcher } from './components/theme-switcher';
import { Id } from '../convex/_generated/dataModel';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';

export default function App() {
  return (
    <main className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeSwitcher />
        <UserButton afterSignOutUrl="#" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-4xl font-extrabold my-8 text-center text-gray-800 dark:text-gray-100">
          "We have Claude at home"
        </h1>
        <hr className="border-gray-200 dark:border-gray-700" />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <Authenticated>
          <SignedIn />
        </Authenticated>
        <Unauthenticated>
          <div className="flex justify-center mt-8">
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
  const [selectedConversationId, setSelectedConversationId] = useState<Id<'conversations'> | null>(
    null
  );
  const [editingConversationId, setEditingConversationId] = useState<Id<'conversations'> | null>(
    null
  );
  const [editingName, setEditingName] = useState('');
  const conversations = useQuery(api.conversations.list) ?? [];
  const messages =
    useQuery(
      api.messages.list,
      selectedConversationId ? { conversationId: selectedConversationId } : 'skip'
    ) ?? [];
  const createConversation = useMutation(api.conversations.create);
  const updateConversation = useMutation(api.conversations.update);
  const deleteConversation = useMutation(api.conversations.remove);
  const sendMessage = useMutation(api.messages.send);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Id<'conversations'> | null>(
    null
  );

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0]._id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.isComplete) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleNewConversation = async () => {
    const id = await createConversation({});
    setSelectedConversationId(id);
  };

  const handleUpdateConversation = async (id: Id<'conversations'>) => {
    await updateConversation({ id, name: editingName });
    setEditingConversationId(null);
    setEditingName('');
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

  const handleDeleteClick = (conversationId: Id<'conversations'>) => {
    setConversationToDelete(conversationId);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="flex flex-1">
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
      {/* Sidebar with collapse button */}
      <div
        className={`${
          isSidebarCollapsed ? 'w-0' : 'w-80'
        } border-r border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-hidden transition-all duration-300 relative`}
      >
        <div
          className={`${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'} p-4 transition-opacity duration-300`}
        >
          <Button
            onClick={handleNewConversation}
            className="w-full mb-4 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
          >
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
          <div className="space-y-1">
            {conversations.map((conversation) => (
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
                      onClick={() => setSelectedConversationId(conversation._id)}
                      className="w-full text-left truncate text-gray-900 dark:text-gray-100 pr-16"
                    >
                      {conversation.name || 'New Chat'}
                    </button>
                    {editingConversationId !== conversation._id && (
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
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative bg-white dark:bg-gray-900">
        {/* Move collapse button to left edge */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute top-1/2 -translate-y-1/2 ${
            isSidebarCollapsed ? 'left-2' : 'left-[-12px]'
          } z-10 p-1 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700`}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        <div className="absolute inset-0 flex flex-col pt-12">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4">
              {selectedConversationId ? (
                messages.map((message) => (
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
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">
                    Select or create a conversation to start chatting
                  </p>
                </div>
              )}
            </div>
          </div>

          {selectedConversationId && (
            <div className="bg-gradient-to-t from-white dark:from-gray-900 pt-6 pb-8">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (selectedConversationId) {
                    await sendMessage({
                      conversationId: selectedConversationId,
                      body: newMessageText,
                    });
                    setNewMessageText('');
                  }
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
          )}
        </div>
      </div>
    </div>
  );
}
