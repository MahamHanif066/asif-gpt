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

  // Initialize conversation and load context
  useEffect(() => {
    const initializeConversation = () => {
      let conversation = memoryStorage.getCurrentConversation();
      
      if (!conversation) {
        // Load user context from localStorage
        const savedContext = localStorage.getItem('chat_context') || '';
        conversation = memoryStorage.createConversation(savedContext);
      } else {
        // Always use the latest context from localStorage
        const latestContext = localStorage.getItem('chat_context') || '';
        
        // Update conversation context if it's different
        if (latestContext !== conversation.context) {
          conversation.context = latestContext;
          memoryStorage.updateConversation(conversation);
        }
      }
      
      setCurrentConversation(conversation);
      
      // Convert memory messages to display messages
      const displayMessages: ChatMessageType[] = conversation.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.isUser,
        timestamp: new Date(msg.timestamp)
      }));
      
      setMessages(displayMessages);
    };

    initializeConversation();
  }, [memoryStorage]);

  // Listen for context changes
  useEffect(() => {
    const handleContextChange = () => {
      const latestContext = localStorage.getItem('chat_context') || '';
      
      // Update current conversation context if it exists
      if (currentConversation) {
        currentConversation.context = latestContext;
        memoryStorage.updateConversation(currentConversation);
      }
    };

    // Listen for storage changes
    window.addEventListener('storage', handleContextChange);
    
    // Also listen for custom context update events
    window.addEventListener('contextUpdated', handleContextChange);
    
    return () => {
      window.removeEventListener('storage', handleContextChange);
      window.removeEventListener('contextUpdated', handleContextChange);
    };
  }, [currentConversation, memoryStorage]);

  // Handle summarization when needed
  const handleSummarization = async () => {
    if (!currentConversation || isSummarizing) return;

    setIsSummarizing(true);
    
    try {
      const { oldMessages, recentMessages } = memoryStorage.getMessagesForSummarization();
      
      if (oldMessages.length === 0) {
        setIsSummarizing(false);
        return;
      }

      // Get API key and provider
      const selectedProvider = localStorage.getItem('selected_provider') || 'gemini';
      const apiKey = selectedProvider === 'gemini' 
        ? localStorage.getItem('gemini_api_key')
        : localStorage.getItem('openai_api_key');

      if (!apiKey) {
        setIsSummarizing(false);
        return;
      }

      // Summarize old messages
      const result = await summarizationService.summarizeConversation(
        oldMessages,
        currentConversation.context,
        apiKey,
        selectedProvider
      );

      // Update conversation with summary
      const updatedConversation = {
        ...currentConversation,
        summary: result.summary,
        messages: [...recentMessages], // Keep only recent messages
        totalWords: result.totalWords + recentMessages.reduce((sum, msg) => sum + msg.content.split(/\s+/).length, 0),
        lastSummarizedAt: new Date(),
        isSummarizing: false
      };

      memoryStorage.updateConversation(updatedConversation);
      setCurrentConversation(updatedConversation);

      // Update display messages
      const displayMessages: ChatMessageType[] = recentMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.isUser,
        timestamp: new Date(msg.timestamp)
      }));
      
      setMessages(displayMessages);
      
    } catch (error) {
      console.error('Summarization failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Generate title for conversation
  const generateTitle = async (firstMessage: string) => {
    if (!currentConversation || currentConversation.title !== 'New Chat') return;

    setIsGeneratingTitle(true);
    
    try {
      const selectedProvider = localStorage.getItem('selected_provider') || 'gemini';
      const apiKey = selectedProvider === 'gemini' 
        ? localStorage.getItem('gemini_api_key')
        : localStorage.getItem('openai_api_key');

      if (!apiKey) {
        return;
      }

      const title = await titleGenerationService.generateTitle(
        firstMessage,
        apiKey,
        selectedProvider
      );
      memoryStorage.updateConversationTitle(currentConversation.id, title);
      
      // Update current conversation
      const updatedConversation = {
        ...currentConversation,
        title: title
      };
      setCurrentConversation(updatedConversation);
      
      // Force sidebar to refresh
      setSidebarRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('Title generation failed:', error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // Handle new chat
  const handleNewChat = () => {
    const savedContext = localStorage.getItem('chat_context') || '';
    const newConversation = memoryStorage.createConversation(savedContext);
    
    setCurrentConversation(newConversation);
    setMessages([]);
    setIsSidebarOpen(false);
    
    // Refresh sidebar to show new chat
    setSidebarRefreshTrigger(prev => prev + 1);
  };

  // Handle conversation selection
  const handleConversationSelect = (conversation: ConversationMemory) => {
    setCurrentConversation(conversation);
    
    // Convert memory messages to display messages
    const displayMessages: ChatMessageType[] = conversation.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isUser: msg.isUser,
      timestamp: new Date(msg.timestamp)
    }));
    
    setMessages(displayMessages);
    setIsSidebarOpen(false);
  };

  // Handle conversation delete
  const handleConversationDelete = (conversationId: string) => {
    if (currentConversation?.id === conversationId) {
      // If deleting current conversation, start a new one
      handleNewChat();
    }
  };

  // Handle conversation rename
  const handleConversationRename = (conversationId: string, newTitle: string) => {
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : null);
    }
    
    // Refresh sidebar to show updated title
    setSidebarRefreshTrigger(prev => prev + 1);
  };

  const handleSendMessage = async (message: string) => {
    if (!currentConversation) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
      timestamp: new Date()
    };
    
    // Add user message to memory and display
    const memoryUserMessage: MemoryChatMessage = {
      id: userMessage.id,
      content: userMessage.content,
      isUser: userMessage.isUser,
      timestamp: userMessage.timestamp
    };
    
    // Check if this is the first message before adding it
    const isFirstMessage = currentConversation.messages.length === 0;
    
    memoryStorage.addMessage(memoryUserMessage);
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Generate title if this is the first message
    if (isFirstMessage) {
      generateTitle(message);
    }
    
    try {
      // Get selected provider and API key from localStorage
      const selectedProvider = localStorage.getItem('selected_provider') || 'gemini';
      const apiKey = selectedProvider === 'gemini' 
        ? localStorage.getItem('gemini_api_key')
        : localStorage.getItem('openai_api_key');

      if (!apiKey) {
        const errorMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          content: `Please add your ${selectedProvider} API key in the settings dialog.`,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Check if summarization is needed
      if (memoryStorage.needsSummarization()) {
        await handleSummarization();
      }

      // Create AI message placeholder for streaming
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: ChatMessageType = {
        id: aiMessageId,
        content: '',
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);

      // Prepare context for API call (include conversation history and summary)
      const conversation = memoryStorage.getCurrentConversation();
      
      // Get the latest context from localStorage (user might have updated it)
      const latestContext = localStorage.getItem('chat_context') || '';
      let fullContext = latestContext || conversation?.context || '';
      
      // Add conversation summary if available
      if (conversation?.summary) {
        fullContext += `\n\nPrevious conversation summary: ${conversation.summary}`;
      }
      
      // Add recent conversation history
      if (conversation?.messages && conversation.messages.length > 0) {
        const conversationHistory = conversation.messages
          .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        
        fullContext += `\n\nRecent conversation history:\n${conversationHistory}`;
      }

      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          context: fullContext,
          apiKey: apiKey,
          selectedProvider: selectedProvider
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: `Error: ${errorData.error}` }
            : msg
        ));
        return;
      }

      // Handle JSON response
      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: `Error: ${data.error}` }
            : msg
        ));
      } else {
        // Simulate streaming by showing words one by one
        const words = data.message.split(' ');
        let currentContent = '';
        
        for (let i = 0; i < words.length; i++) {
          currentContent += words[i] + (i < words.length - 1 ? ' ' : '');
          
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: currentContent }
              : msg
          ));
          
          // Add a small delay between words to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Add AI message to memory
        const memoryAiMessage: MemoryChatMessage = {
          id: aiMessageId,
          content: data.message,
          isUser: false,
          timestamp: new Date()
        };
        
        memoryStorage.addMessage(memoryAiMessage);
      }
    } catch {
      // Add error message
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        content: 'Failed to send message. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background w-full">
      {/* Header - Full Width */}
      <ChatHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentConversation={currentConversation}
        isGeneratingTitle={isGeneratingTitle}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* Sidebar */}
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

        {/* Chat Content */}
        <div className="flex-1 flex flex-col">
          {/* Memory Badge */}
          <MemoryBadge 
            isSummarizing={isSummarizing}
            totalWords={currentConversation?.totalWords || 0}
            maxWords={262144}
          />

          {/* Chat Messages Area */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  id={msg.id}
                  content={msg.content}
                  isUser={msg.isUser}
                  timestamp={msg.timestamp}
                />
              ))}
            </div>
          </div>

          {/* Message Input Area - Fixed to bottom */}
          <ChatInput 
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}