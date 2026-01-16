/**
 * PriceTargetModal - React Native modal for displaying analyst price targets
 * 
 * Shows a list of analyst price targets sorted by highest or lowest values.
 * Displays analyst firm, target price, and published date.
 * 
 * Feature: analyst-price-targets
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PriceTarget } from '../../services/PriceTargetsService';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';

interface PriceTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  priceTargets: PriceTarget[];
  type: 'high' | 'low';
}

export function PriceTargetModal({
  isOpen,
  onClose,
  title,
  priceTargets,
  type,
}: PriceTargetModalProps) {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // Debug logging
  console.log('[PriceTargetModal] isOpen:', isOpen);
  console.log('[PriceTargetModal] priceTargets count:', priceTargets?.length || 0);
  console.log('[PriceTargetModal] type:', type);
  console.log('[PriceTargetModal] priceTargets:', JSON.stringify(priceTargets, null, 2));

  // Filter and sort based on type
  const sortedTargets = [...priceTargets]
    .filter((t) => t && typeof t.price_target === 'number')
    .sort((a, b) => {
      if (type === 'high') {
        return b.price_target - a.price_target; // Highest to lowest
      } else {
        return a.price_target - b.price_target; // Lowest to highest
      }
    })
    .slice(0, 10); // Take top/bottom 10
  
  console.log('[PriceTargetModal] sortedTargets count:', sortedTargets.length);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContainer, { backgroundColor: themeColors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: themeColors.border },
            ]}
          >
            <Text
              style={[
                styles.headerTitle,
                { color: themeColors.foreground },
              ]}
            >
              {title} Price Targets
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={themeColors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {sortedTargets.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  { color: themeColors.mutedForeground },
                ]}
              >
                No price targets available
              </Text>
            ) : (
              <View style={styles.targetsList}>
                {sortedTargets.map((target, index) => (
                  <View
                    key={target._id}
                    style={[
                      styles.targetItem,
                      index < sortedTargets.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: themeColors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.targetIndex,
                        { color: themeColors.muted },
                      ]}
                    >
                      {index + 1}.
                    </Text>
                    <View style={styles.targetDetails}>
                      <View style={styles.targetRow}>
                        <Text
                          style={[
                            styles.analystFirm,
                            { color: themeColors.foreground },
                          ]}
                          numberOfLines={1}
                        >
                          {target.analyst_firm}
                        </Text>
                        <Text
                          style={[
                            styles.targetPrice,
                            { color: themeColors.foreground },
                          ]}
                        >
                          ${target.price_target}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.publishedDate,
                          { color: themeColors.mutedForeground },
                        ]}
                      >
                        {formatDate(target.published_date)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 448, // max-w-md equivalent
    maxHeight: '80%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
  },
  targetsList: {
    gap: 0,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  targetIndex: {
    fontWeight: '500',
    minWidth: 20,
    fontSize: 14,
  },
  targetDetails: {
    flex: 1,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  analystFirm: {
    fontWeight: '500',
    fontSize: 14,
    flex: 1,
  },
  targetPrice: {
    fontWeight: '600',
    fontSize: 14,
  },
  publishedDate: {
    fontSize: 12,
    marginTop: 2,
  },
});
