'use client';


import { useChatStore } from '@/store/chat-store';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';

interface ChatAreaProps {
  conversationId: string | null;
}

export function ChatArea({ conversationId }: ChatAreaProps): JSX.Element {
  const conversation = useChatStore((state) =>
    state.conversations.find((c) => c.id === conversationId)
  );

  const sendMessage = useChatStore((state) => state.sendMessage);

  const handleSend = async (content: string) => {
    if (!conversationId) return;
    await sendMessage(conversationId, content);
  };

  if (!conversationId || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-app">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary mb-2">
            Welcome to OdaxAI Studio
          </h2>
          <p className="text-text-secondary mb-6">
            Create a new chat or select an existing conversation to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-app">
      <MessageList messages={conversation.messages} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}

