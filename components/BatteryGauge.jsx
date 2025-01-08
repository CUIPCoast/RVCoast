import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BatteryGauge = () => {
  const { PI, cos, sin } = Math;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 20;
  const r = (size - strokeWidth) / 2;
  const startAngle = PI + PI * 0.25;
  const endAngle = 2 * PI - PI * 0.25;

  const x1 = cx - r * cos(startAngle);
  const y1 = cy - r * sin(startAngle);
  const x2 = cx - r * cos(endAngle);
  const y2 = cy - r * sin(endAngle);
  const d = `M ${x1} ${y1} A ${r} ${r} 0 1 0 ${x2} ${y2}`;

  const circumference = r * Math.PI * 1.5;
  const progress = useSharedValue(0);

  const animatedProps = useAnimatedProps(() => {
    const offset = (progress.value / 100) * circumference;
    return {
      strokeDashoffset: -(circumference - offset),
    };
  });

  useFocusEffect(
    useCallback(() => {
      // to make it dynamic change the 80 to current voltage
      progress.value = 0;
      progress.value = withTiming(80, { duration: 1000, easing: Easing.inOut(Easing.ease) });
    }, [])
  );

  return (
    <View className="items-center justify-center mt-6">
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0" stopColor="red" stopOpacity="1" />
          <Stop offset="0.5" stopColor="yellow" stopOpacity="1" />
          <Stop offset="1" stopColor="green" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Background gauge path */}
      <Path
        d={d}
        fill="none"
        stroke="#e2e2e8"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Animated gradient-filled gauge path */}
      <AnimatedPath
        d={d}
        fill="none"
        stroke="url(#grad)"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        animatedProps={animatedProps}
      />
    </Svg>

    {/* Overlay text */}
    <View className="absolute top-15">
      <View className="mb-12 items-center justify-center">
        <Text className="text-yellow-500 text-xl">⚡️</Text>
        <Text className="text-3xl font-bold text-white">12.5 V</Text>
        <Text className="text-xs text-gray-300">Battery</Text>
      </View>
    </View>

    {/* Low and High labels */}
    <View className="flex-row absolute bottom-10 w-1/4 justify-between pb-6">
      <Text className="text-xs text-gray-400">L</Text>
      <Text className="text-xs text-gray-400">H</Text>
    </View>
  </View>
  );
};

export default BatteryGauge;
