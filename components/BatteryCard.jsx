import React from 'react';
import Svg, { Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FontFamily } from '../GlobalStyles';

// Battery-shaped panel for the tablet Victron overview.
// The drawing keeps its original 280x180 footprint (cap on the right) because the
// power lines on that screen are positioned around it.
//   soc:     0-100 or 0-1, null while loading
//   power:   watts, + charging / - discharging
//   voltage: volts

const SEGMENTS = 5;

const normaliseSoc = (soc) => {
  const num = parseFloat(soc);
  if (!Number.isFinite(num)) return null;
  const pct = num > 0 && num <= 1 ? num * 100 : num;
  return Math.max(0, Math.min(100, pct));
};

const levelColors = (level) => {
  if (level === null) return ['#616161', '#303030'];
  if (level <= 20) return ['#FF6B6B', '#B71C1C'];
  if (level <= 50) return ['#FFB74D', '#E65100'];
  return ['#69F0AE', '#1B7F3B'];
};

const BatteryCard = ({
  soc = null,
  power = 0,
  voltage,
  width = 280,
  height = 180,
  containerStyle = {},
}) => {
  const level = normaliseSoc(soc);
  const watts = parseFloat(power) || 0;
  const isCharging = watts > 1;
  const isDischarging = watts < -1;
  const [light, dark] = levelColors(level);

  // Geometry
  const capWidth = 16;
  const capHeight = height * 0.38;
  const bodyWidth = width - capWidth;
  const inset = 9;
  const innerWidth = bodyWidth - inset * 2;
  const innerHeight = height - inset * 2;
  const fillWidth = level === null ? 0 : (innerWidth * level) / 100;

  const stateLabel = level === null ? 'Waiting' : isCharging ? 'Charging' : isDischarging ? 'Discharging' : 'Idle';
  const powerText = `${isCharging ? '+' : isDischarging ? '−' : ''}${Math.round(Math.abs(watts))} W`;
  const voltageText = voltage !== undefined && voltage !== null ? `${parseFloat(voltage).toFixed(1)} V` : null;

  return (
    <View
      style={[styles.container, containerStyle]}
      accessible
      accessibilityLabel={level === null ? 'Battery, waiting for data' : `Battery ${Math.round(level)} percent, ${stateLabel}, ${powerText}`}
    >
      <Svg width={width} height={height} style={styles.svg}>
        <Defs>
          <LinearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2E2A2A" />
            <Stop offset="1" stopColor="#151313" />
          </LinearGradient>
          <LinearGradient id="levelGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="1" stopColor={dark} />
          </LinearGradient>
          <LinearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Shell */}
        <Rect x={1} y={1} width={bodyWidth - 2} height={height - 2} rx={24} fill="url(#bodyGradient)" stroke={light} strokeOpacity={0.7} strokeWidth={2} />
        {/* Cap */}
        <Rect x={bodyWidth - 1} y={(height - capHeight) / 2} width={capWidth} height={capHeight} rx={6} fill={light} fillOpacity={0.85} />

        {/* Charge level */}
        <Rect x={inset} y={inset} width={innerWidth} height={innerHeight} rx={16} fill="#0D0C0C" />
        {fillWidth > 0 && (
          <Rect x={inset} y={inset} width={fillWidth} height={innerHeight} rx={16} fill="url(#levelGradient)" />
        )}
        {/* Cell dividers */}
        {Array.from({ length: SEGMENTS - 1 }).map((_, i) => {
          const x = inset + (innerWidth / SEGMENTS) * (i + 1);
          return <Line key={i} x1={x} x2={x} y1={inset + 6} y2={inset + innerHeight - 6} stroke="#000" strokeOpacity={0.35} strokeWidth={2} />;
        })}
        {/* Glass highlight */}
        <Rect x={inset} y={inset} width={innerWidth} height={innerHeight} rx={16} fill="url(#shine)" />
      </Svg>

      <View style={[styles.content, { width: bodyWidth, height }]}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name={isCharging ? 'battery-charging-high' : 'battery-high'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.title}>Battery</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stateLabel}</Text>
          </View>
        </View>

        <Text style={styles.percent}>
          {level === null ? '--' : Math.round(level)}
          <Text style={styles.percentUnit}>%</Text>
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{powerText}</Text>
          {voltageText ? <Text style={styles.footerText}>{voltageText}</Text> : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 250,
    height: 150,
    top: 70,
    left: 25,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 22,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    marginLeft: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FontFamily.latoBold,
  },
  percent: {
    color: '#FFFFFF',
    fontSize: 46,
    fontFamily: FontFamily.latoBold,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  percentUnit: {
    fontSize: 22,
    fontFamily: FontFamily.latoRegular,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default BatteryCard;
