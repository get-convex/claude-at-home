import { Loader2, ChevronRight, ChevronDown, Check, X, Settings2, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import openAiLogo from '../assets/openai-white-logomark.svg';
import { Message } from '../types';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useRef, useState } from 'react';
import { Tooltip } from './Tooltip';

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
    case 'createSandbox':
      return 'Creating sandbox';
    case 'terminateSandbox':
      return 'Terminating sandbox';
    case 'execCommand':
      return 'Executing command';
    case 'readFile':
      return 'Reading file';
    case 'writeFile':
      return 'Writing file';
    default:
      return toolName;
  }
};

function tolerantParse(json: string) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return JSON.parse(json + '"}');
  }
}

function SingleToolUse({ tool }: { tool: ToolUse }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const humanName = getHumanToolName(tool.toolName);

  const lastParsed = useRef<any>(null);

  const renderToolContent = () => {
    console.log(tool.toolArgs);
    let args = null;
    let error = null;
    try {
      args = tolerantParse(tool.toolArgs);
      lastParsed.current = args;
    } catch (e) {
      error = e;
      args = lastParsed.current;
    }
    try {
      if (args === null) {
        throw error ?? new Error('Failed to parse tool arguments');
      }

      // Hide content for sandbox operations in the default view
      if (tool.toolName === 'createSandbox' || tool.toolName === 'terminateSandbox') {
        return null;
      }

      if (tool.toolName === 'writeFile') {
        const path = args.path ?? '';
        const contents = args.contents ?? '';

        const extension = path?.split('.').pop()?.toLowerCase();
        const language =
          extension === 'py'
            ? 'python'
            : extension === 'js'
              ? 'javascript'
              : extension === 'ts'
                ? 'typescript'
                : extension === 'json'
                  ? 'json'
                  : extension === 'md'
                    ? 'markdown'
                    : extension === 'sh'
                      ? 'bash'
                      : 'text';

        return (
          <div className="space-y-2">
            {path && (
              <div className="text-gray-600 dark:text-gray-400">
                Path:{' '}
                <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded">
                  {path}
                </code>
              </div>
            )}
            {contents && (
              <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{ fontSize: '0.75rem', padding: '0.5rem' }}
              >
                {contents}
              </SyntaxHighlighter>
            )}
          </div>
        );
      }

      if (tool.toolName === 'execCommand') {
        return (
          <div className="space-y-2">
            <div className="font-mono text-xs bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-2 rounded border border-gray-200 dark:border-gray-700">
              $ {args.command.join(' ')}
            </div>
            {tool.status.type === 'success' && (
              <div className="font-mono text-xs">
                {tool.status.result && (
                  <div className="space-y-1">
                    {(() => {
                      const result = JSON.parse(tool.status.result);
                      return (
                        <>
                          {result.stdout && (
                            <pre className="whitespace-pre-wrap break-all bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                              {result.stdout}
                            </pre>
                          )}
                          {result.stderr && (
                            <pre className="whitespace-pre-wrap break-all bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300">
                              {result.stderr}
                            </pre>
                          )}
                          {result.returncode !== 0 && (
                            <div className="text-red-600 dark:text-red-400">
                              Exit code: {result.returncode}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      // Default rendering for other tools
      return (
        <>
          {tool.toolArgs && (
            <div className="font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                {tool.toolArgs}
              </pre>
            </div>
          )}
          {tool.status.type === 'success' && (
            <div className="font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                {tool.status.result}
              </pre>
            </div>
          )}
          {tool.status.type === 'error' && (
            <div className="font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-900/50">
                Error: {tool.status.error}
              </pre>
            </div>
          )}
        </>
      );
    } catch (e) {
      // Fallback rendering if JSON parsing fails (e.g. during streaming)
      return (
        <>
          {tool.toolArgs && (
            <div className="text-gray-600 dark:text-gray-400 font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                {tool.toolArgs}
              </pre>
            </div>
          )}
          {tool.status.type === 'success' && (
            <div className="text-gray-700 dark:text-gray-300 font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                {tool.status.result}
              </pre>
            </div>
          )}
          {tool.status.type === 'error' && (
            <div className="text-red-600 dark:text-red-400 font-mono text-xs max-w-3xl overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-900/50">
                Error: {tool.status.error}
              </pre>
            </div>
          )}
        </>
      );
    }
  };

  const renderRawDataModal = () => {
    if (!showRawData) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
        onClick={() => setShowRawData(false)}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Raw Tool Data</h3>
            <button
              onClick={() => setShowRawData(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4 overflow-auto max-h-[calc(80vh-8rem)]">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tool Arguments
              </h4>
              <pre className="text-gray-700 dark:text-gray-300 text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
                {tool.toolArgs}
              </pre>
            </div>
            {tool.status.type === 'success' && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tool Result
                </h4>
                <pre className="text-gray-700 dark:text-gray-300 text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
                  {tool.status.result}
                </pre>
              </div>
            )}
            {tool.status.type === 'error' && (
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Error</h4>
                <pre className="text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-900/50 overflow-auto">
                  {tool.status.error}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRawData(true);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <Settings2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
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
      {isExpanded && <div className="px-8 py-2 space-y-2">{renderToolContent()}</div>}
      {renderRawDataModal()}
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
  const cancel = useMutation(api.messages.cancel);
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
          <div className="font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {message.agent.type === 'user' ? message.agent.name : 'ChatGPT'}
              {message.state.type === 'generating' && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              )}
              {message.state.type === 'error' && (
                <Tooltip content={message.state.error}>
                  <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                </Tooltip>
              )}
            </div>
            {message.state.type === 'generating' && (
              <button
                onClick={() => cancel({ messageId: message._id })}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Cancel generation"
              >
                <XCircle className="w-5 h-5" />
              </button>
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
