import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../GlobalStyles';

// Tablet home battery tile, styled to the app theme (dark brown + sandy orange).
// soc: 0-100 (or 0-1; normalised below), null while loading. power: watts, + = charging.

const ACCENT = '#FFB267';
const LOW = '#FF6B6B';
const CHARGING = '#4ADE80';
const SEGMENTS = 5;

const normaliseSoc = (soc) => {
  const num = parseFloat(soc);
  if (!Number.isFinite(num)) return null;
  const pct = num > 0 && num <= 1 ? num * 100 : num;
  return Math.max(0, Math.min(100, pct));
};

const formatWatts = (watts) => {
  const abs = Math.abs(watts);
  if (abs < 1) return '0 W';
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`;
  return `${Math.round(abs)} W`;
};

const TabletBatteryWidget = ({ soc, power = 0, voltage }) => {
  const level = normaliseSoc(soc);
  const watts = parseFloat(power) || 0;
  const isCharging = watts > 1;
  const isDischarging = watts < -1;
  const isLow = level !== null && level <= 20;

  const fillColor = isLow ? LOW : isCharging ? CHARGING : ACCENT;
  const stateLabel = isCharging ? 'Charging' : isDischarging ? 'Discharging' : 'Idle';
  const stateColor = isCharging ? CHARGING : isDischarging ? ACCENT : '#9E9696';

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={
        level === null
          ? 'Battery, waiting for data'
          : `Battery ${Math.round(level)} percent, ${stateLabel}, ${formatWatts(watts)}`
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Battery</Text>
        {voltage ? <Text style={styles.voltage}>{voltage}</Text> : null}
      </View>

      {/* Battery glyph */}
      <View style={styles.glyphRow}>
        <View style={styles.shell}>
          <View
            style={[
              styles.fill,
              { width: `${level ?? 0}%`, backgroundColor: fillColor },
            ]}
          />
          <View style={styles.segments} pointerEvents="none">
            {Array.from({ length: SEGMENTS - 1 }).map((_, i) => (
              <View key={i} style={styles.segmentDivider} />
            ))}
          </View>
          {isCharging && (
            <View style={styles.boltWrap} pointerEvents="none">
              <Ionicons name="flash" size={30} color="#1B1B1B" />
            </View>
          )}
        </View>
        <View style={styles.cap} />
      </View>

      {/* Readout */}
      <View style={styles.readout}>
        <Text style={styles.percent}>
          {level === null ? '--' : `${Math.round(level)}%`}
        </Text>
        <View style={styles.stateRow}>
          <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
          <Text style={[styles.stateText, { color: stateColor }]}>{stateLabel}</Text>
          <Text style={styles.watts}> · {formatWatts(watts)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    padding: 6,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: FontFamily.latoBold,
    fontSize: 14,
  },
  voltage: {
    color: '#9E9696',
    fontFamily: FontFamily.latoRegular,
    fontSize: 13,
  },
  glyphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  shell: {
    width: 190,
    height: 92,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#4E4747',
    backgroundColor: '#1B1B1B',
    padding: 5,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 5,
    top: 5,
    bottom: 5,
    maxWidth: 174,
    borderRadius: 12,
  },
  segments: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  segmentDivider: {
    width: 3,
    height: '100%',
    backgroundColor: '#1B1B1B',
  },
  boltWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cap: {
    width: 10,
    height: 34,
    marginLeft: 3,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    backgroundColor: '#4E4747',
  },
  readout: {
    alignItems: 'center',
  },
  percent: {
    color: '#FFFFFF',
    fontFamily: FontFamily.latoBold,
    fontSize: 40,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stateText: {
    fontFamily: FontFamily.latoBold,
    fontSize: 14,
  },
  watts: {
    color: '#C9C1C1',
    fontFamily: FontFamily.latoRegular,
    fontSize: 14,
  },
});

export default TabletBatteryWidget;
