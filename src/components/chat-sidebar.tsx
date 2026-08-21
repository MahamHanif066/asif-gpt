"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ConversationMemory } from "@/lib/memory-types";

import { Plus, Search, X, MessageSquare, Settings } from "lucide-react";
import { ChatListItem } from "./chat-list-item";
import { MemoryStorageService } from "@/lib/memory-storage";
import { USER_NAME } from "@/lib/constants";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentConversationId: string | null;
  onConversationSelect: (conversation: ConversationMemory) => void;
  onNewChat: () => void;
  onConversationDelete: (conversationId: string) => void;
  onConversationRename: (conversationId: string, newTitle: string) => void;
  refreshTrigger?: number;
}

export function ChatSidebar({
  isOpen,
  onClose,
  currentConversationId,
  onConversationSelect,
  onNewChat,
  onConversationDelete,
  onConversationRename,
  refreshTrigger
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationMemory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] = useState<ConversationMemory[]>([]);

  const memoryStorage = MemoryStorageService.getInstance();

  useEffect(() => {
    const loadConversations = () => {
      const allConversations = memoryStorage.getAllConversations();
      setConversations(allConversations);
      setFilteredConversations(allConversations);
    };

    loadConversations();

    const handleStorageChange = () => {
      loadConversations();
    };

    const handleTitleUpdate = () => {
      loadConversations();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("titleUpdated", handleTitleUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("titleUpdated", handleTitleUpdate);
    };
  }, [memoryStorage]);

  useEffect(() => {
    if (refreshTrigger) {
      const allConversations = memoryStorage.getAllConversations();
      setConversations(allConversations);
      setFilteredConversations(allConversations);
    }
  }, [refreshTrigger, memoryStorage]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(
        (conv) =>
          conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const handleConversationSelect = (conversationId: string) => {
    const conversation = memoryStorage.switchToConversation(conversationId);
    if (conversation) {
      onConversationSelect(conversation);
    }
  };

  const handleDelete = (conversationId: string) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      memoryStorage.deleteConversation(conversationId);
      onConversationDelete(conversationId);

      const allConversations = memoryStorage.getAllConversations();
      setConversations(allConversations);
      setFilteredConversations(allConversations);
    }
  };

  const handleRename = (conversationId: string, newTitle: string) => {
    memoryStorage.updateConversationTitle(conversationId, newTitle);
    onConversationRename(conversationId, newTitle);

    const allConversations = memoryStorage.getAllConversations();
    setConversations(allConversations);
    setFilteredConversations(allConversations);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:z-auto">
      <div className="absolute inset-0 bg-black/50 lg:hidden" onClick={onClose} />

      <div className="absolute left-0 top-0 h-full w-80 bg-sidebar border-r border-sidebar-border flex flex-col lg:relative lg:translate-x-0">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Chat History</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={onNewChat}
            className="w-full mb-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-card border-sidebar-border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">
                {searchQuery ? "No conversations found" : "No conversations yet"}
              </p>
              <p className="text-xs mt-1">
                {searchQuery ? "Try a different search term" : "Start a new chat to begin"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <ChatListItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === currentConversationId}
                  onSelect={handleConversationSelect}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))}
            </div>
          )}
        </div>

               <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-accent transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold">
              {USER_NAME.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{USER_NAME}</p>
              <p className="text-xs text-muted-foreground">AI Mentor</p>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
            <span>{conversations.length} chats</span>
            <span>{memoryStorage.getMemoryStats().totalWords.toLocaleString()} words</span>
          </div>
        </div>
      </div>
    </div>
  );
}