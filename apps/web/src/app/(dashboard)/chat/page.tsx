// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import React, { useState } from 'react';

export default function ChatPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-full h-full bg-black overflow-hidden relative flex flex-col items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 text-white">
          <div className="w-8 h-8 border-2 border-t-transparent border-white rounded-full animate-spin mb-4" />
          <span className="text-sm font-medium opacity-70">
            Connecting to OdaxAI Chat...
          </span>
        </div>
      )}

      {/* Load OdaxChat application directly */}
      <iframe
        src="http://localhost:3002"
        className="w-full h-full border-0"
        title="OdaxChat"
        allow="clipboard-read; clipboard-write; microphone"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
