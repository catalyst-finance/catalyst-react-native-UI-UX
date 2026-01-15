/**
 * useConversationHistory.ts
 * 
 * Hook for managing multiple chat conversations stored in AsyncStorage.
 * Provides CRUD operations for conversations and conversation summaries.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../lib/StreamBlockTypes';

const CONVERSATIONS_INDEX_KEY = '@catalyst_copilot_conversations_index';
const CONVERSATION_PREFIX = '@catalyst_copilot_conversation_';
const MAX_CONVERSATIONS = 20;

export interface ConversationSummary {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  lastUpdated: Date;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: Date;
  lastUpdated: Date;
}

/**
 * Generate a unique conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract a title from the first user message
 */
function extractTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'New Conversation';
  
  const content = firstUserMessage.content;
  if (content.length <= 40) return content;
  return content.substring(0, 40) + '...';
}

/**
 * Extract a preview from the last assistant message
 */
function extractPreview(messages: Message[]): string {
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
  if (!lastAssistantMessage) return 'No response yet';
  
  const content = lastAssistantMessage.content;
  if (!content) return 'No response yet';
  
  // Strip markdown and get first 100 chars
  const stripped = content.replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim();
  if (stripped.length <= 100) return stripped;
  return stripped.substring(0, 100) + '...';
}

export function useConversationHistory() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load conversation index on mount
  useEffect(() => {
    loadConversationIndex();
  }, []);

  const loadConversationIndex = async () => {
    try {
      const indexData = await AsyncStorage.getItem(CONVERSATIONS_INDEX_KEY);
      if (indexData) {
        const parsed = JSON.parse(indexData);
        // Convert date strings back to Date objects
        const summaries = parsed.map((s: any) => ({
          ...s,
          lastUpdated: new Date(s.lastUpdated),
          createdAt: new Date(s.createdAt),
        }));
        // Sort by lastUpdated descending
        summaries.sort((a: ConversationSummary, b: ConversationSummary) => 
          b.lastUpdated.getTime() - a.lastUpdated.getTime()
        );
        setConversations(summaries);
      }
    } catch (error) {
      console.error('[useConversationHistory] Failed to load index:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversationIndex = async (summaries: ConversationSummary[]) => {
    try {
      await AsyncStorage.setItem(CONVERSATIONS_INDEX_KEY, JSON.stringify(summaries));
    } catch (error) {
      console.error('[useConversationHistory] Failed to save index:', error);
    }
  };

  const loadConversation = useCallback(async (conversationId: string): Promise<Message[]> => {
    try {
      const data = await AsyncStorage.getItem(`${CONVERSATION_PREFIX}${conversationId}`);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.messages || [];
      }
    } catch (error) {
      console.error('[useConversationHistory] Failed to load conversation:', error);
    }
    return [];
  }, []);

  const saveConversation = useCallback(async (conversationId: string, messages: Message[]) => {
    if (messages.length === 0) return;

    try {
      const now = new Date();
      
      // Save the conversation messages
      const conversation: Conversation = {
        id: conversationId,
        messages,
        createdAt: now,
        lastUpdated: now,
      };
      await AsyncStorage.setItem(
        `${CONVERSATION_PREFIX}${conversationId}`,
        JSON.stringify(conversation)
      );

      // Update the index
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c.id === conversationId);
        const summary: ConversationSummary = {
          id: conversationId,
          title: extractTitle(messages),
          preview: extractPreview(messages),
          messageCount: messages.length,
          lastUpdated: now,
          createdAt: existingIndex >= 0 ? prev[existingIndex].createdAt : now,
        };

        let newSummaries: ConversationSummary[];
        if (existingIndex >= 0) {
          newSummaries = [...prev];
          newSummaries[existingIndex] = summary;
        } else {
          newSummaries = [summary, ...prev];
        }

        // Limit to MAX_CONVERSATIONS
        if (newSummaries.length > MAX_CONVERSATIONS) {
          const removed = newSummaries.splice(MAX_CONVERSATIONS);
          // Clean up old conversations from storage
          removed.forEach(r => {
            AsyncStorage.removeItem(`${CONVERSATION_PREFIX}${r.id}`).catch(() => {});
          });
        }

        // Sort by lastUpdated descending
        newSummaries.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
        
        // Save index
        saveConversationIndex(newSummaries);
        
        return newSummaries;
      });
    } catch (error) {
      console.error('[useConversationHistory] Failed to save conversation:', error);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      // Remove from storage
      await AsyncStorage.removeItem(`${CONVERSATION_PREFIX}${conversationId}`);
      
      // Update index
      setConversations(prev => {
        const newSummaries = prev.filter(c => c.id !== conversationId);
        saveConversationIndex(newSummaries);
        return newSummaries;
      });
    } catch (error) {
      console.error('[useConversationHistory] Failed to delete conversation:', error);
    }
  }, []);

  const startNewConversation = useCallback((): string => {
    return generateConversationId();
  }, []);

  return {
    conversations,
    isLoading,
    loadConversation,
    saveConversation,
    deleteConversation,
    startNewConversation,
  };
}

export default useConversationHistory;
