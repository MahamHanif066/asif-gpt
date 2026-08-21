"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff } from "lucide-react";
import { ContextDialog } from "./context-dialog";
import { SettingsDialog } from "./settings-dialog";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai">("gemini");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const savedProvider = (localStorage.getItem("selected_provider") as "gemini" | "openai") || "gemini";
    const savedContext = localStorage.getItem("chat_context") || "";

    setSelectedProvider(savedProvider);
    setContext(savedContext);
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setMessage(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!voiceSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setMessage("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleProviderChange = (provider: "gemini" | "openai") => {
    setSelectedProvider(provider);
  };

  const handleContextChange = (newContext: string) => {
    setContext(newContext);
    localStorage.setItem("chat_context", newContext);
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
        <div className="flex items-center gap-2 border border-border rounded-full pl-5 pr-2 py-2 bg-card">
          <Input
            placeholder={isListening ? "Listening..." : "Type your message here..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground bg-transparent shadow-none"
          />

          {voiceSupported && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleListening}
              className={`h-9 w-9 rounded-full transition-colors ${
                isListening
                  ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                  : "bg-accent text-primary hover:bg-accent/80"
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}

          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !message.trim()}
            size="icon"
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-2 px-2">
          <SettingsDialog
            selectedProvider={selectedProvider}
            onProviderChange={handleProviderChange}
          />
          <ContextDialog context={context} onContextChange={handleContextChange} />
        </div>
      </div>
    </div>
  );
}