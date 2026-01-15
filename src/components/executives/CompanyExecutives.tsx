/**
 * CompanyExecutives Component
 * Displays company executives and board members with toggle between views
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import StockAPI, { CompanyExecutive as ExecutiveData } from '../../services/supabase/StockAPI';

interface CompanyExecutivesProps {
  ticker: string;
  companyName?: string;
}

export const CompanyExecutives: React.FC<CompanyExecutivesProps> = ({
  ticker,
  companyName,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const [executives, setExecutives] = useState<ExecutiveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'executives' | 'board'>('executives');

  useEffect(() => {
    loadExecutives();
  }, [ticker]);

  const loadExecutives = async () => {
    try {
      setIsLoading(true);
      const data = await StockAPI.getCompanyExecutives(ticker, 100);
      setExecutives(data);
    } catch (err) {
      console.error(`Error loading executives for ${ticker}:`, err);
      setExecutives([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine if someone is a board member
  const isBoardMember = (position: string | null): boolean => {
    if (!position) return false;
    const lowerPos = position.toLowerCase();
    return lowerPos.includes('director') || lowerPos.includes('chairman') || lowerPos.includes('vice chair');
  };

  // Helper to determine if someone is an executive
  const isExecutive = (position: string | null): boolean => {
    if (!position) return false;
    const lowerPos = position.toLowerCase();
    return (
      lowerPos.includes('chief') ||
      lowerPos.includes('president') ||
      lowerPos.includes('officer') ||
      lowerPos.includes('vice president') ||
      lowerPos.includes('vp') ||
      lowerPos.includes('ceo') ||
      lowerPos.includes('cfo') ||
      lowerPos.includes('coo') ||
      lowerPos.includes('cto')
    );
  };

  // Filter executives and board members
  const executivesList = executives.filter(exec => isExecutive(exec.position));
  const boardMembers = executives.filter(exec => isBoardMember(exec.position));

  // Format name - remove title prefixes
  const formatName = (name: string): string => {
    return name.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Dame|Sir)\s+/i, '');
  };

  // Render executive/board member row
  const ExecutiveRow = ({ exec, isExpanded = false }: { exec: ExecutiveData; isExpanded?: boolean }) => {
    if (!isExpanded) {
      return (
        <View style={[styles.executiveRow, { backgroundColor: 'transparent' }]}>
          <View style={styles.executiveInfo}>
            <Text style={[styles.executiveName, { color: themeColors.foreground }]} numberOfLines={1}>
              {formatName(exec.name)}
            </Text>
            <Text style={[styles.executivePosition, { color: themeColors.mutedForeground }]}>
              {exec.position || 'N/A'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.executiveRowExpanded, { backgroundColor: 'transparent' }]}>
        <View style={styles.executiveInfoExpanded}>
          <Text style={[styles.executiveName, { color: themeColors.foreground }]}>
            {formatName(exec.name)}
          </Text>
          <Text style={[styles.executivePosition, { color: themeColors.mutedForeground }]}>
            {exec.position || 'N/A'}
          </Text>
          {exec.since && (
            <View style={styles.executiveMeta}>
              <Text style={[styles.executiveMetaText, { color: themeColors.mutedForeground }]}>
                Since {exec.since}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.card }]}>
        <View style={styles.header}>
          <View style={[styles.toggleContainer, { backgroundColor: themeColors.muted }]}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: themeColors.foreground },
              ]}
              disabled
            >
              <Text style={[styles.toggleButtonText, { color: themeColors.background }]}>
                Executives
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              disabled
            >
              <Text style={[styles.toggleButtonText, { color: themeColors.mutedForeground }]}>
                Board
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={themeColors.primary} />
          </View>
        </View>
      </View>
    );
  }

  if (executives.length === 0) {
    return null;
  }

  const currentList = view === 'executives' ? executivesList : boardMembers;
  const topList = currentList.slice(0, 5);
  const hasEitherData = executivesList.length > 0 || boardMembers.length > 0;

  if (!hasEitherData) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: themeColors.card }]}>
        <View style={styles.header}>
          <View style={[styles.toggleContainer, { backgroundColor: themeColors.muted }]}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                view === 'executives' && { backgroundColor: themeColors.foreground },
              ]}
              onPress={() => setView('executives')}
              disabled={executivesList.length === 0}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  view === 'executives'
                    ? { color: themeColors.background }
                    : { color: themeColors.mutedForeground },
                  executivesList.length === 0 && { opacity: 0.5 },
                ]}
              >
                Executives
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                view === 'board' && { backgroundColor: themeColors.foreground },
              ]}
              onPress={() => setView('board')}
              disabled={boardMembers.length === 0}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  view === 'board'
                    ? { color: themeColors.background }
                    : { color: themeColors.mutedForeground },
                  boardMembers.length === 0 && { opacity: 0.5 },
                ]}
              >
                Board
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.content}>
          {currentList.length > 0 ? (
            <>
              {topList.map((exec) => (
                <ExecutiveRow key={exec.id} exec={exec} />
              ))}

              {currentList.length > 5 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setIsModalOpen(true)}
                >
                  <Text style={[styles.showMoreText, { color: themeColors.primary }]}>
                    View All {currentList.length} {view === 'executives' ? 'Executives' : 'Board Members'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={themeColors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
                No {view === 'executives' ? 'executives' : 'board members'} data available
              </Text>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <View style={styles.modalHeaderContent}>
              <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
                <Text style={[styles.tickerBadgeText, { color: '#FFFFFF' }]}>
                  {ticker}
                </Text>
              </View>
              <Text style={[styles.modalCompanyName, { color: themeColors.foreground }]} numberOfLines={1}>
                {companyName || ticker}
              </Text>
              <Text style={[styles.modalSubtitle, { color: themeColors.mutedForeground }]}>
                All {view === 'executives' ? 'Executives' : 'Board Members'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={themeColors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {currentList.map((exec) => (
              <ExecutiveRow key={exec.id} exec={exec} isExpanded={true} />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingRight: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 2,
    alignSelf: 'flex-start',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 24,
    paddingRight: 24,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executiveRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  executiveInfo: {
    flex: 1,
    minWidth: 0,
  },
  executiveName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  executivePosition: {
    fontSize: 12,
  },
  executiveRowExpanded: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  executiveInfoExpanded: {
    flex: 1,
    minWidth: 0,
  },
  executiveMeta: {
    marginTop: 4,
  },
  executiveMetaText: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalHeaderContent: {
    flex: 1,
    minWidth: 0,
  },
  tickerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  tickerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCompanyName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
    marginLeft: 16,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
