// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { db } from './firebase';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';

/**
 * Clean up nested model data in Firestore
 * Fixes the issue where dots in model names created nested objects
 * e.g., modelsUsed.qwen2.5-3b -> flattens to modelsUsed.qwen2-5-3b
 */
export async function cleanupUserStats(userId: string): Promise<{
  cleaned: boolean;
  message: string;
}> {
  if (!userId) {
    return { cleaned: false, message: 'No user ID provided' };
  }

  const userRef = doc(db, 'users', userId);

  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return { cleaned: false, message: 'User document not found' };
    }

    const data = userDoc.data();
    const updates: Record<string, any> = {};
    let hasChanges = false;

    // Clean modelsUsed
    if (data.modelsUsed) {
      for (const [key, value] of Object.entries(data.modelsUsed)) {
        if (typeof value === 'object' && value !== null) {
          // Found nested object - flatten it
          hasChanges = true;

          // Delete the nested key
          updates[`modelsUsed.${key}`] = deleteField();

          // Create flattened entries
          for (const [nestedKey, nestedValue] of Object.entries(
            value as Record<string, number>
          )) {
            const flatKey = `${key}-${nestedKey}`.replace(/\./g, '-');
            updates[`modelsUsed.${flatKey}`] = nestedValue;
          }
        }
      }
    }

    // Clean tokensPerModel
    if (data.tokensPerModel) {
      for (const [key, value] of Object.entries(data.tokensPerModel)) {
        if (typeof value === 'object' && value !== null) {
          // Found nested object - flatten it
          hasChanges = true;

          // Delete the nested key
          updates[`tokensPerModel.${key}`] = deleteField();

          // Create flattened entries
          for (const [nestedKey, nestedValue] of Object.entries(
            value as Record<string, number>
          )) {
            const flatKey = `${key}-${nestedKey}`.replace(/\./g, '-');
            updates[`tokensPerModel.${flatKey}`] = nestedValue;
          }
        }
      }
    }

    if (hasChanges) {
      await updateDoc(userRef, updates);
      console.log('Cleaned up user stats:', updates);
      return {
        cleaned: true,
        message: `Cleaned ${Object.keys(updates).length} fields`,
      };
    }

    return { cleaned: false, message: 'No cleanup needed' };
  } catch (error: any) {
    const isOffline =
      error?.message?.includes('offline') || error?.code?.includes('offline');
    if (!isOffline) {
      console.error('Error cleaning up stats:', error);
    }
    return { cleaned: false, message: `Error: ${error}` };
  }
}
