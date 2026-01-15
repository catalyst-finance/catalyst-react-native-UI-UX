/**
 * MarkdownText.tsx
 * 
 * Renders markdown-formatted text with support for:
 * - Bold (**text**), Italic (*text*), Bold+Italic (***text***)
 * - Links [text](url)
 * - Headers (# ## ###)
 * - Lists (- or •)
 * - Inline code (`code`)
 * - Source badges [source]
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors as designColors } from '../../constants/design-tokens';
import { DataCard } from './lib/StreamBlockTypes';

interface MarkdownTextProps {
  text: string;
  dataCards?: DataCard[];
  onEventClick?: (event: any) => void;
  onTickerClick?: (ticker: string) => void;
}

export function MarkdownText({
  text,
  dataCards: _dataCards,
  onEventClick: _onEventClick,
  onTickerClick,
}: MarkdownTextProps) {
  const { isDark } = useTheme();
  const themeColors = isDark ? designColors.dark : designColors.light;

  const colors = {
    text: isDark ? '#ffffff' : '#000000',
    secondaryText: isDark ? '#888888' : '#666666',
    link: themeColors.primary,
    code: isDark ? '#333333' : '#f0f0f0',
    codeText: isDark ? '#e0e0e0' : '#333333',
    badge: isDark ? '#333333' : '#f0f0f0',
    badgeText: isDark ? '#888888' : '#666666',
    badgeBorder: isDark ? '#444444' : '#e0e0e0',
  };

  // Pre-process text to normalize it
  const preprocessText = (input: string): string => {
    let result = input;
    
    // Remove block-level markers
    result = result
      .replace(/\[VIEW_ARTICLE:[^\]]+\]/g, '')
      .replace(/\[IMAGE_CARD:[^\]]+\]/g, '')
      .replace(/\[EVENT_CARD:[^\]]+\]/g, '')
      .replace(/\[VIEW_CHART:[^\]]+\]/g, '')
      .replace(/\[HR\]/g, '');
    
    // Normalize line endings
    result = result.replace(/\r\n/g, '\n');
    
    // Process lines - join indented continuations with their parent list items
    // Backend format:
    // 1. **Title**
    //    Description text that continues...
    const lines = result.split('\n');
    const processed: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines but preserve paragraph breaks
      if (trimmed === '') {
        processed.push('');
        continue;
      }
      
      // Check if this line is indented (continuation of previous)
      const isIndented = /^[ \t]+/.test(line) && !line.startsWith('   -') && !line.startsWith('   •');
      
      if (isIndented && processed.length > 0) {
        // This is a continuation line - append to previous line
        const lastIndex = processed.length - 1;
        const lastLine = processed[lastIndex];
        
        // Only join if the previous line isn't empty
        if (lastLine.trim() !== '') {
          processed[lastIndex] = lastLine + ' ' + trimmed;
          continue;
        }
      }
      
      // Regular line - add as-is (trimmed)
      processed.push(trimmed);
    }
    
    // Clean up multiple consecutive empty lines
    const cleaned: string[] = [];
    let lastWasEmpty = false;
    for (const line of processed) {
      if (line === '') {
        if (!lastWasEmpty) {
          cleaned.push('');
        }
        lastWasEmpty = true;
      } else {
        cleaned.push(line);
        lastWasEmpty = false;
      }
    }
    
    return cleaned.join('\n');
  };

  // Parse inline formatting within a single text segment
  const parseInlineFormatting = (content: string, keyPrefix: string = ''): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let key = 0;
    let remaining = content;

    while (remaining.length > 0) {
      // Bold+italic (***text***)
      let match = remaining.match(/^\*\*\*(.+?)\*\*\*/);
      if (match) {
        elements.push(
          <Text key={`${keyPrefix}bi-${key++}`} style={styles.boldItalic}>
            {match[1]}
          </Text>
        );
        remaining = remaining.substring(match[0].length);
        continue;
      }

      // Bold (**text**)
      match = remaining.match(/^\*\*(.+?)\*\*/);
      if (match) {
        elements.push(
          <Text key={`${keyPrefix}bold-${key++}`} style={styles.bold}>
            {match[1]}
          </Text>
        );
        remaining = remaining.substring(match[0].length);
        continue;
      }

      // Italic (*text*) - not ** or ***
      match = remaining.match(/^\*([^*\s][^*]*?)\*/);
      if (match) {
        elements.push(
          <Text key={`${keyPrefix}italic-${key++}`} style={styles.italic}>
            {match[1]}
          </Text>
        );
        remaining = remaining.substring(match[0].length);
        continue;
      }

      // Link [text](url)
      match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const linkText = match[1];
        const linkUrl = match[2];
        const isSourceCitation = /\b(10-[KQ]|8-K|Form\s+[0-9]+|S-[0-9]+|DEF\s+14A|13F|424B)\b/i.test(linkText);
        
        if (isSourceCitation) {
          elements.push(
            <Text
              key={`${keyPrefix}source-${key++}`}
              style={[styles.sourceBadgeInline, { color: colors.badgeText, backgroundColor: colors.badge }]}
              onPress={() => Linking.openURL(linkUrl)}
            >
              {linkText}
            </Text>
          );
        } else {
          elements.push(
            <Text
              key={`${keyPrefix}link-${key++}`}
              style={[styles.link, { color: colors.link }]}
              onPress={() => Linking.openURL(linkUrl)}
            >
              {linkText}
            </Text>
          );
        }
        remaining = remaining.substring(match[0].length);
        continue;
      }

      // Badge [text] (without URL)
      match = remaining.match(/^\[([^\]]+)\](?!\()/);
      if (match) {
        elements.push(
          <Text
            key={`${keyPrefix}badge-${key++}`}
            style={[styles.sourceBadgeInline, { color: colors.badgeText, backgroundColor: colors.badge }]}
          >
            {match[1]}
          </Text>
        );
        remaining = remaining.substring(match[0].length);
        continue;
      }

      // Ticker ($TICKER)
      match = remaining.match(/^\$([A-Z]{1,5})\b/);
      if (match) {
        elements.push(
          <Text
            key={`${keyPrefix}ticker-${key++}`}
            style={[styles.ticker, { color: colors.link }]}
            onPress={() => onTickerClick?.(match![1])}
          >
            ${match[1]}
          </Text>
        );
        remaining = remaining.substring(match[0].length);
        continue;
      }

      // Inline code (`code`)
      match = remaining.match(/^`([^`]+)`/);
      if (match) {
        elements.push(
          <Text
            key={`${keyPrefix}code-${key++}`}
            style={[styles.inlineCode, { backgroundColor: colors.code, color: colors.codeText }]}
          >
            {match[1]}
          </Text>
        );
        remaining = remaining.substring(match[0].length);
        continue;
      }

      // Find next special character
      const nextSpecial = remaining.search(/[\[*`$]/);
      if (nextSpecial === -1) {
        // No more special characters
        if (remaining) {
          elements.push(remaining);
        }
        break;
      } else if (nextSpecial === 0) {
        // Special char at start but didn't match - add as text
        elements.push(remaining[0]);
        remaining = remaining.substring(1);
      } else {
        // Add text before special character
        elements.push(remaining.substring(0, nextSpecial));
        remaining = remaining.substring(nextSpecial);
      }
    }

    return elements.length > 0 ? elements : [content];
  };

  // Render the content
  const renderContent = () => {
    const processedText = preprocessText(text);
    const lines = processedText.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed) return; // Skip empty lines

      // Headers
      if (trimmed.startsWith('### ')) {
        elements.push(
          <Text key={`h3-${key++}`} style={[styles.h3, { color: colors.text }]}>
            {parseInlineFormatting(trimmed.substring(4), `h3-${lineIndex}-`)}
          </Text>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <Text key={`h2-${key++}`} style={[styles.h2, { color: colors.text }]}>
            {parseInlineFormatting(trimmed.substring(3), `h2-${lineIndex}-`)}
          </Text>
        );
        return;
      }
      if (trimmed.startsWith('# ')) {
        elements.push(
          <Text key={`h1-${key++}`} style={[styles.h1, { color: colors.text }]}>
            {parseInlineFormatting(trimmed.substring(2), `h1-${lineIndex}-`)}
          </Text>
        );
        return;
      }

      // Numbered list items (1. content)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        elements.push(
          <View key={`li-${key++}`} style={styles.listItem}>
            <Text style={[styles.listNumber, { color: colors.text }]}>
              {numberedMatch[1]}.
            </Text>
            <Text style={[styles.listItemText, { color: colors.text }]}>
              {parseInlineFormatting(numberedMatch[2], `li-${lineIndex}-`)}
            </Text>
          </View>
        );
        return;
      }

      // Bullet list items
      const bulletMatch = trimmed.match(/^[-•]\s+(.+)$/);
      if (bulletMatch) {
        elements.push(
          <View key={`li-${key++}`} style={styles.listItem}>
            <Text style={[styles.bullet, { color: colors.text }]}>•</Text>
            <Text style={[styles.listItemText, { color: colors.text }]}>
              {parseInlineFormatting(bulletMatch[1], `li-${lineIndex}-`)}
            </Text>
          </View>
        );
        return;
      }

      // Regular paragraph
      elements.push(
        <Text key={`p-${key++}`} style={[styles.paragraph, { color: colors.text }]}>
          {parseInlineFormatting(trimmed, `p-${lineIndex}-`)}
        </Text>
      );
    });

    return elements;
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  h1: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  boldItalic: {
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  link: {
    textDecorationLine: 'underline',
  },
  ticker: {
    fontWeight: '600',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    width: 16,
  },
  listNumber: {
    fontSize: 15,
    lineHeight: 22,
    width: 20,
    marginRight: 4,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  sourceBadgeInline: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default MarkdownText;
