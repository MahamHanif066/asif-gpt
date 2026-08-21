import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LoadingDots } from "./loading-dots";
import { Sparkles } from "lucide-react";

interface ChatMessageProps {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatMessage({ content, isUser }: ChatMessageProps) {
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 shrink-0 rounded-full bg-accent flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <div
        className={`rounded-2xl px-4 py-2.5 max-w-[80%] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none">
            {content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="bg-accent text-primary px-1 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className="block bg-accent text-primary p-2 rounded text-xs font-mono overflow-x-auto">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-accent p-2 rounded text-xs font-mono overflow-x-auto mb-2">
                      {children}
                    </pre>
                  ),
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-4 italic mb-2">
                      {children}
                    </blockquote>
                  ),
                  a: ({ children, href }) => (
                    <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center">
                <LoadingDots className="text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}