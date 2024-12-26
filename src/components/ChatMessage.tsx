import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import openAiLogo from '../assets/openai-white-logomark.svg';
import { Message } from '../types';

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
