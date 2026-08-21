"use client";

import { useState, useEffect } from "react";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { MemoryBadge } from "@/components/memory-badge";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatHeader } from "@/components/chat-header";
import { MemoryStorageService } from "@/lib/memory-storage";
import { MemorySummarizationService } from "@/lib/memory-summarization";
import { TitleGenerationService } from "@/lib/title-generation";
import { ConversationMemory, ChatMessage as MemoryChatMessage } from "@/lib/memory-types";

interface ChatMessageType {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<ConversationMemory | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  const memoryStorage = MemoryStorageService.getInstance();
  const summarizationService = MemorySummarizationService.getInstance();
  const titleGenerationService = TitleGenerationService.getInstance();

  useEffect(() => {
    const initializeConversation = () => {
      let conversation = memoryStorage.getCurrentConversation();

      if (!conversation) {
        const savedContext = localStorage.getItem("chat_context") || "";
        conversation = memoryStorage.createConversation(savedContext);
      } else {
        const latestContext = localStorage.getItem("chat_context") || "";

        if (latestContext !== conversation.context) {
          conversation.context = latestContext;
          memoryStorage.updateConversation(conversation);
        }
      }

      setCurrentConversation(conversation);

      const displayMessages: ChatMessageType[] = conversation.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.isUser,
        timestamp: new Date(msg.timestamp),
      }));

      setMessages(displayMessages);
    };

    initializeConversation();
  }, [memoryStorage]);

  useEffect(() => {
    const handleContextChange = () => {
      const latestContext = localStorage.getItem("chat_context") || "";

      if (currentConversation) {
        currentConversation.context = latestContext;
        memoryStorage.updateConversation(currentConversation);
      }
    };

    window.addEventListener("storage", handleContextChange);
    window.addEventListener("contextUpdated", handleContextChange);

    return () => {
      window.removeEventListener("storage", handleContextChange);
      window.removeEventListener("contextUpdated", handleContextChange);
    };
  }, [currentConversation, memoryStorage]);

  const handleSummarization = async () => {
    if (!currentConversation || isSummarizing) return;

    setIsSummarizing(true);

    try {
      const { oldMessages, recentMessages } = memoryStorage.getMessagesForSummarization();

      if (oldMessages.length === 0) {
        setIsSummarizing(false);
        return;
      }

      const selectedProvider = localStorage.getItem("selected_provider") || "gemini";
      const apiKey =
        selectedProvider === "gemini"
          ? localStorage.getItem("gemini_api_key")
          : localStorage.getItem("openai_api_key");

      if (!apiKey) {
        setIsSummarizing(false);
        return;
      }

      const result = await summarizationService.summarizeConversation(
        oldMessages,
        currentConversation.context,
        apiKey,
        selectedProvider
      );

      const updatedConversation = {
        ...currentConversation,
        summary: result.summary,
        messages: [...recentMessages],
        totalWords:
          result.totalWords +
          recentMessages.reduce((sum, msg) => sum + msg.content.split(/\s+/).length, 0),
        lastSummarizedAt: new Date(),
        isSummarizing: false,
      };

      memoryStorage.updateConversation(updatedConversation);
      setCurrentConversation(updatedConversation);

      const displayMessages: ChatMessageType[] = recentMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.isUser,
        timestamp: new Date(msg.timestamp),
      }));

      setMessages(displayMessages);
    } catch (error) {
      console.error("Summarization failed:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const generateTitle = async (firstMessage: string) => {
    if (!currentConversation || currentConversation.title !== "New Chat") return;

    setIsGeneratingTitle(true);

    try {
      const selectedProvider = localStorage.getItem("selected_provider") || "gemini";
      const apiKey =
        selectedProvider === "gemini"
          ? localStorage.getItem("gemini_api_key")
          : localStorage.getItem("openai_api_key");

      if (!apiKey) {
        return;
      }

      const title = await titleGenerationService.generateTitle(firstMessage, apiKey, selectedProvider);
      memoryStorage.updateConversationTitle(currentConversation.id, title);

      const updatedConversation = {
        ...currentConversation,
        title: title,
      };
      setCurrentConversation(updatedConversation);

      setSidebarRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Title generation failed:", error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleNewChat = () => {
    const savedContext = localStorage.getItem("chat_context") || "";
    const newConversation = memoryStorage.createConversation(savedContext);

    setCurrentConversation(newConversation);
    setMessages([]);
    setIsSidebarOpen(false);

    setSidebarRefreshTrigger((prev) => prev + 1);
  };

  const handleConversationSelect = (conversation: ConversationMemory) => {
    setCurrentConversation(conversation);

    const displayMessages: ChatMessageType[] = conversation.messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      isUser: msg.isUser,
      timestamp: new Date(msg.timestamp),
    }));

    setMessages(displayMessages);
    setIsSidebarOpen(false);
  };

  const handleConversationDelete = (conversationId: string) => {
    if (currentConversation?.id === conversationId) {
      handleNewChat();
    }
  };

  const handleConversationRename = (conversationId: string, newTitle: string) => {
    if (currentConversation?.id === conversationId) {
      setCurrentConversation((prev) => (prev ? { ...prev, title: newTitle } : null));
    }

    setSidebarRefreshTrigger((prev) => prev + 1);
  };

  const handleSendMessage = async (message: string) => {
    if (!currentConversation) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
      timestamp: new Date(),
    };

    const memoryUserMessage: MemoryChatMessage = {
      id: userMessage.id,
      content: userMessage.content,
      isUser: userMessage.isUser,
      timestamp: userMessage.timestamp,
    };

    const isFirstMessage = currentConversation.messages.length === 0;

    memoryStorage.addMessage(memoryUserMessage);
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (isFirstMessage) {
      generateTitle(message);
    }

    try {
      const selectedProvider = localStorage.getItem("selected_provider") || "gemini";
      const apiKey =
        selectedProvider === "gemini"
          ? localStorage.getItem("gemini_api_key")
          : localStorage.getItem("openai_api_key");

      if (!apiKey) {
        const errorMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          content: `Please add your ${selectedProvider} API key in the settings dialog.`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      if (memoryStorage.needsSummarization()) {
        await handleSummarization();
      }

      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: ChatMessageType = {
        id: aiMessageId,
        content: "",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      const conversation = memoryStorage.getCurrentConversation();

      const latestContext = localStorage.getItem("chat_context") || "";
      let fullContext = latestContext || conversation?.context || "";

      if (conversation?.summary) {
        fullContext += `\n\nPrevious conversation summary: ${conversation.summary}`;
      }

      if (conversation?.messages && conversation.messages.length > 0) {
        const conversationHistory = conversation.messages
          .map((msg) => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n\n");

        fullContext += `\n\nRecent conversation history:\n${conversationHistory}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          context: fullContext,
          apiKey: apiKey,
          selectedProvider: selectedProvider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, content: `Error: ${errorData.error}` } : msg))
        );
        return;
      }

      const data = await response.json();

      if (data.error) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, content: `Error: ${data.error}` } : msg))
        );
      } else {
        const words = data.message.split(" ");
        let currentContent = "";

        for (let i = 0; i < words.length; i++) {
          currentContent += words[i] + (i < words.length - 1 ? " " : "");

          setMessages((prev) =>
            prev.map((msg) => (msg.id === aiMessageId ? { ...msg, content: currentContent } : msg))
          );

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const memoryAiMessage: MemoryChatMessage = {
          id: aiMessageId,
          content: data.message,
          isUser: false,
          timestamp: new Date(),
        };

        memoryStorage.addMessage(memoryAiMessage);
      }
    } catch {
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        content: "Failed to send message. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background w-full">
      <ChatHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentConversation={currentConversation}
        isGeneratingTitle={isGeneratingTitle}
      />

      <div className="flex-1 flex relative">
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentConversationId={currentConversation?.id || null}
          onConversationSelect={handleConversationSelect}
          onNewChat={handleNewChat}
          onConversationDelete={handleConversationDelete}
          onConversationRename={handleConversationRename}
          refreshTrigger={sidebarRefreshTrigger}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <MemoryBadge
            isSummarizing={isSummarizing}
            totalWords={currentConversation?.totalWords || 0}
            maxWords={262144}
          />

          {messages.length === 0 && (
            <>
              <svg
                className="pointer-events-none absolute top-0 left-0 w-48 h-48 opacity-40 select-none"
                viewBox="0 0 200 200"
                fill="none"
              >
                <path
                  d="M20 10 Q10 60 30 100 Q45 130 20 170"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <ellipse cx="35" cy="35" rx="16" ry="9" fill="var(--primary)" opacity="0.5" transform="rotate(-30 35 35)" />
                <ellipse cx="18" cy="65" rx="16" ry="9" fill="var(--primary)" opacity="0.4" transform="rotate(30 18 65)" />
                <ellipse cx="42" cy="90" rx="14" ry="8" fill="var(--primary)" opacity="0.5" transform="rotate(-20 42 90)" />
                <ellipse cx="15" cy="120" rx="15" ry="8" fill="var(--primary)" opacity="0.4" transform="rotate(25 15 120)" />
                <ellipse cx="38" cy="150" rx="13" ry="7" fill="var(--primary)" opacity="0.45" transform="rotate(-15 38 150)" />
              </svg>

              <svg
                className="pointer-events-none absolute bottom-20 right-0 w-56 h-56 opacity-30 select-none"
                viewBox="0 0 200 200"
                fill="none"
              >
                <path
                  d="M180 190 Q190 140 165 100 Q150 70 175 30"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <ellipse cx="163" cy="165" rx="17" ry="9" fill="var(--primary)" opacity="0.5" transform="rotate(30 163 165)" />
                <ellipse cx="182" cy="135" rx="16" ry="9" fill="var(--primary)" opacity="0.4" transform="rotate(-30 182 135)" />
                <ellipse cx="158" cy="108" rx="14" ry="8" fill="var(--primary)" opacity="0.5" transform="rotate(20 158 108)" />
                <ellipse cx="185" cy="78" rx="15" ry="8" fill="var(--primary)" opacity="0.4" transform="rotate(-25 185 78)" />
                <ellipse cx="162" cy="48" rx="13" ry="7" fill="var(--primary)" opacity="0.45" transform="rotate(15 162 48)" />
              </svg>
            </>
          )}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-4xl mb-6">
                    👋
                  </div>
                  <h1 className="text-6xl font-bold text-primary mb-3 font-cursive">Hello!</h1>
                  <p className="text-muted-foreground text-lg mb-6">
                    I&apos;m your AI Mentor. How can I assist you today?
                  </p>

                  <div className="flex items-center gap-3 mb-10 w-full max-w-xs">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-primary">♥</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                    <button className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-2xl">
                        💬
                      </div>
                      <div>
                        <p className="font-semibold">Chat</p>
                        <p className="text-xs text-muted-foreground">Start a conversation</p>
                      </div>
                    </button>

                    <button className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-2xl">
                        🎙️
                      </div>
                      <div>
                        <p className="font-semibold">Voice Chat</p>
                        <p className="text-xs text-muted-foreground">Speak with AI</p>
                      </div>
                    </button>

                    <button className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-2xl">
                        📄
                      </div>
                      <div>
                        <p className="font-semibold">Documents</p>
                        <p className="text-xs text-muted-foreground">Upload &amp; analyze</p>
                      </div>
                    </button>

                    <button className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-2xl">
                        🖼️
                      </div>
                      <div>
                        <p className="font-semibold">Images</p>
                        <p className="text-xs text-muted-foreground">Generate images</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage key={msg.id} id={msg.id} content={msg.content} isUser={msg.isUser} timestamp={msg.timestamp} />
                ))
              )}
            </div>
          </div>

          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}