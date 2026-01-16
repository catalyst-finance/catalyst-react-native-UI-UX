/**
 * SplashLoadingScreen Component
 * 
 * Full-screen loading screen shown while the app preloads all data.
 * Uses a local bundled image for instant display.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Local splash image bundled with the app for instant display
const SPLASH_IMAGE = require('../../assets/catalyst_loading_screen_v1.png');

interface SplashLoadingScreenProps {
  loadingProgress?: number; // 0-100
  loadingMessage?: string;
}

export const SplashLoadingScreen: React.FC<SplashLoadingScreenProps> = ({
  loadingProgress = 0,
  loadingMessage = 'Loading...',
}) => {
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: loadingProgress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [loadingProgress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Background Image - local bundled asset for instant display */}
      <Image
        source={SPLASH_IMAGE}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Loading indicator overlay at bottom */}
      <View style={styles.loadingOverlay}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: progressWidth },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  progressContainer: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 1.5,
  },
});

export default SplashLoadingScreen;
