import React, { useEffect, useRef } from 'react';
import { StyleSheet, Platform, Animated, View } from 'react-native';

const GlowingCard = React.memo(({ children, glowColor = '#4A90E2', style }) => {
  // Animation setup
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Set up the pulsing animation
  useEffect(() => {
    const pulsate = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        })
      ]).start(() => pulsate());
    };

    pulsate();

    return () => pulseAnim.stopAnimation();
  }, []);

  // Only operate on a single React element
  if (!React.isValidElement(children)) return children;

  const animatedStyle = {
    transform: [{
      scale: pulseAnim.interpolate({
        inputRange: [0.3, 1],
        outputRange: [1, 1.03]
      })
    }]
  };



  // Create a wrapper style that adds margin space for the shadow to be visible
  return (
    <View style={styles.outerContainer}>
      <Animated.View
        style={[
          styles.container,

          animatedStyle,
          { backgroundColor: 'transparent' },
          style
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if children's props changed (not the children object itself)
  // This prevents re-render when parent re-renders but props are functionally the same
  return prevProps.glowColor === nextProps.glowColor &&
         JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style) &&
         React.isValidElement(prevProps.children) &&
         React.isValidElement(nextProps.children) &&
         prevProps.children.type === nextProps.children.type;
});

const styles = StyleSheet.create({
  outerContainer: {
    // Add margin to give shadow room to be visible
    margin: 8,
    overflow: 'visible',
  },
  container: {
    zIndex: 2,
    overflow: 'visible',
    borderRadius: 5, // Make sure shadow follows rounded corners if any
  },
});

export default GlowingCard;