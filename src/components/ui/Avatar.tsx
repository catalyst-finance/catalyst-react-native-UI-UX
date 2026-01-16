import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  style,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const sizeStyle = styles[size];
  const showFallback = !src || imageError;

  return (
    <View style={[styles.container, sizeStyle, style]}>
      {!showFallback ? (
        <ExpoImage
          source={{ uri: src }}
          style={[styles.image, sizeStyle]}
          onError={() => setImageError(true)}
          accessibilityLabel={alt}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.fallback, sizeStyle, { backgroundColor: themeColors.muted }]}>
          <Text style={[styles.fallbackText, styles[`${size}Text`], { color: themeColors.mutedForeground }]}>
            {fallback || '?'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 50,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  fallbackText: {
    fontWeight: '500',
  },
  // Sizes
  sm: {
    width: 32,
    height: 32,
  },
  md: {
    width: 40,
    height: 40,
  },
  lg: {
    width: 48,
    height: 48,
  },
  // Text sizes
  smText: {
    fontSize: 12,
  },
  mdText: {
    fontSize: 14,
  },
  lgText: {
    fontSize: 16,
  },
});