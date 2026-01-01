import type { Metadata } from 'next';
import './globals.css';
import { ChatProvider } from './context/ChatContext';
import { AuthProvider } from './context/AuthContext';
import TranslationToast from './components/TranslationToast';

export const metadata: Metadata = {
  title: 'OdaxAI Chat',
  description: 'AI Chat powered by OdaxAI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#000' }}>
      <body
        className="bg-gray-900 text-white"
        style={{ backgroundColor: '#0d0d0d' }}
      >
        <AuthProvider>
          <ChatProvider>
            {children}
            {/* Global translation toast - shows on all pages */}
            <TranslationToast />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
