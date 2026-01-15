/**
 * ChatInput.tsx
 * 
 * Text input component for the Catalyst Copilot chat interface.
 * Features multi-line support, send button, and keyboard handling.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors as designColors } from '../../constants/design-tokens';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder = 'Ask about your portfolio...',
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? designColors.dark : designColors.light;
  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState(40);

  const canSend = value.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (canSend) {
      onSend();
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    // On tablets with keyboards, Enter sends (Shift+Enter for newline)
    if (Platform.OS === 'web' || Platform.OS === 'ios' || Platform.OS === 'android') {
      // This is handled differently on mobile - Enter creates newline by default
      // We could add shift detection for tablets if needed
    }
  };

  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(Math.max(40, event.nativeEvent.contentSize.height), 120);
    setInputHeight(newHeight);
  };

  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    inputBackground: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    placeholder: isDark ? '#888888' : '#999999',
    border: isDark ? '#333333' : '#e0e0e0',
    sendButton: themeColors.primary,
    sendButtonDisabled: isDark ? '#444444' : '#cccccc',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: colors.text,
              height: inputHeight,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline
          editable={!disabled}
          onContentSizeChange={handleContentSizeChange}
          onKeyPress={handleKeyPress}
          returnKeyType="default"
          blurOnSubmit={false}
          textAlignVertical="center"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? colors.sendButton : colors.sendButtonDisabled,
            },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend }}
        >
          <Ionicons
            name="send"
            size={18}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingRight: 8,
    maxHeight: 120,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});

export default ChatInput;
