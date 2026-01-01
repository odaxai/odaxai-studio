'use client';

import { db } from './firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface ActivityPost {
  id?: string;
  userId: string;
  username: string;
  userPhoto: string | null;
  type: 'inference' | 'reasoning' | 'milestone' | 'model_used';
  content: string;
  modelId?: string;
  tokenCount?: number;
  reasoningTokens?: number;
  responseTimeMs?: number;
  timestamp: Timestamp | Date | string;
  likes?: number;
}

/**
 * Create a new activity post
 */
export async function createActivityPost(
  userId: string,
  username: string,
  userPhoto: string | null,
  type: ActivityPost['type'],
  content: string,
  metadata?: {
    modelId?: string;
    tokenCount?: number;
    reasoningTokens?: number;
    responseTimeMs?: number;
    tokensPerSecond?: number;
    hardware?: string;
    cpuCores?: number;
    gpuRenderer?: string | null;
    timestamp?: string;
  }
): Promise<string | null> {
  try {
    const post: Omit<ActivityPost, 'id'> = {
      userId,
      username,
      userPhoto,
      type,
      content,
      timestamp: serverTimestamp() as Timestamp,
      likes: 0,
      ...metadata,
    };

    const docRef = await addDoc(collection(db, 'posts'), post);
    console.log('📝 Activity post created:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    const isOffline =
      error?.message?.includes('offline') || error?.code?.includes('offline');
    if (!isOffline) console.error('❌ Error creating activity post:', error);
    return null;
  }
}

/**
 * Get recent activity posts for the feed
 */
export async function getRecentPosts(
  maxPosts: number = 20
): Promise<ActivityPost[]> {
  try {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('timestamp', 'desc'),
      limit(maxPosts)
    );

    const snapshot = await getDocs(postsQuery);
    const posts: ActivityPost[] = [];

    snapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      } as ActivityPost);
    });

    return posts;
  } catch (error: any) {
    const isOffline =
      error?.message?.includes('offline') || error?.code?.includes('offline');
    if (!isOffline) console.error('❌ Error fetching posts:', error);
    return [];
  }
}

/**
 * Generate milestone content based on token count
 */
export function getMilestoneMessage(totalTokens: number): string | null {
  const milestones = [
    { threshold: 1000000, message: '🎉 Reached 1M tokens!' },
    { threshold: 500000, message: '🚀 Half a million tokens!' },
    { threshold: 100000, message: '💯 100K tokens milestone!' },
    { threshold: 50000, message: '⭐ 50K tokens achieved!' },
    { threshold: 10000, message: '🎯 First 10K tokens!' },
  ];

  for (const milestone of milestones) {
    // Check if we just crossed this milestone
    if (
      totalTokens >= milestone.threshold &&
      totalTokens < milestone.threshold * 1.1
    ) {
      return milestone.message;
    }
  }

  return null;
}
