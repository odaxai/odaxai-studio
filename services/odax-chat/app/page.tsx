'use client';

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import styles from './page.module.css';
import { useAuth } from './context/AuthContext';

export default function Home() {
  // Auth is optional - chat works without login
  const { user, profile, loading, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Detect if we're running inside an iframe and close sidebar by default
  useEffect(() => {
    try {
      if (window.self !== window.top) {
        // We're in an iframe - start with sidebar closed to avoid clutter
        setIsSidebarOpen(false);
      }
    } catch (e) {
      // Cross-origin iframe - close sidebar
      setIsSidebarOpen(false);
    }
  }, []);

  return (
    <main
      className={`${styles.main} ${theme}`}
      style={{ background: theme === 'dark' ? '#1a1a1a' : '#fafafa' }}
    >
      {/* Sidebar is always available, user can toggle with hamburger button */}
      <Sidebar isOpen={isSidebarOpen} theme={theme} />
      <div
        className={`${styles.content} ${isSidebarOpen ? styles.contentNormal : styles.contentExpanded}`}
      >
        {!loading ? (
          <ChatArea
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            theme={theme}
            setTheme={setTheme}
            user={user}
            profile={profile}
            onSignOut={signOut}
            authLoading={loading}
          />
        ) : (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: theme === 'dark' ? '#1a1a1a' : '#fafafa',
              color: theme === 'dark' ? '#888' : '#666',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div className={styles.spinner}></div>
              <span>Loading Odax AI...</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
