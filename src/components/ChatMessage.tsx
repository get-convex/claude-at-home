import { Loader2, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import openAiLogo from '../assets/openai-white-logomark.svg';
import { Message } from '../types';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useState } from 'react';

interface ToolUse {
  _id: Id<'toolUsage'>;
  messageId: Id<'messages'>;
  toolName: string;
  toolArgs: string;
  status:
    | { type: 'generating' }
    | { type: 'inProgress' }
    | { type: 'success'; result: string }
    | { type: 'error'; error: string };
}

const getHumanToolName = (toolName: string): string => {
  switch (toolName) {
    case 'queryMemory':
      return 'Searching memory';
    case 'tavilySearch':
      return 'Searching the web';
    case 'tavilyQna':
      return 'Asking the web';
    case 'tavilyExtract':
      return 'Reading webpage';
    default:
      return toolName;
  }
};

function SingleToolUse({ tool }: { tool: ToolUse }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const humanName = getHumanToolName(tool.toolName);

  return (
    <div className="border-b last:border-b-0 py-1.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded px-2 py-1"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <span className="flex-1 text-gray-700 dark:text-gray-300">{humanName}</span>
        <div className="flex items-center">
          {(tool.status.type === 'generating' || tool.status.type === 'inProgress') && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
          )}
          {tool.status.type === 'success' && (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          {tool.status.type === 'error' && (
            <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="px-8 py-2 space-y-2">
          {tool.toolArgs && (
            <div className="text-gray-600 dark:text-gray-400 font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all">{tool.toolArgs}</pre>
            </div>
          )}
          {tool.status.type === 'success' && (
            <div className="text-gray-700 dark:text-gray-300 font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all">{tool.status.result}</pre>
            </div>
          )}
          {tool.status.type === 'error' && (
            <div className="text-red-600 dark:text-red-400 font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all">Error: {tool.status.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolUseVisualizer({ messageId }: { messageId: Id<'messages'> }) {
  const toolUses = useQuery(api.messages.listToolUses, { messageId });

  if (!toolUses || toolUses.length === 0) return null;

  return (
    <div className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-md text-sm divide-gray-200 dark:divide-gray-700">
      {toolUses.map((tool: ToolUse) => (
        <SingleToolUse key={tool._id} tool={tool} />
      ))}
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <article className="py-6 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-start gap-4">
        {message.agent.type === 'user' ? (
          <div
            className="w-8 h-8 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${message.agent.imageUrl})` }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center p-1.5 min-w-[32px]">
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
            <ToolUseVisualizer messageId={message._id} />
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: ({ inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter {...props} style={oneDark} language={match[1]} PreTag="div">
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </article>
  );
}
