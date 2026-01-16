/**
 * useStreamingChat.ts
 * 
 * Custom hook for handling WebSocket streaming chat with the Catalyst Copilot backend.
 * Uses native WebSocket for optimal performance in React Native.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Message,
  ContentBlock,
  DataCard,
  ThinkingStep,
  StreamingState,
  generateMessageId,
  generateBlockId,
} from '../lib/StreamBlockTypes';

const WS_ENDPOINT = 'wss://catalyst-copilot-2nndy.ondigitalocean.app/ws/chat';
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const STORAGE_KEY = '@catalyst_copilot_messages';
const MAX_STORED_MESSAGES = 50;
const MAX_STORAGE_SIZE = 1024 * 1024; // 1MB

interface UseStreamingChatOptions {
  selectedTickers?: string[];
  onError?: (error: string) => void;
}

interface UseStreamingChatReturn {
  messages: Message[];
  isStreaming: boolean;
  streamingState: StreamingState;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  isConnected: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

/**
 * Check for incomplete markdown patterns that shouldn't be rendered yet
 */
function hasIncompletePattern(str: string): boolean {
  const openBrackets = (str.match(/\[/g) || []).length;
  const closeBrackets = (str.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) return true;

  if (/\]\([^)]*$/.test(str)) return true;

  const asterisks = (str.match(/\*/g) || []).length;
  if (asterisks % 2 !== 0) return true;

  if (/\[[^\]]*$/.test(str)) return true;

  return false;
}

/**
 * Save messages to AsyncStorage
 */
async function saveMessages(messages: Message[]): Promise<void> {
  try {
    // Limit to MAX_STORED_MESSAGES
    const messagesToSave = messages.slice(-MAX_STORED_MESSAGES);
    
    const data = JSON.stringify({
      messages: messagesToSave,
      lastUpdated: new Date().toISOString(),
    });
    
    // Check size limit
    if (data.length > MAX_STORAGE_SIZE) {
      console.warn('[saveMessages] Data exceeds size limit, truncating...');
      // Remove oldest messages until under limit
      let truncated = messagesToSave;
      while (JSON.stringify({ messages: truncated, lastUpdated: new Date().toISOString() }).length > MAX_STORAGE_SIZE && truncated.length > 1) {
        truncated = truncated.slice(1);
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: truncated,
        lastUpdated: new Date().toISOString(),
      }));
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, data);
    }
  } catch (error) {
    console.error('[saveMessages] Failed to save messages:', error);
  }
}

/**
 * Load messages from AsyncStorage
 */
async function loadMessages(): Promise<Message[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    return parsed.messages || [];
  } catch (error) {
    console.error('[loadMessages] Failed to load messages:', error);
    return [];
  }
}

/**
 * Clear all messages from AsyncStorage
 */
async function clearStoredMessages(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[clearStoredMessages] Failed to clear messages:', error);
  }
}

/**
 * Extract complete, renderable blocks from a content buffer
 */
export function extractStreamBlocks(
  buffer: string,
  dataCards: DataCard[],
): { blocks: ContentBlock[]; remaining: string } {
  const blocks: ContentBlock[] = [];
  let remaining = buffer;
  let blockId = 0;
  let iterationCount = 0;
  const maxIterations = 100;

  while (remaining.length > 0) {
    iterationCount++;
    if (iterationCount > maxIterations) {
      console.error('[extractStreamBlocks] Hit maximum iteration limit');
      break;
    }

    // Check for any markers in the buffer
    const anyMarkerMatch = remaining.match(
      /\[(?:VIEW_CHART|VIEW_ARTICLE|IMAGE_CARD|EVENT_CARD):[^\]]+\]|\[HR\]/,
    );

    // If marker is not at start, extract text before it
    if (anyMarkerMatch && anyMarkerMatch.index && anyMarkerMatch.index > 0) {
      const textContent = remaining.substring(0, anyMarkerMatch.index);
      if (textContent.trim()) {
        blocks.push({
          id: generateBlockId('text', blockId++),
          type: 'text',
          content: textContent,
        });
      }
      remaining = remaining.substring(anyMarkerMatch.index);
      continue;
    }

    // Check for [HR] marker
    const hrMatch = remaining.match(/^\s*\[HR\]\s*/);
    if (hrMatch) {
      blocks.push({
        id: generateBlockId('horizontal_rule', blockId++),
        type: 'horizontal_rule',
        content: '',
      });
      remaining = remaining.substring(hrMatch[0].length);
      continue;
    }

    // Check for VIEW_CHART marker
    const chartMatch = remaining.match(/^\s*\[VIEW_CHART:([^\]]+)\]\s*/);
    if (chartMatch) {
      const chartData = chartMatch[1];
      let symbol: string, timeRange: string;

      if (chartData.includes(':')) {
        const parts = chartData.split(':');
        symbol = parts[0];
        timeRange = parts[1];
      } else if (chartData.startsWith('chart-')) {
        symbol = chartData.replace('chart-', '');
        timeRange = '1D';
      } else {
        symbol = chartData;
        timeRange = '1D';
      }

      blocks.push({
        id: generateBlockId('chart', blockId++),
        type: 'chart',
        content: '',
        data: { symbol, timeRange },
      });
      remaining = remaining.substring(chartMatch[0].length);
      continue;
    }

    // Check for VIEW_ARTICLE marker
    const articleMatch = remaining.match(/^(\s*)\[VIEW_ARTICLE:([^\]]+)\](\s*)/);
    if (articleMatch) {
      const articleId = articleMatch[2].trim();
      const articleCard = dataCards?.find(
        (c) => c.type === 'article' && c.data?.id === articleId,
      );
      if (articleCard) {
        blocks.push({
          id: generateBlockId('article', blockId++),
          type: 'article',
          content: '',
          data: articleCard.data,
        });
        remaining = remaining.substring(articleMatch[0].length);
        continue;
      } else {
        break; // Card not found yet, wait for metadata
      }
    }

    // Check for IMAGE_CARD marker
    const imageMatch = remaining.match(/^(\s*)\[IMAGE_CARD:([^\]]+)\](\s*)/);
    if (imageMatch) {
      const imageId = imageMatch[2].trim();
      const imageCard = dataCards?.find(
        (c) => c.type === 'image' && c.data?.id === imageId,
      );
      if (imageCard) {
        blocks.push({
          id: generateBlockId('image', blockId++),
          type: 'image',
          content: '',
          data: imageCard.data,
        });
        remaining = remaining.substring(imageMatch[0].length);
        continue;
      } else {
        break;
      }
    }

    // Check for EVENT_CARD marker
    const eventMatch = remaining.match(/^(\s*)\[EVENT_CARD:([^\]]+)\](\s*)/);
    if (eventMatch) {
      const eventId = eventMatch[2].trim();
      const eventCard = dataCards?.find(
        (c) => c.type === 'event' && 
        (c.data?.id === eventId || c.data?.id?.toString() === eventId),
      );
      if (eventCard) {
        blocks.push({
          id: generateBlockId('event', blockId++),
          type: 'event',
          content: '',
          data: eventCard.data,
        });
        remaining = remaining.substring(eventMatch[0].length);
        continue;
      } else {
        break;
      }
    }

    // Look for next marker or paragraph break
    const nextMarkerMatch = remaining.match(
      /\[(?:VIEW_CHART|VIEW_ARTICLE|IMAGE_CARD|EVENT_CARD):[^\]]+\]|\[HR\]/,
    );
    const nextDoubleNewline = remaining.indexOf('\n\n');

    let cutPoint = -1;

    if (nextMarkerMatch && nextMarkerMatch.index !== undefined) {
      if (nextDoubleNewline >= 0 && nextDoubleNewline < nextMarkerMatch.index) {
        cutPoint = nextDoubleNewline + 2;
      } else if (nextMarkerMatch.index === 0) {
        break;
      } else {
        cutPoint = nextMarkerMatch.index;
      }
    } else if (nextDoubleNewline >= 0) {
      cutPoint = nextDoubleNewline + 2;
    } else {
      const hasIncomplete = hasIncompletePattern(remaining);
      if (hasIncomplete) {
        // Try to find safe split point
        let splitIndex = -1;
        const openBrackets = (remaining.match(/\[/g) || []).length;
        const closeBrackets = (remaining.match(/\]/g) || []).length;
        
        if (openBrackets > closeBrackets) {
          splitIndex = remaining.lastIndexOf('[');
        } else if (/\]\([^)]*$/.test(remaining)) {
          splitIndex = remaining.lastIndexOf('[');
        } else {
          const asterisks = (remaining.match(/\*/g) || []).length;
          if (asterisks % 2 !== 0) {
            splitIndex = remaining.lastIndexOf('*');
            while (splitIndex > 0 && remaining[splitIndex - 1] === '*') {
              splitIndex--;
            }
          }
        }

        if (splitIndex > 0) {
          const textContent = remaining.substring(0, splitIndex);
          if (textContent.trim()) {
            blocks.push({
              id: generateBlockId('text', blockId++),
              type: 'text',
              content: textContent,
            });
          }
          remaining = remaining.substring(splitIndex);
          break;
        }
        break;
      } else {
        if (remaining.trim().length < 20) {
          break;
        }
        const potentialMarkerStart = /\[V?I?E?W?_?A?R?T?I?C?L?E?$/;
        if (potentialMarkerStart.test(remaining)) {
          break;
        }
        cutPoint = remaining.length;
      }
    }

    if (cutPoint > 0) {
      const textContent = remaining.substring(0, cutPoint);
      if (textContent.trim()) {
        blocks.push({
          id: generateBlockId('text', blockId++),
          type: 'text',
          content: textContent,
        });
      }
      remaining = remaining.substring(cutPoint);
    } else {
      break;
    }
  }

  return { blocks, remaining };
}

export function useStreamingChat(options: UseStreamingChatOptions = {}): UseStreamingChatReturn {
  const { selectedTickers = [], onError } = options;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    blocks: [],
    thinking: [],
    dataCards: [],
    metadata: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const contentBufferRef = useRef<string>('');
  const lastMessageRef = useRef<string>('');
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef<boolean>(false);
  const connectionGracePeriodRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnectedOnceRef = useRef<boolean>(false);
  const collectedDataRef = useRef<{
    thinking: ThinkingStep[];
    content: string;
    blocks: ContentBlock[];
    dataCards: DataCard[];
    eventData: Record<string, any>;
    blockIdCounter: number;
  }>({
    thinking: [],
    content: '',
    blocks: [],
    dataCards: [],
    eventData: {},
    blockIdCounter: 0,
  });

  const processContentBuffer = useCallback((forceFlush: boolean = false) => {
    const { blocks, remaining } = extractStreamBlocks(
      contentBufferRef.current,
      collectedDataRef.current.dataCards,
    );

    if (blocks.length > 0) {
      const newBlocks = blocks.map(block => ({
        ...block,
        id: generateBlockId(block.type, collectedDataRef.current.blockIdCounter++),
      }));
      collectedDataRef.current.blocks.push(...newBlocks);
      setStreamingState(prev => ({
        ...prev,
        blocks: [...prev.blocks, ...newBlocks],
      }));
    }

    contentBufferRef.current = remaining;

    if (forceFlush && remaining.trim()) {
      const finalBlock: ContentBlock = {
        id: generateBlockId('text', collectedDataRef.current.blockIdCounter++),
        type: 'text',
        content: remaining,
      };
      collectedDataRef.current.blocks.push(finalBlock);
      setStreamingState(prev => ({
        ...prev,
        blocks: [...prev.blocks, finalBlock],
      }));
      contentBufferRef.current = '';
    }
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WS] Already connected or connecting, skipping');
      return;
    }

    // Clear any existing connection first
    if (wsRef.current) {
      console.log('[WS] Closing existing connection before reconnecting');
      wsRef.current.close();
      wsRef.current = null;
    }

    console.log('[WS] Connecting to', WS_ENDPOINT);
    const ws = new WebSocket(WS_ENDPOINT);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
      hasConnectedOnceRef.current = true;
      reconnectAttemptsRef.current = 0;
      
      // Clear grace period timer if it exists
      if (connectionGracePeriodRef.current) {
        clearTimeout(connectionGracePeriodRef.current);
        connectionGracePeriodRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            console.log('[WS] Server acknowledged connection');
            break;

          case 'metadata':
            if (data.dataCards) {
              collectedDataRef.current.dataCards = data.dataCards;
              setStreamingState(prev => ({
                ...prev,
                dataCards: data.dataCards,
                metadata: data,
              }));
            }
            if (data.eventData) {
              collectedDataRef.current.eventData = data.eventData;
            }
            break;

          case 'thinking':
            const newStep: ThinkingStep = {
              phase: data.phase || 'thinking',
              content: data.content,
              timestamp: Date.now(),
            };
            collectedDataRef.current.thinking.push(newStep);
            setStreamingState(prev => ({
              ...prev,
              thinking: [...prev.thinking, newStep],
            }));
            break;

          case 'content':
            contentBufferRef.current += data.content;
            collectedDataRef.current.content += data.content;
            processContentBuffer(false);
            break;

          case 'chart_block':
            const chartBlock: ContentBlock = {
              id: generateBlockId('chart', collectedDataRef.current.blockIdCounter++),
              type: 'chart',
              content: '',
              data: { symbol: data.symbol, timeRange: data.timeRange },
            };
            collectedDataRef.current.blocks.push(chartBlock);
            setStreamingState(prev => ({
              ...prev,
              blocks: [...prev.blocks, chartBlock],
            }));
            break;

          case 'done':
            processContentBuffer(true);
            
            const assistantMessage: Message = {
              id: `assistant-${generateMessageId()}`,
              role: 'assistant',
              content: collectedDataRef.current.content,
              contentBlocks: collectedDataRef.current.blocks,
              dataCards: collectedDataRef.current.dataCards,
              eventData: collectedDataRef.current.eventData,
              timestamp: new Date(),
              thinkingSteps: collectedDataRef.current.thinking,
            };

            // Replace the placeholder assistant message with the final one
            setMessages(prev => {
              const newMessages = [...prev];
              // Find and replace the last assistant message (placeholder)
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].role === 'assistant') {
                  newMessages[i] = assistantMessage;
                  break;
                }
              }
              return newMessages;
            });
            
            setIsStreaming(false);
            setStreamingState(prev => ({
              ...prev,
              isStreaming: false,
            }));
            break;

          case 'error':
            const errorMsg = data.error || 'An error occurred';
            setStreamingState(prev => ({ ...prev, error: errorMsg }));
            
            const errorAssistantMessage: Message = {
              id: `assistant-${generateMessageId()}`,
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              error: errorMsg,
            };
            
            // Replace the placeholder assistant message with the error one
            setMessages(prev => {
              const newMessages = [...prev];
              // Find and replace the last assistant message (placeholder)
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].role === 'assistant') {
                  newMessages[i] = errorAssistantMessage;
                  break;
                }
              }
              return newMessages;
            });
            
            setIsStreaming(false);
            setStreamingState(prev => ({
              ...prev,
              isStreaming: false,
            }));
            break;
        }
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      
      // Clear grace period timer if it exists
      if (connectionGracePeriodRef.current) {
        clearTimeout(connectionGracePeriodRef.current);
        connectionGracePeriodRef.current = null;
      }
      
      // Only show disconnected state after grace period (if we've connected before)
      // or immediately if we've never connected
      if (hasConnectedOnceRef.current) {
        // Add a small delay before showing disconnected state
        connectionGracePeriodRef.current = setTimeout(() => {
          setIsConnected(false);
        }, 500); // 500ms grace period
      } else {
        // First connection attempt - don't show disconnected immediately
        connectionGracePeriodRef.current = setTimeout(() => {
          setIsConnected(false);
        }, 2000); // 2 second grace period for initial connection
      }
      
      wsRef.current = null;

      // Don't attempt reconnection if component is unmounting
      if (isUnmountingRef.current) {
        console.log('[WS] Component unmounting, skipping reconnection');
        return;
      }

      // Attempt reconnection
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        console.log(`[WS] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      } else {
        console.error('[WS] Max reconnection attempts reached');
      }
    };
  }, []); // Empty deps - function is stable

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      console.log('[WS] Component unmounting, cleaning up');
      isUnmountingRef.current = true;
      
      if (connectionGracePeriodRef.current) {
        clearTimeout(connectionGracePeriodRef.current);
        connectionGracePeriodRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only connect once on mount

  // Note: Message persistence is handled by useConversationHistory in CatalystCopilot

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      onError?.('Not connected to server. Reconnecting...');
      // Don't call connect here - let the auto-reconnect handle it
      return;
    }

    lastMessageRef.current = content;

    // Reset collected data
    collectedDataRef.current = {
      thinking: [],
      content: '',
      blocks: [],
      dataCards: [],
      eventData: {},
      blockIdCounter: 0,
    };
    contentBufferRef.current = '';

    // Create user message
    const userMessage: Message = {
      id: `user-${generateMessageId()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Create placeholder assistant message for streaming
    const placeholderAssistantMessage: Message = {
      id: `assistant-${generateMessageId()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, placeholderAssistantMessage]);
    setIsStreaming(true);
    setStreamingState({
      isStreaming: true,
      blocks: [],
      thinking: [],
      dataCards: [],
      metadata: null,
      error: null,
    });

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Send message through WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      message: content,
      conversationHistory: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      selectedTickers,
      timezone: userTimezone,
    }));

  }, [messages, isStreaming, selectedTickers, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingState({
      isStreaming: false,
      blocks: [],
      thinking: [],
      dataCards: [],
      metadata: null,
      error: null,
    });
    contentBufferRef.current = '';
    collectedDataRef.current = {
      thinking: [],
      content: '',
      blocks: [],
      dataCards: [],
      eventData: {},
      blockIdCounter: 0,
    };
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (lastMessageRef.current && !isStreaming) {
      // Remove the last error message if present
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.error) {
          return prev.slice(0, -2); // Remove both error and user message
        }
        return prev.slice(0, -1); // Remove just the user message
      });
      await sendMessage(lastMessageRef.current);
    }
  }, [isStreaming, sendMessage]);

  return {
    messages,
    isStreaming,
    streamingState,
    sendMessage,
    clearMessages,
    retryLastMessage,
    isConnected,
    setMessages,
  };
}

export default useStreamingChat;
