// components/Lines.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

/* ---------- Pulse that actually moves ---------- */
const MovingPulse = ({ horizontal, travel, duration = 1800, delay = 0 }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, duration, delay]);

  const translate = horizontal
    ? { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }
    : { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#80D8FF',     // lighter blue “energy” dot
        transform: [translate],
      }}
    />
  );
};

/* ---------- Horizontal line with animated pulses ---------- */
export const HorizontalLine = ({
  top,
  left,
  width,
  color = '#4A90E2',
  pulses = 3,          // how many pulses you want on the line
  duration = 1800,     // ms for one end-to-end trip
}) => (
  <View
    style={{
      position: 'absolute',
      top,
      left,
      width,
      height: 3,
      backgroundColor: color,
      overflow: 'visible',  // let the pulses show past the bar itself
    }}
  >
    {Array.from({ length: pulses }).map((_, i) => (
      <MovingPulse
        key={i}
        horizontal
        travel={width - 8}
        duration={duration}
        delay={(duration / pulses) * i} // stagger them evenly
      />
    ))}
  </View>
);

/* ---------- Vertical line with animated pulses ---------- */
export const VerticalLine = ({
  top,
  left,
  height,
  color = '#4A90E2',
  pulses = 3,
  duration = 1800,
}) => (
  <View
    style={{
      position: 'absolute',
      top,
      left,
      width: 3,
      height,
      backgroundColor: color,
      overflow: 'visible',
    }}
  >
    {Array.from({ length: pulses }).map((_, i) => (
      <MovingPulse
        key={i}
        horizontal={false}
        travel={height - 8}
        duration={duration}
        delay={(duration / pulses) * i}
      />
    ))}
  </View>
);

/* ---------- Static end-point dot ---------- */
export const ConnectionDot = ({
  top,
  left,
  size = 10,
  color = '#4A90E2',
}) => (
  <View
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: color,
      top: top - size / 2,   // center on given coords
      left: left - size / 2,
      zIndex: 2,
    }}
  />
);
