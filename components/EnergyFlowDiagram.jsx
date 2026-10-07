import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily } from "../GlobalStyles";

// Mobile-only energy flow diagram (System screen, phone layout).
// Hub-and-spoke: sources (shore, solar) flow into the battery hub, which feeds AC and DC loads.

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const COLORS = {
  card: '#1B1B1B',
  node: '#262222',
  border: 'rgba(255, 255, 255, 0.08)',
  idle: '#4A4545',
  textMuted: '#9E9696',
  shore: '#4FC3F7',
  solar: '#FFB267',
  acLoads: '#FF7A6B',
  dcLoads: '#B39DDB',
  charging: '#4ADE80',
  discharging: '#FFC107',
};

const DIAGRAM_HEIGHT = 300;
const NODE_HEIGHT = 72;
const HUB_SIZE = 112;
const ACTIVE_THRESHOLD = 1; // watts

const toNumber = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const formatWatts = (watts) => {
  const abs = Math.abs(watts);
  if (abs < ACTIVE_THRESHOLD) return '0 W';
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`;
  return `${Math.round(abs)} W`;
};

// Two dots per line, offset by half a cycle, travelling from -> to.
const FlowDots = ({ from, to, color, active, progress }) => {
  const dotA = useAnimatedProps(() => {
    const p = progress.value;
    return { cx: from.x + (to.x - from.x) * p, cy: from.y + (to.y - from.y) * p };
  }, [from.x, from.y, to.x, to.y]);

  const dotB = useAnimatedProps(() => {
    const p = (progress.value + 0.5) % 1;
    return { cx: from.x + (to.x - from.x) * p, cy: from.y + (to.y - from.y) * p };
  }, [from.x, from.y, to.x, to.y]);

  return (
    <>
      <Line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={active ? color : COLORS.idle}
        strokeOpacity={active ? 0.45 : 0.6}
        strokeWidth={2}
        strokeDasharray={active ? undefined : '4 6'}
      />
      {active && (
        <>
          <AnimatedCircle animatedProps={dotA} r={4} fill={color} />
          <AnimatedCircle animatedProps={dotB} r={4} fill={color} />
        </>
      )}
    </>
  );
};

const FlowNode = ({ center, width, icon, label, value, color, active, subValue }) => (
  <View
    accessible
    accessibilityLabel={`${label}: ${value}${subValue ? `, ${subValue}` : ''}`}
    style={[
      styles.node,
      {
        width,
        left: center.x - width / 2,
        top: center.y - NODE_HEIGHT / 2,
        borderColor: active ? `${color}66` : COLORS.border,
      },
    ]}
  >
    <View style={[styles.nodeIcon, { backgroundColor: active ? `${color}26` : 'rgba(255,255,255,0.05)' }]}>
      {icon(active ? color : COLORS.textMuted)}
    </View>
    <View style={styles.nodeText}>
      <Text style={styles.nodeLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.nodeValue, { color: active ? '#FFFFFF' : COLORS.textMuted }]} numberOfLines={1}>
        {value}
      </Text>
      {subValue ? <Text style={styles.nodeSub} numberOfLines={1}>{subValue}</Text> : null}
    </View>
  </View>
);

const BatteryHub = ({ center, soc, state, color, watts, voltage }) => {
  const radius = (HUB_SIZE - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, soc));

  return (
    <View
      accessible
      accessibilityLabel={`Battery ${Math.round(clamped)} percent, ${state}, ${formatWatts(watts)}`}
      style={[styles.hub, { left: center.x - HUB_SIZE / 2, top: center.y - HUB_SIZE / 2 }]}
    >
      <Svg width={HUB_SIZE} height={HUB_SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={HUB_SIZE / 2} cy={HUB_SIZE / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
        <Circle
          cx={HUB_SIZE / 2}
          cy={HUB_SIZE / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          rotation={-90}
          origin={`${HUB_SIZE / 2}, ${HUB_SIZE / 2}`}
        />
      </Svg>
      <Ionicons name="battery-half" size={16} color={color} />
      <Text style={styles.hubSoc}>{Math.round(clamped)}%</Text>
      <Text style={[styles.hubState, { color }]}>{state}</Text>
      <Text style={styles.hubSub}>{voltage}</Text>
    </View>
  );
};

const EnergyFlowDiagram = ({ energyData }) => {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 0;
      return undefined;
    }
    progress.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [reduceMotion]);

  const battery = energyData?.battery || {};
  const grid = energyData?.grid || {};
  const solarW = toNumber(energyData?.pvCharger?.power);
  const shoreW = grid.isConnected ? toNumber(grid.power) : 0;
  const acW = toNumber(energyData?.acLoads?.power);
  const dcW = toNumber(energyData?.dcSystem?.power);
  const batteryW = toNumber(battery.power) || toNumber(battery.voltage) * toNumber(battery.current);
  const rawSoc = toNumber(battery.soc);
  const soc = rawSoc > 0 && rawSoc <= 1 ? rawSoc * 100 : rawSoc;

  const isCharging = batteryW > ACTIVE_THRESHOLD;
  const isDischarging = batteryW < -ACTIVE_THRESHOLD;
  const batteryColor = isCharging ? COLORS.charging : isDischarging ? COLORS.discharging : COLORS.textMuted;
  const batteryState = isCharging ? 'Charging' : isDischarging ? 'Discharging' : 'Idle';

  // Node geometry, computed from the measured width so it fills any phone.
  const nodeWidth = Math.min(156, (width - 16) / 2);
  const leftX = nodeWidth / 2;
  const rightX = width - nodeWidth / 2;
  const topY = NODE_HEIGHT / 2;
  const bottomY = DIAGRAM_HEIGHT - NODE_HEIGHT / 2;
  const hub = { x: width / 2, y: DIAGRAM_HEIGHT / 2 };
  const shoreNode = { x: leftX, y: topY };
  const solarNode = { x: rightX, y: topY };
  const acNode = { x: leftX, y: bottomY };
  const dcNode = { x: rightX, y: bottomY };

  const sourcesW = solarW + shoreW;
  const loadsW = acW + dcW;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Energy Flow</Text>
          <Text style={styles.subtitle}>Live power distribution</Text>
        </View>
        {energyData?.apiStatus === 'simulation' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Simulated</Text>
          </View>
        )}
      </View>

      {!energyData ? (
        <View style={[styles.diagram, styles.placeholder]}>
          <Ionicons name="flash-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.placeholderText}>Connecting to energy system…</Text>
        </View>
      ) : (
        <View style={styles.diagram} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <>
              <Svg width={width} height={DIAGRAM_HEIGHT} style={StyleSheet.absoluteFill}>
                <FlowDots from={shoreNode} to={hub} color={COLORS.shore} active={shoreW > ACTIVE_THRESHOLD} progress={progress} />
                <FlowDots from={solarNode} to={hub} color={COLORS.solar} active={solarW > ACTIVE_THRESHOLD} progress={progress} />
                <FlowDots from={hub} to={acNode} color={COLORS.acLoads} active={acW > ACTIVE_THRESHOLD} progress={progress} />
                <FlowDots from={hub} to={dcNode} color={COLORS.dcLoads} active={dcW > ACTIVE_THRESHOLD} progress={progress} />
              </Svg>

              <FlowNode
                center={shoreNode}
                width={nodeWidth}
                label="Shore"
                value={grid.isConnected ? formatWatts(shoreW) : 'Unplugged'}
                color={COLORS.shore}
                active={shoreW > ACTIVE_THRESHOLD}
                icon={(c) => <MaterialCommunityIcons name="power-plug" size={18} color={c} />}
              />
              <FlowNode
                center={solarNode}
                width={nodeWidth}
                label="Solar"
                value={formatWatts(solarW)}
                color={COLORS.solar}
                active={solarW > ACTIVE_THRESHOLD}
                icon={(c) => <Ionicons name="sunny" size={18} color={c} />}
              />
              <FlowNode
                center={acNode}
                width={nodeWidth}
                label="AC Loads"
                value={formatWatts(acW)}
                color={COLORS.acLoads}
                active={acW > ACTIVE_THRESHOLD}
                icon={(c) => <MaterialCommunityIcons name="power-socket-us" size={18} color={c} />}
              />
              <FlowNode
                center={dcNode}
                width={nodeWidth}
                label="DC Loads"
                value={formatWatts(dcW)}
                color={COLORS.dcLoads}
                active={dcW > ACTIVE_THRESHOLD}
                icon={(c) => <MaterialCommunityIcons name="car-battery" size={18} color={c} />}
              />
              <BatteryHub
                center={hub}
                soc={soc}
                state={batteryState}
                color={batteryColor}
                watts={batteryW}
                voltage={`${toNumber(battery.voltage).toFixed(1)} V · ${formatWatts(batteryW)}`}
              />
            </>
          )}
        </View>
      )}

      {energyData && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>In</Text>
            <Text style={[styles.summaryValue, { color: COLORS.charging }]}>{formatWatts(sourcesW)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Out</Text>
            <Text style={[styles.summaryValue, { color: COLORS.acLoads }]}>{formatWatts(loadsW)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Battery</Text>
            <Text style={[styles.summaryValue, { color: batteryColor }]}>
              {isCharging ? '+' : isDischarging ? '−' : ''}{formatWatts(batteryW)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: COLORS.solar,
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
  },
  diagram: {
    height: DIAGRAM_HEIGHT,
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    marginTop: 8,
  },
  node: {
    position: 'absolute',
    height: NODE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.node,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  nodeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nodeText: {
    flex: 1,
  },
  nodeLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    letterSpacing: 0.3,
  },
  nodeValue: {
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    marginTop: 2,
  },
  nodeSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  hub: {
    position: 'absolute',
    width: HUB_SIZE,
    height: HUB_SIZE,
    borderRadius: HUB_SIZE / 2,
    backgroundColor: COLORS.node,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubSoc: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    marginTop: 1,
  },
  hubState: {
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
  },
  hubSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    marginTop: 2,
  },
});

export default EnergyFlowDiagram;
