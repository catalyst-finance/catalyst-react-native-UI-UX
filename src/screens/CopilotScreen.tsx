/**
 * CopilotScreen.tsx
 * 
 * Screen wrapper for the Catalyst Copilot AI chat assistant.
 * Handles navigation and passes through event handlers.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CatalystCopilot } from '../components/catalyst-copilot';
import { RootStackParamList } from '../navigation/types';
import { 
  useConversationHistory, 
  ConversationSummary 
} from '../components/catalyst-copilot/hooks/useConversationHistory';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const CopilotScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  const {
    conversations,
    loadConversation,
    deleteConversation,
    startNewConversation,
  } = useConversationHistory();

  // Animate modal content slide up
  useEffect(() => {
    if (showHistory) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showHistory, slideAnim]);

  const handleTickerClick = useCallback((ticker: string) => {
    navigation.navigate('StockDetail', { ticker });
  }, [navigation]);

  const handleEventClick = useCallback((event: any) => {
    if (event?.ticker) {
      navigation.navigate('StockDetail', { ticker: event.ticker });
    }
  }, [navigation]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowHistory(false);
  }, []);

  const handleNewConversation = useCallback(() => {
    const newId = startNewConversation();
    setCurrentConversationId(newId);
    setShowHistory(false);
  }, [startNewConversation]);

  const handleDeleteConversation = useCallback((conversationId: string) => {
    deleteConversation(conversationId);
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }
  }, [deleteConversation, currentConversationId]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const colors = {
    background: isDark ? '#121212' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    secondaryText: isDark ? '#888888' : '#666666',
    border: isDark ? '#333333' : '#e0e0e0',
    modalBackground: isDark ? '#1a1a1a' : '#ffffff',
    itemBackground: isDark ? '#2a2a2a' : '#f5f5f5',
    overlay: 'rgba(0, 0, 0, 0.5)',
  };

  const renderConversationItem = ({ item }: { item: ConversationSummary }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: colors.itemBackground }]}
      onPress={() => handleSelectConversation(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.conversationContent}>
        <Text 
          style={[styles.conversationTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text 
          style={[styles.conversationPreview, { color: colors.secondaryText }]}
          numberOfLines={2}
        >
          {item.preview}
        </Text>
        <Text style={[styles.conversationDate, { color: colors.secondaryText }]}>
          {formatDate(item.lastUpdated)} · {item.messageCount} messages
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteConversation(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={colors.secondaryText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Catalyst Copilot
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleNewConversation}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowHistory(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="time-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <CatalystCopilot
        onTickerClick={handleTickerClick}
        onEventClick={handleEventClick}
        conversationId={currentConversationId}
        onConversationIdChange={setCurrentConversationId}
      />

      {/* Chat History Modal */}
      <Modal
        visible={showHistory}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable 
            style={StyleSheet.absoluteFill}
            onPress={() => setShowHistory(false)}
          />
          <Animated.View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: colors.modalBackground,
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                }],
              }
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Chat History
              </Text>
              <TouchableOpacity
                onPress={() => setShowHistory(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {conversations.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.secondaryText} />
                <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                  No conversations yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                renderItem={renderConversationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.conversationList}
                showsVerticalScrollIndicator={false}
              />
            )}
            
            <TouchableOpacity
              style={[styles.newChatButton, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}
              onPress={handleNewConversation}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.text} />
              <Text style={[styles.newChatText, { color: colors.text }]}>
                Start New Chat
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  conversationList: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: 13,
    marginBottom: 4,
  },
  conversationDate: {
    fontSize: 11,
  },
  deleteButton: {
    padding: 8,
  },
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default CopilotScreen;
