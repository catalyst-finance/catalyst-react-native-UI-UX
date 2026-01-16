/**
 * ManualPositionEntry Component
 * 
 * Full-screen modal for manually entering stock positions.
 * Allows users to search for stocks and add shares with cost basis.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import StockAPI from '../../services/supabase/StockAPI';

export interface ManualPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
}

interface ManualPositionEntryProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (positions: ManualPosition[]) => void;
  existingPositions?: ManualPosition[];
  isAddingToExisting?: boolean;
}

interface SearchResult {
  symbol: string;
  company: string;
}

export const ManualPositionEntry: React.FC<ManualPositionEntryProps> = ({
  visible,
  onClose,
  onComplete,
  existingPositions = [],
  isAddingToExisting = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const [positions, setPositions] = useState<ManualPosition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setPositions([]);
      setSearchQuery('');
      setSelectedStock(null);
      setShares('');
      setAvgCost('');
      setShowSearch(false);
    }
  }, [visible]);

  // Search for stocks
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchStocks = async () => {
      setIsSearching(true);
      try {
        const results = await StockAPI.searchStocks(searchQuery, 10);
        setSearchResults(results.map(r => ({ symbol: r.symbol, company: r.company })));
      } catch (error) {
        console.error('Error searching stocks:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchStocks, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectStock = (stock: SearchResult) => {
    setSelectedStock({ symbol: stock.symbol, name: stock.company });
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleAddPosition = () => {
    if (!selectedStock || !shares || !avgCost) return;

    const sharesNum = parseFloat(shares);
    const avgCostNum = parseFloat(avgCost);

    if (isNaN(sharesNum) || isNaN(avgCostNum) || sharesNum <= 0 || avgCostNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for shares and cost.');
      return;
    }

    // Check if position already exists
    const existingIndex = positions.findIndex(p => p.symbol === selectedStock.symbol);

    if (existingIndex >= 0) {
      // Update existing position (average the cost basis)
      const existing = positions[existingIndex];
      const totalShares = existing.shares + sharesNum;
      const totalValue = (existing.shares * existing.avgCost) + (sharesNum * avgCostNum);
      const newAvgCost = totalValue / totalShares;

      const updatedPositions = [...positions];
      updatedPositions[existingIndex] = {
        ...existing,
        shares: totalShares,
        avgCost: newAvgCost,
      };
      setPositions(updatedPositions);
    } else {
      // Add new position
      const newPosition: ManualPosition = {
        id: `manual-${Date.now()}`,
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        shares: sharesNum,
        avgCost: avgCostNum,
      };
      setPositions([...positions, newPosition]);
    }

    // Reset form
    setSelectedStock(null);
    setShares('');
    setAvgCost('');
  };

  const handleRemovePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
  };

  const handleComplete = () => {
    if (positions.length > 0) {
      onComplete(positions);
    }
  };

  const calculateTotalValue = () => {
    return positions.reduce((total, pos) => total + (pos.shares * pos.avgCost), 0);
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.searchResultItem, { borderBottomColor: themeColors.border }]}
      onPress={() => handleSelectStock(item)}
    >
      <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
        <Text style={[styles.tickerBadgeText, { color: themeColors.primaryForeground }]}>
          {item.symbol}
        </Text>
      </View>
      <Text style={[styles.companyName, { color: themeColors.foreground }]} numberOfLines={1}>
        {item.company}
      </Text>
    </TouchableOpacity>
  );

  const renderPosition = ({ item }: { item: ManualPosition }) => {
    const totalValue = item.shares * item.avgCost;

    return (
      <View style={[styles.positionCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.positionHeader}>
          <View style={styles.positionLeft}>
            <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
              <Text style={[styles.tickerBadgeText, { color: themeColors.primaryForeground }]}>
                {item.symbol}
              </Text>
            </View>
            <Text style={[styles.positionName, { color: themeColors.mutedForeground }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemovePosition(item.id)}
            style={styles.removeButton}
          >
            <Ionicons name="trash-outline" size={18} color="#FF5000" />
          </TouchableOpacity>
        </View>

        <View style={styles.positionDetails}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: themeColors.mutedForeground }]}>Shares</Text>
            <Text style={[styles.detailValue, { color: themeColors.foreground }]}>{item.shares}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: themeColors.mutedForeground }]}>Avg Cost</Text>
            <Text style={[styles.detailValue, { color: themeColors.foreground }]}>${item.avgCost.toFixed(2)}</Text>
          </View>
          <View style={[styles.detailItem, styles.detailItemRight]}>
            <Text style={[styles.detailLabel, { color: themeColors.mutedForeground }]}>Total Value</Text>
            <Text style={[styles.detailValue, { color: themeColors.foreground }]}>
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: themeColors.foreground }]}>
                {isAddingToExisting ? 'Add Manual Positions' : 'Manual Portfolio Setup'}
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.mutedForeground }]}>
                {isAddingToExisting ? 'Add more positions to your portfolio' : 'Add your positions manually'}
              </Text>
            </View>
          </View>

          {/* Content */}
          <FlatList
            data={positions}
            keyExtractor={(item) => item.id}
            renderItem={renderPosition}
            ListHeaderComponent={
              <View style={styles.formContainer}>
                {/* Instructions */}
                <View style={[styles.infoBox, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}>
                  <Ionicons name="calculator-outline" size={18} color={themeColors.primary} />
                  <Text style={[styles.infoText, { color: themeColors.mutedForeground }]}>
                    Manually enter your stock positions. You can add multiple lots of the same stock.
                  </Text>
                </View>

                {/* Add Position Form */}
                <View style={[styles.formCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  <Text style={[styles.formTitle, { color: themeColors.foreground }]}>Add Position</Text>

                  {/* Stock Selection */}
                  <Text style={[styles.label, { color: themeColors.foreground }]}>Stock</Text>
                  {selectedStock ? (
                    <View style={[styles.selectedStock, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}>
                      <View>
                        <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
                          <Text style={[styles.tickerBadgeText, { color: themeColors.primaryForeground }]}>
                            {selectedStock.symbol}
                          </Text>
                        </View>
                        <Text style={[styles.selectedStockName, { color: themeColors.mutedForeground }]}>
                          {selectedStock.name}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => { setSelectedStock(null); setShowSearch(true); }}>
                        <Text style={[styles.changeButton, { color: themeColors.primary }]}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : showSearch ? (
                    <View>
                      <View style={[styles.searchInputContainer, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}>
                        <Ionicons name="search" size={18} color={themeColors.mutedForeground} />
                        <TextInput
                          style={[styles.searchInput, { color: themeColors.foreground }]}
                          placeholder="Search by symbol or company..."
                          placeholderTextColor={themeColors.mutedForeground}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          autoFocus
                        />
                      </View>
                      {searchQuery.length > 0 && (
                        <View style={[styles.searchResults, { borderColor: themeColors.border }]}>
                          {isSearching ? (
                            <View style={styles.searchingContainer}>
                              <ActivityIndicator size="small" color={themeColors.primary} />
                              <Text style={[styles.searchingText, { color: themeColors.mutedForeground }]}>Searching...</Text>
                            </View>
                          ) : searchResults.length > 0 ? (
                            <FlatList
                              data={searchResults}
                              keyExtractor={(item) => item.symbol}
                              renderItem={renderSearchResult}
                              style={styles.searchResultsList}
                              nestedScrollEnabled
                            />
                          ) : (
                            <View style={styles.noResultsContainer}>
                              <Text style={[styles.noResultsText, { color: themeColors.mutedForeground }]}>
                                No stocks found for "{searchQuery}"
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.searchButton, { borderColor: themeColors.border }]}
                      onPress={() => setShowSearch(true)}
                    >
                      <Ionicons name="search" size={18} color={themeColors.mutedForeground} />
                      <Text style={[styles.searchButtonText, { color: themeColors.mutedForeground }]}>
                        Search for a stock...
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Shares and Cost */}
                  {selectedStock && (
                    <>
                      <View style={styles.inputRow}>
                        <View style={styles.inputHalf}>
                          <Text style={[styles.label, { color: themeColors.foreground }]}>Number of Shares</Text>
                          <View style={[styles.inputContainer, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}>
                            <Ionicons name="grid-outline" size={18} color={themeColors.mutedForeground} />
                            <TextInput
                              style={[styles.input, { color: themeColors.foreground }]}
                              placeholder="0"
                              placeholderTextColor={themeColors.mutedForeground}
                              value={shares}
                              onChangeText={setShares}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                        <View style={styles.inputHalf}>
                          <Text style={[styles.label, { color: themeColors.foreground }]}>Avg Cost per Share</Text>
                          <View style={[styles.inputContainer, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}>
                            <Text style={[styles.dollarSign, { color: themeColors.mutedForeground }]}>$</Text>
                            <TextInput
                              style={[styles.input, { color: themeColors.foreground }]}
                              placeholder="0.00"
                              placeholderTextColor={themeColors.mutedForeground}
                              value={avgCost}
                              onChangeText={setAvgCost}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                      </View>

                      {/* Preview */}
                      {shares && avgCost && !isNaN(parseFloat(shares)) && !isNaN(parseFloat(avgCost)) && (
                        <View style={[styles.previewBox, { backgroundColor: themeColors.muted }]}>
                          <Text style={[styles.previewLabel, { color: themeColors.mutedForeground }]}>Total Investment</Text>
                          <Text style={[styles.previewValue, { color: themeColors.foreground }]}>
                            ${(parseFloat(shares) * parseFloat(avgCost)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          { backgroundColor: themeColors.primary },
                          (!selectedStock || !shares || !avgCost) && styles.addButtonDisabled,
                        ]}
                        onPress={handleAddPosition}
                        disabled={!selectedStock || !shares || !avgCost}
                      >
                        <Ionicons name="add" size={20} color={themeColors.primaryForeground} />
                        <Text style={[styles.addButtonText, { color: themeColors.primaryForeground }]}>Add Position</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Positions Header */}
                {positions.length > 0 && (
                  <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
                    Your Positions ({positions.length})
                  </Text>
                )}
              </View>
            }
            ListFooterComponent={
              positions.length > 0 ? (
                <View style={styles.footer}>
                  {/* Summary */}
                  <View style={[styles.summaryCard, { backgroundColor: themeColors.primary + '10', borderColor: themeColors.primary + '30' }]}>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: themeColors.mutedForeground }]}>Total Cost Basis</Text>
                      <Text style={[styles.summaryValue, { color: themeColors.foreground }]}>
                        ${calculateTotalValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  {/* Complete Button */}
                  <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: themeColors.primary }]}
                    onPress={handleComplete}
                  >
                    <Ionicons name="save-outline" size={20} color={themeColors.primaryForeground} />
                    <Text style={[styles.completeButtonText, { color: themeColors.primaryForeground }]}>
                      {isAddingToExisting
                        ? `Add ${positions.length} Position${positions.length > 1 ? 's' : ''}`
                        : `Save Portfolio (${positions.length} positions)`}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 40,
  },
  formContainer: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  formCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  searchButtonText: {
    fontSize: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  searchResults: {
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 200,
    marginBottom: 16,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  searchingText: {
    fontSize: 14,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
  },
  selectedStock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  selectedStockName: {
    fontSize: 13,
    marginTop: 4,
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  tickerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tickerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  companyName: {
    flex: 1,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  previewBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 13,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  positionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  positionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  positionName: {
    fontSize: 13,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  positionDetails: {
    flexDirection: 'row',
  },
  detailItem: {
    flex: 1,
  },
  detailItemRight: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  footer: {
    padding: 16,
  },
  summaryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManualPositionEntry;
