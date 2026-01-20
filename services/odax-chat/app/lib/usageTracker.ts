// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { db } from './firebase';
import {
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';

/**
 * Simple token estimation using character count
 * Approximate: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Extended tracking options
 */
interface TrackingOptions {
  isReasoning?: boolean;
  reasoningTokens?: number;
  responseTimeMs?: number;
}

// ============================================
// BATCHING SYSTEM - Reduces Firestore writes
// Syncs every 5 inferences OR every 5 minutes
// ============================================
const BATCH_SIZE = 5;

interface PendingStats {
  totalTokens: number;
  totalInferences: number;
  modelsUsed: Record<string, number>;
  tokensPerModel: Record<string, number>;
  reasoningCount: number;
  reasoningTokens: number;
}

let pendingStats: PendingStats = {
  totalTokens: 0,
  totalInferences: 0,
  modelsUsed: {},
  tokensPerModel: {},
  reasoningCount: 0,
  reasoningTokens: 0,
};

let pendingUserId: string | null = null;

// Sync on page unload
// Restore from local storage on load
if (typeof window !== 'undefined') {
  try {
    const cachedStats = localStorage.getItem('odax_pending_stats');
    if (cachedStats) {
      const parsed = JSON.parse(cachedStats);
      if (parsed.userId && parsed.stats) {
        pendingUserId = parsed.userId;
        pendingStats = parsed.stats;
        console.log(
          '📦 Restored pending stats from local storage',
          pendingStats
        );
      }
    }
  } catch (e) {
    console.error('Failed to restore stats:', e);
  }

  window.addEventListener('beforeunload', () => {
    // AUTO-FLUSH REMOVED PER USER REQUEST
    // Only manual sync allowed.
    // Data remains safe in localStorage.
  });
}

/**
 * Flush pending stats to Firestore via API Proxy
 * OPTIMIZED: Skip direct attempt (always fails), use Proxy directly
 */
async function flushStats(userId: string): Promise<void> {
  if (pendingStats.totalInferences === 0) return;

  // DIRECT TO PROXY (Skip Failed Direct Attempt for Speed)
  console.log('📤 Syncing via API Proxy (Direct method skipped)...');
  try {
    const res = await fetch('/api/user/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, stats: pendingStats }),
    });

    if (res.ok) {
      console.log('✅ Stats synced via API Proxy');
      // Success! Clear local storage
      pendingStats = {
        totalTokens: 0,
        totalInferences: 0,
        modelsUsed: {},
        tokensPerModel: {},
        reasoningCount: 0,
        reasoningTokens: 0,
      };
      if (typeof window !== 'undefined') {
        localStorage.removeItem('odax_pending_stats');
        // Record Sync Timestamp (keeping for potential future use)
        const history = localStorage.getItem('odax_sync_history');
        let syncs: number[] = history ? JSON.parse(history) : [];
        syncs.push(Date.now());
        if (syncs.length > 10) syncs = syncs.slice(-10);
        localStorage.setItem('odax_sync_history', JSON.stringify(syncs));
      }
      return; // Exit success
    } else {
      const errText = await res.text();
      console.error('❌ API Proxy Sync failed:', errText);
      throw new Error(`Proxy returned ${res.status}: ${errText}`);
    }
  } catch (proxyErr: any) {
    console.error('❌ Sync Error:', proxyErr);
    // DO NOT RESET pendingStats - keep for retry
    throw proxyErr; // Re-throw so caller knows it failed
  }
}

/**
 * Track an inference - accumulates locally, syncs in batches
 * COST OPTIMIZATION: 1 write per 5 inferences instead of 1 per inference
 */
export async function trackInference(
  userId: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  options?: TrackingOptions
): Promise<void> {
  if (!userId) return;

  pendingUserId = userId;
  const totalTokens = inputTokens + outputTokens;

  // Accumulate locally
  pendingStats.totalTokens += totalTokens;
  pendingStats.totalInferences += 1;
  pendingStats.modelsUsed[modelId] =
    (pendingStats.modelsUsed[modelId] || 0) + 1;
  pendingStats.tokensPerModel[modelId] =
    (pendingStats.tokensPerModel[modelId] || 0) + totalTokens;

  if (options?.isReasoning) {
    pendingStats.reasoningCount += 1;
    pendingStats.reasoningTokens += options.reasoningTokens || outputTokens;
  }

  // Save to local storage immediately (DB Interno)
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      'odax_pending_stats',
      JSON.stringify({
        userId: pendingUserId,
        stats: pendingStats,
      })
    );
  }

  console.log(
    `Queued: ${totalTokens} tokens (${modelId}) [${pendingStats.totalInferences} pending]` // Removed BATCH_SIZE log
  );

  // AUTO-FLUSH REMOVED.
  // Stats accumulate until manual sync.
}

/**
 * Force sync pending stats (call when user clicks Sync Button)
 * NO RESTRICTIONS - User can sync unlimited times
 */
export async function syncPendingStats(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!pendingUserId || pendingStats.totalInferences === 0) {
    return { success: false, message: 'No pending stats to sync.' };
  }

  await flushStats(pendingUserId);
  return { success: true, message: 'Sync started.' };
}

/**
 * Get user stats from Firestore
 */
export async function getUserStats(userId: string): Promise<{
  totalTokens: number;
  totalInferences: number;
  modelsUsed: Record<string, number>;
  tokensPerModel: Record<string, number>;
  reasoningCount: number;
  reasoningTokens: number;
} | null> {
  if (!userId) return null;

  try {
    const userRef = doc(db, 'users', userId);

    // 5s Timeout Race
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), 5000)
    );

    let result;
    try {
      result = (await Promise.race([getDoc(userRef), timeoutPromise])) as any;
    } catch (e: any) {
      const isOffline =
        e?.message?.includes('offline') || e?.code?.includes('offline');

      if (!isOffline) {
        console.warn(
          '⚠️ Server fetch failed (likely offline/blocked), forcing fallback...',
          e
        );
      }
      result = 'TIMEOUT'; // Treat error as timeout to trigger fallback
    }

    let data;

    if (result === 'TIMEOUT') {
      console.warn(
        '⚠️ getUserStats timed out or failed, checking cache/fallback...'
      );

      // 1. Try API Proxy (Server-Side Fetch) - Best for Fresh Data
      try {
        const res = await fetch(`/api/user/profile/${userId}`);
        if (res.ok) {
          const proxyData = await res.json();
          console.log('✅ Stats loaded via API Proxy');
          // Map UserProfile to Stats
          // The API returns a UserProfile with 'usageStats' object, but getUserStats expects flat Firestore data structure
          if (proxyData.usageStats) {
            data = {
              ...proxyData, // Keep other fields if needed
              totalTokens: proxyData.usageStats.totalTokensUsed || 0,
              totalInferences:
                proxyData.usageStats.totalInferenceCalls ||
                proxyData.usageStats.requestCount ||
                0,
              modelsUsed: proxyData.usageStats.modelsUsed || {},
              tokensPerModel: proxyData.usageStats.tokensPerModel || {}, // usageStats might not have this, check interface
              reasoningCount: proxyData.usageStats.reasoningCount || 0,
              reasoningTokens: proxyData.usageStats.reasoningTokens || 0,
            };
            // Fallback: If usageStats is empty (new user), but we have root fields (unlikely if strictly UserProfile), check them.
            // But valid Profile usually has usageStats.

            // Also update local cache while we are at it
            if (typeof window !== 'undefined') {
              localStorage.setItem(
                `odax_profile_${userId}`,
                JSON.stringify(proxyData)
              );
            }
          } else if (proxyData.totalTokens !== undefined) {
            // Handle case where API might return raw User doc (unlikely but safe)
            data = proxyData;
          }
        }
      } catch (proxyErr) {
        console.error('❌ Stats API Proxy error:', proxyErr);
      }

      // 2. Try Local Storage Cache (if Proxy failed)
      if (!data && typeof window !== 'undefined') {
        const cached = localStorage.getItem(`odax_profile_${userId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.totalTokens) {
              data = parsed;
              console.log('📦 Recovered stats from local profile cache');
            }
          } catch (e) {}
        }
      }

      // 3. Emergency Fallback for any user
      if (!data) {
        console.log('🚨 Using EMERGENCY STATS FALLBACK');
        data = {
          totalTokens: 0,
          totalInferences: 0,
          modelsUsed: {},
          tokensPerModel: {},
          reasoningCount: 0,
          reasoningTokens: 0,
        };
      }

      if (!data) return null;
    } else {
      if (!result.exists()) return null;
      data = result.data();
    }

    if (data) {
      // Add pending stats to returned data for accurate display
      return {
        totalTokens: (data.totalTokens || 0) + pendingStats.totalTokens,
        totalInferences:
          (data.totalInferences || 0) + pendingStats.totalInferences,
        modelsUsed: { ...(data.modelsUsed || {}), ...pendingStats.modelsUsed },
        tokensPerModel: {
          ...(data.tokensPerModel || {}),
          ...pendingStats.tokensPerModel,
        },
        reasoningCount:
          (data.reasoningCount || 0) + pendingStats.reasoningCount,
        reasoningTokens:
          (data.reasoningTokens || 0) + pendingStats.reasoningTokens,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

/**
 * Sync hardware info to Firestore
 */
export async function syncHardware(
  userId: string,
  hardware: any
): Promise<void> {
  if (!userId || !hardware) return;

  try {
    const userRef = doc(db, 'users', userId);

    // Only update if changed (simple check) or just update always for now (low frequency)
    // We store it in a 'hardware' map field
    await setDoc(
      userRef,
      {
        hardware: hardware,
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );

    console.log('💻 Hardware stats synced to Firestore');
  } catch (error) {
    console.error('Error syncing hardware stats:', error);
  }
}
