"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { ContextDialog } from "./context-dialog";
import { SettingsDialog } from "./settings-dialog";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai'>('gemini');

  // Load context and provider from localStorage on component mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('selected_provider') as 'gemini' | 'openai' || 'gemini';
    const savedContext = localStorage.getItem('chat_context') || '';
    
    setSelectedProvider(savedProvider);
    setContext(savedContext);
  }, []);

  // Handle provider change from settings dialog
  const handleProviderChange = (provider: 'gemini' | 'openai') => {
    setSelectedProvider(provider);
  };

  // Handle context change
  const handleContextChange = (newContext: string) => {
    setContext(newContext);
    localStorage.setItem('chat_context', newContext);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t border-border p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Main Input Container */}
        <div className="border border-border rounded-2xl overflow-hidden">
          {/* Message Input Area */}
          <div className="p-4">
            <Input
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground"
            />
          </div>
          
          {/* Control Buttons Area */}
          <div className="border-t border-border p-3 flex items-center justify-between">
            {/* Left Side - Control Buttons */}
            <div className="flex items-center gap-2">
              {/* Settings Button */}
              <SettingsDialog 
                selectedProvider={selectedProvider}
                onProviderChange={handleProviderChange}
              />

              {/* Add Context Button */}
              <ContextDialog 
                context={context}
                onContextChange={handleContextChange}
              />
            </div>

            {/* Right Side - Send Button */}
            <Button 
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              size="icon" 
              className="h-8 w-8 rounded-full"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
