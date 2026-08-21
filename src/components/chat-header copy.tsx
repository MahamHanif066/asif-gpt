"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SidebarToggle } from "./sidebar-toggle";
import { USER_NAME } from "@/lib/constants";
import { ConversationMemory } from "@/lib/memory-types";

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
    <div className="w-full border-b border-border p-4 flex-shrink-0">
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarToggle 
              isOpen={isSidebarOpen}
              onToggle={onToggleSidebar}
            />
            {currentConversation && (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold truncate max-w-xs">
                  {currentConversation.title}
                </h1>
                {isGeneratingTitle && (
                  <div className="text-xs text-muted-foreground animate-pulse">
                    Generating title...
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/Maham.jpg" alt="User Avatar" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">Welcome, {USER_NAME}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
