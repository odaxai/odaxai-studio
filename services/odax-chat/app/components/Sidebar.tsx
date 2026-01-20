// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { useState } from 'react';

import {
  PenSquare,
  MessageSquare,
  Trash2,
  Plus,
  LogOut,
  User,
} from 'lucide-react';
import styles from './Sidebar.module.css';
import clsx from 'clsx';
import { useChatContext } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  theme?: 'dark' | 'light';
}

export default function Sidebar({ isOpen, theme = 'dark' }: SidebarProps) {
  const {
    chats,
    currentChatId,
    createNewChat,
    selectChat,
    deleteChat,
    clearAllChats,
  } = useChatContext();

  const { user, profile, signOut } = useAuth();

  // Theme colors
  const themeColors =
    theme === 'dark'
      ? {
          bg: '#000000',
          border: '#2a2a2a',
          text: '#ececec',
          textMuted: '#888',
          itemHover: '#1f1f1f',
          itemActive: '#1f1f1f',
        }
      : {
          bg: '#fafafa', // Softened to match ChatArea
          border: '#e5e5e5',
          text: '#171717',
          textMuted: '#666',
          itemHover: '#eaeaea',
          itemActive: '#eaeaea', // Visible active state
        };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  // Use useMemo to stabilize "now" across renders
  const now = useState(() => Date.now())[0];

  // Group chats by date
  const today = chats.filter((c) => {
    const diff = now - c.createdAt;
    return diff < 24 * 60 * 60 * 1000;
  });

  const yesterday = chats.filter((c) => {
    const diff = now - c.createdAt;
    return diff >= 24 * 60 * 60 * 1000 && diff < 48 * 60 * 60 * 1000;
  });

  const thisWeek = chats.filter((c) => {
    const diff = now - c.createdAt;
    return diff >= 48 * 60 * 60 * 1000 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  const older = chats.filter((c) => {
    const diff = now - c.createdAt;
    return diff >= 7 * 24 * 60 * 60 * 1000;
  });

  const ChatItem = ({ chat }: { chat: (typeof chats)[0] }) => (
    <div
      className={clsx(
        styles.chatItem,
        currentChatId === chat.id && styles.chatItemActive
      )}
      onClick={() => selectChat(chat.id)}
      style={{
        color: themeColors.text,
        backgroundColor:
          currentChatId === chat.id ? themeColors.itemActive : 'transparent',
      }}
    >
      <MessageSquare
        size={15}
        style={{ opacity: 0.7, flexShrink: 0, color: themeColors.textMuted }}
      />
      <span className={styles.chatTitle} style={{ color: themeColors.text }}>
        {chat.title}
      </span>
      <button
        className={styles.deleteBtn}
        onClick={(e) => handleDeleteChat(e, chat.id)}
        title="Delete chat"
        style={{
          color: themeColors.textMuted,
          opacity: currentChatId === chat.id ? 0.7 : undefined, // Always visible on active chat
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <aside
      className={clsx(styles.sidebar, !isOpen && styles.closed)}
      style={{
        background: themeColors.bg,
        borderRight: `1px solid ${themeColors.border}`,
        color: themeColors.text,
      }}
    >
      {/* Header */}
      <div
        className={styles.header}
        style={{ borderBottom: `1px solid ${themeColors.border}` }}
      >
        <span
          style={{ color: themeColors.text, fontWeight: 600, fontSize: '15px' }}
        >
          OdaxAI Chat
        </span>
      </div>

      {/* New Chat Button */}
      <button
        className={styles.newChatBtn}
        onClick={createNewChat}
        style={{
          borderColor: themeColors.border,
          color: themeColors.text,
          background:
            theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        }}
      >
        <div
          className={styles.newChatIcon}
          style={{ background: themeColors.text, color: themeColors.bg }}
        >
          <Plus size={14} strokeWidth={2.5} />
        </div>
        <span>New Chat</span>
        <PenSquare size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
      </button>

      {/* Chat List */}
      <div className={styles.chatList}>
        {chats.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare
              size={24}
              style={{
                opacity: 0.2,
                marginBottom: 8,
                color: themeColors.textMuted,
              }}
            />
            <p style={{ color: themeColors.textMuted }}>No conversations yet</p>
            <span style={{ color: themeColors.textMuted }}>
              Start a new chat above!
            </span>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <>
                <div
                  className={styles.sectionTitle}
                  style={{ color: themeColors.textMuted }}
                >
                  Today
                </div>
                {today.map((chat) => (
                  <ChatItem key={chat.id} chat={chat} />
                ))}
              </>
            )}

            {yesterday.length > 0 && (
              <>
                <div
                  className={styles.sectionTitle}
                  style={{ color: themeColors.textMuted }}
                >
                  Yesterday
                </div>
                {yesterday.map((chat) => (
                  <ChatItem key={chat.id} chat={chat} />
                ))}
              </>
            )}

            {thisWeek.length > 0 && (
              <>
                <div
                  className={styles.sectionTitle}
                  style={{ color: themeColors.textMuted }}
                >
                  This Week
                </div>
                {thisWeek.map((chat) => (
                  <ChatItem key={chat.id} chat={chat} />
                ))}
              </>
            )}

            {older.length > 0 && (
              <>
                <div
                  className={styles.sectionTitle}
                  style={{ color: themeColors.textMuted }}
                >
                  Older
                </div>
                {older.slice(0, 10).map((chat) => (
                  <ChatItem key={chat.id} chat={chat} />
                ))}
                {older.length > 10 && (
                  <button className={styles.showMoreBtn}>
                    Show {older.length - 10} more
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        {chats.length > 0 && (
          <button
            onClick={clearAllChats}
            className={styles.clearBtn}
            style={{
              color: themeColors.textMuted,
              borderColor: themeColors.border,
              marginBottom: user ? '10px' : '0',
            }}
          >
            <Trash2 size={14} />
            Clear All
          </button>
        )}

        {/* User Profile & Logout */}
        {user && (
          <div
            className={styles.userSection}
            style={{
              paddingTop: '12px',
              borderTop: `1px solid ${themeColors.border}`,
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
                paddingLeft: '4px',
              }}
            >
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt="Profile"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: themeColors.itemActive,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: themeColors.text,
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {(
                    profile?.displayName?.[0] ||
                    user.email?.[0] ||
                    'U'
                  ).toUpperCase()}
                </div>
              )}
              <span
                style={{
                  fontSize: '13px',
                  color: themeColors.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {user.email}
              </span>
            </div>

            <button
              onClick={() => signOut()}
              className={styles.clearBtn}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                color: themeColors.textMuted,
                borderColor: 'transparent',
                padding: '8px 4px',
                gap: '10px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = themeColors.textMuted)
              }
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
