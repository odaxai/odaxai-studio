'use client';

import { Plus, Search, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  isOpen: boolean;
}

export function ChatSidebar({ isOpen }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const {
    conversations,
    activeConversationId,
    createConversation,
    deleteConversation,
    renameConversation,
    setActiveConversation,
  } = useChatStore();

  const handleCreateChat = () => {
    const id = createConversation();
    setActiveConversation(id);
  };

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      renameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      deleteConversation(id);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="flex w-[280px] flex-col border-r border-border bg-bg-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Chats</h2>
        <button
          onClick={handleCreateChat}
          className="btn-ghost p-2 rounded-md"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 h-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary text-sm">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                'group relative flex items-center gap-2 rounded-md px-3 py-2.5 cursor-pointer transition-colors',
                activeConversationId === conv.id
                  ? 'bg-bg-active'
                  : 'hover:bg-bg-hover'
              )}
              onClick={() => {
                if (editingId !== conv.id) {
                  setActiveConversation(conv.id);
                }
              }}
            >
              {editingId === conv.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="input h-7 text-sm flex-1"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit();
                    }}
                    className="p-1 hover:bg-bg-elevated rounded"
                  >
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                    className="p-1 hover:bg-bg-elevated rounded"
                  >
                    <X className="h-3.5 w-3.5 text-text-tertiary" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {conv.messages.length} messages
                    </p>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(conv.id, conv.title);
                      }}
                      className="p-1.5 hover:bg-bg-elevated rounded"
                      title="Rename"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-text-tertiary" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id);
                      }}
                      className="p-1.5 hover:bg-bg-elevated rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-text-tertiary hover:text-red-500" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className="text-xs text-text-tertiary">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

