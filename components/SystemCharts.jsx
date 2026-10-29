// components/SystemCharts.jsx - Energy analytics: live trend chart, battery ring, power in/out balance
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Color, EnergyColor, FontFamily } from "../GlobalStyles";
import { VictronEnergyService } from "../API/VictronEnergyService";
import TabletHeader from "./TabletHeader";

const MUTED = '#9E9696';
const CARD = '#211D1D';
const TRACK = '#2A2626';
const HISTORY_LENGTH = 36; // 36 readings x 5 s = 3 minutes
const POLL_MS = 5000;
const CHART_HEIGHT = 200; // stacked (narrow) layout; the wide layout sizes the chart to fit

// Wide layout scales its contents to the space the cards get.
// Baseline is the grid size the 1x styles were designed for.
const BASE_GRID = { width: 1200, height: 560 };
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;

const SERIES = [
  { key: 'solar', label: 'Solar', color: EnergyColor.solar },
  { key: 'grid', label: 'Shore', color: EnergyColor.shore },
  { key: 'loads', label: 'Loads', color: EnergyColor.acLoads },
  { key: 'battery', label: 'Battery', color: EnergyColor.inverter },
];

const toNumber = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

// 0-1 or 0-100 -> 0-100
const normaliseSoc = (soc) => {
  const num = parseFloat(soc);
  if (!Number.isFinite(num)) return null;
  const pct = num > 0 && num <= 1 ? num * 100 : num;
  return Math.max(0, Math.min(100, pct));
};

const formatWatts = (watts) => {
  const abs = Math.abs(toNumber(watts));
  if (abs >= 1000) return `${(abs / 1000).toFixed(2)} kW`;
  return `${Math.round(abs)} W`;
};

// width: page width when hosted in a pager (defaults to the window width)
const SystemCharts = ({ width: pageWidth }) => {
  const { width: windowWidth } = useWindowDimensions();
  const width = pageWidth || windowWidth;
  const isWide = width >= 720;
  const [victronData, setVictronData] = useState(null);
  const [powerHistory, setPowerHistory] = useState({ solar: [], battery: [], grid: [], loads: [] });
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [ringBox, setRingBox] = useState({ width: 0, height: 0 });

  // Rounded to 0.05 so tiny layout changes don't restyle the page
  const scale = useMemo(() => {
    if (!isWide || !gridSize.height) return 1;
    const raw = Math.min(gridSize.height / BASE_GRID.height, gridSize.width / BASE_GRID.width);
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(raw * 20) / 20));
  }, [isWide, gridSize]);
  const styles = useMemo(() => createStyles(scale), [scale]);
  const sz = (n) => Math.round(n * scale);

  // Fetch Victron data and update power history
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await VictronEnergyService.getAllData();
        setVictronData(data);

        const keep = (list, value) => [...list.slice(-(HISTORY_LENGTH - 1)), value];
        setPowerHistory((prev) => ({
          solar: keep(prev.solar, toNumber(data?.pvCharger?.power)),
          battery: keep(prev.battery, Math.abs(toNumber(data?.battery?.power))),
          grid: keep(prev.grid, data?.grid?.isConnected ? toNumber(data?.grid?.power) : 0),
          loads: keep(prev.loads, toNumber(data?.acLoads?.power) + toNumber(data?.dcSystem?.power)),
        }));
      } catch (error) {
        console.error("Failed to load Victron data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  // ——— Derived values ———
  const battery = victronData?.battery || {};
  const soc = normaliseSoc(battery.soc);
  const battW = toNumber(battery.power); // + charging, - discharging
  const isCharging = battW > 1;
  const isDischarging = battW < -1;
  const gridConnected = !!victronData?.grid?.isConnected;
  const solarW = toNumber(victronData?.pvCharger?.power);
  const gridW = gridConnected ? toNumber(victronData?.grid?.power) : 0;
  const acW = toNumber(victronData?.acLoads?.power);
  const dcW = toNumber(victronData?.dcSystem?.power);

  const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

  const powerIn = [
    { label: 'Shore', value: gridW, color: EnergyColor.shore },
    { label: 'Solar', value: solarW, color: EnergyColor.solar },
    { label: 'Battery', value: isDischarging ? -battW : 0, color: EnergyColor.inverter },
  ];
  const powerOut = [
    { label: 'AC loads', value: acW, color: EnergyColor.acLoads },
    { label: 'DC loads', value: dcW, color: EnergyColor.dcLoads },
    { label: 'Charging', value: isCharging ? battW : 0, color: EnergyColor.battery },
  ];
  const totalIn = powerIn.reduce((a, s) => a + s.value, 0);
  const totalOut = powerOut.reduce((a, s) => a + s.value, 0);
  const balanceScale = Math.max(totalIn, totalOut, 1);

  const toggleSeries = (key) => setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));

  // ——— Trend chart ———
  const visibleSeries = SERIES.filter((s) => !hiddenSeries[s.key]);
  const maxValue = Math.max(1, ...visibleSeries.flatMap((s) => powerHistory[s.key])) * 1.15;
  // Right-aligned so the newest reading always sits at "Now"
  const chartWidth = chartSize.width;
  const chartHeight = isWide ? chartSize.height : CHART_HEIGHT;
  const pointX = (i) => (chartWidth / (HISTORY_LENGTH - 1)) * (HISTORY_LENGTH - powerHistory.solar.length + i);
  const pointY = (v) => chartHeight - (v / maxValue) * (chartHeight - 8);

  const linePath = (values) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${pointX(i).toFixed(1)},${pointY(v).toFixed(1)}`).join(' ');
  const areaPath = (values) =>
    values.length < 2
      ? ''
      : `${linePath(values)} L${pointX(values.length - 1).toFixed(1)},${chartHeight} L${pointX(0).toFixed(1)},${chartHeight} Z`;

  const trendCard = (
    <View style={[styles.card, isWide && { flex: 2 }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Power over the last 3 minutes</Text>
          <Text style={styles.cardHint}>Tap a source to hide or show it</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {SERIES.map((s) => {
          const hidden = hiddenSeries[s.key];
          const latest = powerHistory[s.key][powerHistory[s.key].length - 1] || 0;
          return (
            <TouchableOpacity
              key={s.key}
              onPress={() => toggleSeries(s.key)}
              style={[styles.legendChip, { borderColor: hidden ? TRACK : `${s.color}88` }, !hidden && { backgroundColor: `${s.color}1F` }]}
              accessibilityRole="switch"
              accessibilityState={{ checked: !hidden }}
              accessibilityLabel={`${s.label} line`}
            >
              <View style={[styles.legendSwatch, { backgroundColor: hidden ? TRACK : s.color }]} />
              <Text style={[styles.legendLabel, hidden && { color: MUTED }]}>{s.label}</Text>
              <Text style={[styles.legendValue, { color: hidden ? MUTED : s.color }]}>{formatWatts(latest)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={isWide ? styles.chartFill : styles.chart}
        onLayout={(e) => setChartSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {chartWidth > 0 && chartHeight > 0 && (
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              {SERIES.map((s) => (
                <SvgGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color} stopOpacity="0.35" />
                  <Stop offset="1" stopColor={s.color} stopOpacity="0" />
                </SvgGradient>
              ))}
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line key={f} x1="0" x2={chartWidth} y1={chartHeight * f} y2={chartHeight * f} stroke={TRACK} strokeWidth="1" strokeDasharray="4 6" />
            ))}
            <Line x1="0" x2={chartWidth} y1={chartHeight - 0.5} y2={chartHeight - 0.5} stroke="#3A3434" strokeWidth="1" />
            {visibleSeries.map((s) => {
              const values = powerHistory[s.key];
              if (values.length < 2) return null;
              return (
                <React.Fragment key={s.key}>
                  <Path d={areaPath(values)} fill={`url(#fill-${s.key})`} />
                  <Path d={linePath(values)} stroke={s.color} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                  <Circle cx={pointX(values.length - 1)} cy={pointY(values[values.length - 1])} r="4.5" fill={s.color} stroke="#000" strokeWidth="2" />
                </React.Fragment>
              );
            })}
          </Svg>
        )}
        <Text style={[styles.axisLabel, { top: 0 }]}>{formatWatts(maxValue)}</Text>
        {powerHistory.solar.length < 2 && (
          <View style={styles.chartEmpty}>
            <Text style={styles.cardHint}>Collecting readings…</Text>
          </View>
        )}
      </View>
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>3 min ago</Text>
        <Text style={styles.axisText}>Now</Text>
      </View>
    </View>
  );

  // ——— Battery ring ———
  const RING = isWide && ringBox.height
    ? Math.max(96, Math.floor(Math.min(ringBox.width, ringBox.height)))
    : 168;
  const STROKE = Math.round(RING * 0.085);
  const radius = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringColor = soc !== null && soc <= 20 ? EnergyColor.low : EnergyColor.battery;

  const batteryCard = (
    <View style={[styles.card, isWide && { flex: 1 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Battery</Text>
        <View style={[styles.statePill, { backgroundColor: `${ringColor}26` }]}>
          <MaterialCommunityIcons
            name={isCharging ? 'battery-charging-high' : isDischarging ? 'battery-arrow-down' : 'battery'}
            size={sz(14)}
            color={ringColor}
          />
          <Text style={[styles.statePillText, { color: ringColor }]}>
            {isCharging ? 'Charging' : isDischarging ? 'Discharging' : 'Idle'}
          </Text>
        </View>
      </View>

      <View
        style={isWide ? styles.ringFill : styles.ringWrap}
        onLayout={isWide ? (e) => setRingBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }) : undefined}
      >
        <Svg width={RING} height={RING}>
          <Circle cx={RING / 2} cy={RING / 2} r={radius} stroke={TRACK} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - (soc ?? 0) / 100)}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringValue, isWide && { fontSize: Math.round(RING * 0.26) }]}>
            {soc === null ? '--' : Math.round(soc)}
            <Text style={[styles.ringUnit, isWide && { fontSize: Math.round(RING * 0.11) }]}>%</Text>
          </Text>
          <Text style={styles.cardHint}>{battery.timeToGo ? `${isCharging ? 'Full in' : 'Lasts'} ${battery.timeToGo}` : 'State of charge'}</Text>
        </View>
      </View>

      <View style={styles.batteryStats}>
        {[
          { label: 'Voltage', value: `${toNumber(battery.voltage).toFixed(2)} V` },
          { label: 'Current', value: `${toNumber(battery.current).toFixed(1)} A` },
          { label: '3 min avg', value: formatWatts(average(powerHistory.battery)) },
        ].map((stat) => (
          <View key={stat.label} style={styles.batteryStat}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{victronData ? stat.value : '--'}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ——— Power in vs out ———
  const balanceBar = (title, total, segments) => (
    <View style={styles.balanceBlock}>
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceTitle}>{title}</Text>
        <Text style={styles.balanceTotal}>{formatWatts(total)}</Text>
      </View>
      <View style={styles.balanceTrack}>
        {segments.filter((s) => s.value > 0).map((s) => (
          <View key={s.label} style={{ width: `${(s.value / balanceScale) * 100}%`, backgroundColor: s.color }} />
        ))}
      </View>
      <View style={styles.balanceLegend}>
        {segments.map((s) => (
          <View key={s.label} style={styles.balanceLegendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: s.value > 0 ? s.color : TRACK }]} />
            <Text style={styles.balanceLegendText}>
              {s.label} <Text style={styles.balanceLegendValue}>{formatWatts(s.value)}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const net = totalIn - totalOut;
  const balanceCard = (
    <View style={[styles.card, isWide && { flex: 2, justifyContent: 'space-between' }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Where power comes from and goes</Text>
      </View>
      {balanceBar('Coming in', totalIn, powerIn)}
      {balanceBar('Going out', totalOut, powerOut)}
      <Text style={styles.cardHint}>
        {!victronData
          ? 'Waiting for the Cerbo GX'
          : Math.abs(net) < 5
            ? 'Supply and use are balanced'
            : net > 0
              ? `${formatWatts(net)} more coming in than going out`
              : `${formatWatts(net)} more going out than coming in`}
      </Text>
    </View>
  );

  // ——— Status ———
  const statusRows = [
    {
      icon: 'access-point-network',
      label: 'Cerbo GX',
      value: !victronData ? 'Offline' : victronData.apiStatus === 'simulation' ? 'Simulated data' : 'Connected',
      color: !victronData ? EnergyColor.low : victronData.apiStatus === 'simulation' ? Color.colorSandybrown : EnergyColor.battery,
    },
    {
      icon: 'transmission-tower',
      label: 'Shore power',
      value: gridConnected ? 'Plugged in' : 'Unplugged',
      color: gridConnected ? EnergyColor.shore : MUTED,
    },
    {
      icon: 'solar-power',
      label: 'Solar',
      value: solarW > 1 ? `Producing, ${formatWatts(average(powerHistory.solar))} avg` : 'Not producing',
      color: solarW > 1 ? EnergyColor.solar : MUTED,
    },
    {
      icon: 'sine-wave',
      label: 'Inverter',
      value: victronData?.systemOverview?.state || '--',
      color: EnergyColor.inverter,
    },
    {
      icon: 'heart-pulse',
      label: 'Battery health',
      value: soc === null ? '--' : soc >= 50 ? 'Good' : soc >= 20 ? 'Fair' : 'Low, charge soon',
      color: soc === null ? MUTED : soc >= 50 ? EnergyColor.battery : soc >= 20 ? Color.colorSandybrown : EnergyColor.low,
    },
  ];

  const statusCard = (
    <View style={[styles.card, isWide && { flex: 1 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>System status</Text>
      </View>
      <View style={isWide && styles.statusList}>
      {statusRows.map((row, i) => (
        <View key={row.label} style={[styles.statusRow, isWide && styles.statusRowCompact, i > 0 && styles.statusRowDivider]}>
          <View style={[styles.statusIcon, { backgroundColor: `${row.color}22` }]}>
            <MaterialCommunityIcons name={row.icon} size={sz(18)} color={row.color} />
          </View>
          <Text style={styles.statusLabel}>{row.label}</Text>
          <Text style={[styles.statusValue, { color: row.color === MUTED ? MUTED : Color.white0 }]} numberOfLines={1}>
            {row.value}
          </Text>
        </View>
      ))}
      </View>
    </View>
  );

  const header = (
    <>
      <TabletHeader title="Energy Analytics" style={styles.header} />
      <Text style={styles.subtitle}>Live readings from your Victron system, every 5 seconds</Text>
    </>
  );

  // Wide (tablet landscape): two rows that split the screen height, no scrolling
  if (isWide) {
    return (
      <View style={[styles.container, styles.containerFit, { width }]}>
        {header}
        <View
          style={styles.gridArea}
          onLayout={(e) => setGridSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          <View style={[styles.gridRow, styles.gridFill]}>
            {trendCard}
            {batteryCard}
          </View>
          <View style={[styles.gridRow, styles.gridFill, styles.gridLast]}>
            {balanceCard}
            {statusCard}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {header}

        <View style={[styles.grid, isWide && styles.gridRow]}>
          {trendCard}
          {batteryCard}
        </View>
        <View style={[styles.grid, isWide && styles.gridRow]}>
          {balanceCard}
          {statusCard}
        </View>
      </ScrollView>
    </View>
  );
};

// k scales card contents; page chrome (header, subtitle, gutters) stays fixed
const createStyles = (k = 1) => {
  const f = (n) => Math.round(n * k);
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  // Bottom padding leaves room for the pager dots
  containerFit: {
    paddingBottom: 44,
  },
  gridFill: {
    flex: 1,
    gap: f(16),
    marginBottom: f(16),
  },
  gridArea: {
    flex: 1,
  },
  gridLast: {
    marginBottom: 0,
  },
  statusList: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statusRowCompact: {
    paddingVertical: f(6),
  },
  chartFill: {
    flex: 1,
    minHeight: 80,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  header: {
    marginHorizontal: -24,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: MUTED,
    marginTop: 4,
    marginBottom: 16,
  },
  grid: {
    gap: f(16),
    marginBottom: f(16),
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: f(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: f(16),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: f(10),
  },
  cardTitle: {
    color: Color.white0,
    fontSize: f(18),
    fontFamily: FontFamily.latoBold,
  },
  cardHint: {
    color: MUTED,
    fontSize: f(13),
    fontFamily: FontFamily.latoRegular,
    marginTop: f(2),
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: f(8),
    marginBottom: f(10),
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: f(12),
    paddingHorizontal: f(10),
    paddingVertical: f(6),
  },
  legendSwatch: {
    width: f(10),
    height: f(10),
    borderRadius: f(3),
    marginRight: f(6),
  },
  legendLabel: {
    color: Color.white0,
    fontSize: f(13),
    fontFamily: FontFamily.latoRegular,
    marginRight: f(8),
  },
  legendValue: {
    fontSize: f(13),
    fontFamily: FontFamily.latoBold,
  },
  chart: {
    height: CHART_HEIGHT,
  },
  chartEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisLabel: {
    position: 'absolute',
    left: 0,
    color: MUTED,
    fontSize: f(11),
    fontFamily: FontFamily.latoRegular,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: f(6),
  },
  axisText: {
    color: MUTED,
    fontSize: f(11),
    fontFamily: FontFamily.latoRegular,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: f(10),
    paddingHorizontal: f(10),
    paddingVertical: f(4),
  },
  statePillText: {
    fontSize: f(12),
    fontFamily: FontFamily.latoBold,
    marginLeft: f(4),
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 6,
  },
  // Wide layout: takes the card's spare height; the ring is sized to fit it
  ringFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: f(4),
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringValue: {
    color: Color.white0,
    fontSize: f(40),
    fontFamily: FontFamily.latoBold,
  },
  ringUnit: {
    color: MUTED,
    fontSize: f(18),
    fontFamily: FontFamily.latoRegular,
  },
  batteryStats: {
    flexDirection: 'row',
    marginTop: f(10),
  },
  batteryStat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: MUTED,
    fontSize: f(12),
    fontFamily: FontFamily.latoRegular,
  },
  statValue: {
    color: Color.white0,
    fontSize: f(15),
    fontFamily: FontFamily.latoBold,
    marginTop: f(2),
  },
  balanceBlock: {
    marginBottom: f(12),
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: f(8),
  },
  balanceTitle: {
    color: Color.white0,
    fontSize: f(15),
    fontFamily: FontFamily.latoBold,
  },
  balanceTotal: {
    color: Color.white0,
    fontSize: f(22),
    fontFamily: FontFamily.latoBold,
  },
  balanceTrack: {
    height: f(18),
    borderRadius: f(9),
    backgroundColor: TRACK,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: f(2),
  },
  balanceLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: f(8),
    gap: f(14),
  },
  balanceLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLegendText: {
    color: MUTED,
    fontSize: f(13),
    fontFamily: FontFamily.latoRegular,
  },
  balanceLegendValue: {
    color: Color.white0,
    fontFamily: FontFamily.latoBold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: f(10),
  },
  statusRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusIcon: {
    width: f(32),
    height: f(32),
    borderRadius: f(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: f(12),
  },
  statusLabel: {
    flex: 1,
    color: MUTED,
    fontSize: f(14),
    fontFamily: FontFamily.latoRegular,
  },
  statusValue: {
    fontSize: f(14),
    fontFamily: FontFamily.latoBold,
    maxWidth: '55%',
    textAlign: 'right',
  },
});
};

export default SystemCharts;
