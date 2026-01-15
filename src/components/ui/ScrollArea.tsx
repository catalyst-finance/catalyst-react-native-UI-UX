import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';

interface ScrollAreaProps extends ScrollViewProps {
  children: React.ReactNode;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ 
  children, 
  style,
  ...props 
}) => {
  return (
    <ScrollView
      style={[styles.container, style]}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});