"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ConversationMemory } from "@/lib/memory-types";
import { SidebarToggle } from "./sidebar-toggle";
import { USER_NAME } from "@/lib/constants";
import { Sparkles, ChevronDown } from "lucide-react";

interface ChatHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  currentConversation: ConversationMemory | null;
  isGeneratingTitle: boolean;
}

export function ChatHeader({
  isSidebarOpen,
  onToggleSidebar,
  currentConversation,
  isGeneratingTitle
}: ChatHeaderProps) {
  return (
    <div className="w-full border-b border-border p-4 flex-shrink-0 bg-background">
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarToggle isOpen={isSidebarOpen} onToggle={onToggleSidebar} />

            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold font-heading text-primary truncate max-w-xs">
                {currentConversation ? currentConversation.title : "New Chat"}
              </h1>
              {isGeneratingTitle && (
                <div className="text-xs text-muted-foreground animate-pulse">
                  Generating title...
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-accent rounded-full pl-1 pr-3 py-1">
            <Avatar className="h-7 w-7">
              <AvatarImage src="/Maham.jpg" alt="User Avatar" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">
              Welcome, {USER_NAME}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}