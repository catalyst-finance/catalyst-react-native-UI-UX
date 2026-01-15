import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, LayoutChangeEvent } from 'react-native';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, height } = event.nativeEvent.layout;
    setPosition({ x, y: y + height + 8 });
  };

  return (
    <>
      <Pressable
        onLongPress={() => setVisible(true)}
        onPressOut={() => setVisible(false)}
        onLayout={handleLayout}
      >
        {children}
      </Pressable>
      
      {visible && (
        <Modal transparent visible={visible} animationType="fade">
          <Pressable 
            style={styles.overlay} 
            onPress={() => setVisible(false)}
          >
            <View style={[styles.tooltip, { top: position.y, left: position.x }]}>
              <Text style={styles.text}>{content}</Text>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    maxWidth: 200,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
  },
});
