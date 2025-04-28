import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Text as SvgText } from 'react-native-svg';
import Animated, { 
  Easing, 
  useAnimatedProps, 
  useSharedValue, 
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * An advanced battery gauge component that displays battery percentage,
 * voltage, and status (charging/discharging)
 * 
 * @param {Object} props Component props
 * @param {number} props.percentage Battery percentage (0-100)
 * @param {number} props.voltage Battery voltage
 * @param {number} props.current Battery current (negative = discharging)
 * @param {string} props.status Battery status text
 * @param {number} props.power Power in watts
 * @param {string} props.timeRemaining Time remaining display
 */
const AdvancedBatteryGauge = ({ 
  percentage = 50, 
  voltage = 12.5, 
  current = 0,
  status = 'idle',
  power = 0,
  timeRemaining = '--:--'
}) => {
  const { PI, cos, sin } = Math;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 16;
  const r = (size - strokeWidth) / 2;
  const startAngle = -PI / 2; // Start at top
  const endAngle = PI * 1.5; // Full circle back to top
  
  // Calculate circle path
  const createArc = (radius, startAngleDeg, endAngleDeg) => {
    const startAngleRad = (startAngleDeg * PI) / 180;
    const endAngleRad = (endAngleDeg * PI) / 180;
    
    const x1 = cx + radius * cos(startAngleRad);
    const y1 = cy + radius * sin(startAngleRad);
    const x2 = cx + radius * cos(endAngleRad);
    const y2 = cy + radius * sin(endAngleRad);
    
    const largeArcFlag = endAngleRad - startAngleRad <= PI ? 0 : 1;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  // Create arc path for gauge
  const backgroundPath = createArc(r, -135, 135);
  
  // Calculate the circumference of the display portion
  const circumference = r * PI * 1.5; // 270 degrees
  
  // Animation values
  const progress = useSharedValue(0);
  const colorProgress = useSharedValue(0);
  
  // Determine if battery is charging
  const isCharging = current > 0;
  
  // Pulse effect for charging indicator
  const pulseSize = useSharedValue(6);
  
  // Set up color based on battery level
  useEffect(() => {
    colorProgress.value = withTiming(percentage / 100, { 
      duration: 1000, 
      easing: Easing.inOut(Easing.ease) 
    });
    
    // Start pulsing effect if charging
    if (isCharging) {
      const pulseTiming = () => {
        pulseSize.value = withTiming(8, { 
          duration: 1000, 
          easing: Easing.inOut(Easing.ease) 
        }, () => {
          pulseSize.value = withTiming(6, { 
            duration: 1000, 
            easing: Easing.inOut(Easing.ease) 
          }, pulseTiming);
        });
      };
      
      pulseTiming();
    }
  }, [percentage, isCharging]);

  // Animate the gauge when the component comes into focus
  useFocusEffect(
    useCallback(() => {
      progress.value = 0;
      progress.value = withTiming(percentage / 100, { 
        duration: 1500, 
        easing: Easing.out(Easing.cubic) 
      });
    }, [percentage])
  );

  // Animated properties for the gauge arc
  const animatedProps = useAnimatedProps(() => {
    const offset = circumference - (progress.value * circumference);
    return {
      strokeDashoffset: offset,
    };
  });
  
  // Animated properties for the charging indicator
  const animatedCircleProps = useAnimatedProps(() => {
    return {
      r: pulseSize.value,
      fill: isCharging ? '#4CAF50' : '#FFC107',
    };
  });
  
  // Get color based on battery level
  const getBatteryColor = (level) => {
    if (level >= 75) return '#4CAF50'; // Green
    if (level >= 50) return '#8BC34A'; // Light Green
    if (level >= 25) return '#FFC107'; // Amber
    return '#F44336'; // Red
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="batteryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0" stopColor="#F44336" stopOpacity="1" />
            <Stop offset="0.5" stopColor="#FFC107" stopOpacity="1" />
            <Stop offset="1" stopColor="#4CAF50" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Path
          d={backgroundPath}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Animated foreground path */}
        <AnimatedPath
          d={backgroundPath}
          fill="none"
          stroke={getBatteryColor(percentage)}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          animatedProps={animatedProps}
        />
        
        {/* Charging indicator */}
        {isCharging && (
          <AnimatedCircle
            cx={cx + (r + strokeWidth/2 + 12) * cos(-1.35 * PI)}
            cy={cy + (r + strokeWidth/2 + 12) * sin(-1.35 * PI)}
            animatedProps={animatedCircleProps}
          />
        )}
        
        {/* Battery percentage text */}
        <SvgText
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          fontSize="28"
          fontWeight="bold"
          fill="white"
        >
          {percentage}%
        </SvgText>
        
        {/* Battery voltage text */}
        <SvgText
          x={cx}
          y={cy + 15}
          textAnchor="middle"
          fontSize="16"
          fill="#CCC"
        >
          {voltage}V
        </SvgText>
        
        {/* Status text */}
        <SvgText
          x={cx}
          y={cy + 40}
          textAnchor="middle"
          fontSize="12"
          fill="#999"
        >
          {status}
        </SvgText>
      </Svg>

      {/* Additional battery info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{Math.abs(power)}W</Text>
          <Text style={styles.infoLabel}>{power >= 0 ? 'Charging' : 'Discharging'}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{Math.abs(current)}A</Text>
          <Text style={styles.infoLabel}>Current</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{timeRemaining}</Text>
          <Text style={styles.infoLabel}>Remaining</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
});

export default AdvancedBatteryGauge;