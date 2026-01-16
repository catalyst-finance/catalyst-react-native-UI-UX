/**
 * PriceTargetModal - React Native modal for displaying analyst price targets
 * 
 * Shows a list of analyst price targets sorted by highest or lowest values.
 * Displays analyst firm, target price, and published date.
 * 
 * Feature: analyst-price-targets
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
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

type SortMode = 'price' | 'date';

export function PriceTargetModal({
  isOpen,
  onClose,
  title,
  priceTargets = [],
  type,
}: PriceTargetModalProps) {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const [sortMode, setSortMode] = useState<SortMode>('price');
  
  // Reset sort mode when modal is closed
  React.useEffect(() => {
    if (!isOpen) {
      setSortMode('price');
    }
  }, [isOpen]);

  // Filter and sort based on type and sort mode
  const sortedTargets = (priceTargets || [])
    .filter((t) => t && typeof t.price_target === 'number')
    .sort((a, b) => {
      if (sortMode === 'date') {
        // Newest to oldest by published_date
        return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
      } else {
        // Sort by price
        if (type === 'high') {
          return b.price_target - a.price_target; // Highest to lowest
        } else {
          return a.price_target - b.price_target; // Lowest to highest
        }
      }
    })
    .slice(0, 50); // Take top/bottom 50

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const renderItem = ({ item: target, index }: { item: PriceTarget; index: number }) => (
    <View
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
          { color: themeColors.mutedForeground },
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
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Background overlay - tap to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        
        {/* Modal content */}
        <View
          style={[styles.modalContainer, { backgroundColor: themeColors.card }]}
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
              {sortMode === 'date' ? 'Latest Price Targets' : `${title} Price Targets`}
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => setSortMode(sortMode === 'price' ? 'date' : 'price')}
                style={styles.sortButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={sortMode === 'price' ? 'calendar-outline' : 'stats-chart-outline'}
                  size={20}
                  color={themeColors.foreground}
                />
              </TouchableOpacity>
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
          </View>

          {/* Content - FlatList for proper scrolling */}
          {sortedTargets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: themeColors.mutedForeground },
                ]}
              >
                No price targets available
              </Text>
            </View>
          ) : (
            <FlatList
              data={sortedTargets}
              renderItem={renderItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={true}
            />
          )}
        </View>
      </View>
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
    maxWidth: 448,
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  targetIndex: {
    fontWeight: '500',
    minWidth: 24,
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
