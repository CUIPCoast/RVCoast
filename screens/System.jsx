// System.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SystemCharts from "../components/SystemCharts.jsx";

import Map from "../components/Map";
import useScreenSize from "../helper/useScreenSize.jsx";
import EnergyFlowDiagram from "../components/EnergyFlowDiagram";
import { VictronEnergyService } from "../API/VictronEnergyService";
import TabletHeader from "../components/TabletHeader";
import { Color, EnergyColor, FontFamily } from "../GlobalStyles";

const { width: screenWidth } = Dimensions.get('window');

// Tablet theme tokens (shared with SystemCharts)
const MUTED = '#9E9696';
const CARD = '#211D1D';
const TRACK = '#2A2626';
const PAGES = ['Overview', 'Analytics'];

// Mobile battery colors, matching the home battery widget
const ACCENT = Color.colorSandybrown;
const CHARGING = '#4ADE80';
const LOW = '#FF6B6B';
// Mobile surfaces, matching the mobile Home screen
const MOBILE_BG = '#211D1D';
const MOBILE_CARD = '#1B1B1B';

// Energy flow geometry: link lengths are fixed so the dots know how far to travel
const LINK_GAP = 56;
const FLOW_SPACER = 40;
const FLOW_DOTS = 3;
const FLOW_DOT = 6;

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

// Split so the number and unit can be styled separately
const splitWatts = (watts) => {
  const abs = Math.abs(toNumber(watts));
  if (abs >= 1000) return { value: (abs / 1000).toFixed(2), unit: 'kW' };
  return { value: `${Math.round(abs)}`, unit: 'W' };
};

/**
 * One device in the energy flow (shore, inverter, battery...).
 * Lit border + tinted icon when power is moving through it.
 */
const EnergyNode = ({ title, icon, color, active, watts, value, unit, subtitle, badge, children }) => {
  const reading = watts !== undefined ? splitWatts(watts) : { value, unit };
  const tint = active ? color : MUTED;

  return (
    <View
      style={[styles.node, active && { borderColor: `${color}66` }]}
      accessible
      accessibilityLabel={`${title}, ${reading.value ?? '--'} ${reading.unit ?? ''}${badge ? `, ${badge}` : ''}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={styles.nodeHeader}>
        <View style={[styles.nodeIcon, { backgroundColor: `${color}22` }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.nodeTitle} numberOfLines={1}>{title}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: active ? `${color}26` : TRACK }]}>
            <Text style={[styles.badgeText, { color: tint }]} numberOfLines={1}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {children || (
        <View>
          <Text style={styles.nodeValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {reading.value ?? '--'}
            {reading.unit ? <Text style={styles.nodeUnit}> {reading.unit}</Text> : null}
          </Text>
          {subtitle ? <Text style={styles.nodeSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      )}
    </View>
  );
};

// Respect the system "reduce motion" setting
const useReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove?.();
  }, []);
  return reduceMotion;
};

// One trip along the link: slow at a trickle, faster under heavy load.
// Rounded to 100 ms so small wattage changes between polls don't restart the loop.
const flowDuration = (watts) => {
  const load = Math.min(Math.abs(toNumber(watts)), 2000) / 2000;
  return Math.round((2000 - load * 1300) / 100) * 100;
};

/**
 * Connector between two nodes. When power flows it takes the source color, shows
 * a chevron for direction (so the state never relies on color alone) and runs
 * dots along the line, faster as wattage rises.
 */
const FlowLink = ({ color, direction, watts, vertical = false, animate = true }) => {
  const active = !!direction;
  const length = vertical ? FLOW_SPACER : LINK_GAP;
  const duration = flowDuration(watts);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active || !animate) {
      progress.stopAnimation();
      return undefined;
    }
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, animate, duration, progress]);

  // Up/left run the same track backwards
  const reverse = direction === 'up' || direction === 'left';

  return (
    <View
      style={vertical ? styles.linkVertical : styles.linkHorizontal}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <View
        style={[
          vertical ? styles.linkLineVertical : styles.linkLineHorizontal,
          { backgroundColor: active ? `${color}66` : TRACK },
        ]}
      />
      {active && animate &&
        Array.from({ length: FLOW_DOTS }).map((_, i) => {
          // Evenly spaced dots sharing one clock
          const t = Animated.modulo(Animated.add(progress, i / FLOW_DOTS), 1);
          const offset = t.interpolate({
            inputRange: [0, 1],
            outputRange: reverse ? [length - FLOW_DOT, 0] : [0, length - FLOW_DOT],
          });
          const opacity = t.interpolate({
            inputRange: [0, 0.15, 0.85, 1],
            outputRange: [0, 1, 1, 0],
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.flowDot,
                vertical ? styles.flowDotVertical : styles.flowDotHorizontal,
                {
                  backgroundColor: color,
                  opacity,
                  transform: [vertical ? { translateY: offset } : { translateX: offset }],
                },
              ]}
            />
          );
        })}
      {active && (
        <View style={[styles.linkChevron, { borderColor: color }]}>
          <MaterialCommunityIcons name={`chevron-${direction}`} size={16} color={color} />
        </View>
      )}
    </View>
  );
};

const System = () => {
  const isTablet = useScreenSize();
  const [victronData, setVictronData] = useState(null);
  const [energyError, setEnergyError] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(12.5);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const insets = useSafeAreaInsets();

  // Pager state; width is measured so pages line up with the visible area
  const [tabIndex, setTabIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(screenWidth);
  const pagerRef = useRef(null);
  const reduceMotion = useReduceMotion();

  const fetchVictronData = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await VictronEnergyService.getAllData();
      setVictronData(data);
      setEnergyError(null);
      setLastUpdated(new Date());
      if (data && data.battery && data.battery.voltage) {
        setBatteryLevel(data.battery.voltage);
      }
    } catch (error) {
      console.error("Failed to load Victron data:", error);
      setEnergyError("Could not connect to the Victron system");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVictronData();
    const intervalId = setInterval(fetchVictronData, 10000);
    return () => clearInterval(intervalId);
  }, [fetchVictronData]);

  const getSystemStatus = () => {
    if (energyError) return { status: 'Victron offline', color: EnergyColor.low };
    if (!victronData) return { status: 'Connecting', color: MUTED };
    if (victronData.apiStatus === 'simulation') return { status: 'Simulated data', color: Color.colorSandybrown };
    if (victronData.grid && victronData.grid.isConnected) return { status: 'Shore power', color: EnergyColor.shore };
    if (victronData.pvCharger && victronData.pvCharger.power > 0) return { status: 'Solar charging', color: EnergyColor.solar };
    return { status: 'Battery power', color: EnergyColor.battery };
  };

  const onTabPress = (index) => {
    setTabIndex(index);
    if (pagerRef.current) {
      pagerRef.current.scrollTo({ x: pageWidth * index, y: 0, animated: true });
    }
  };

  const onHorizontalScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / pageWidth);
    if (newIndex !== tabIndex) setTabIndex(newIndex);
  };

  // —————————————————— OVERVIEW (tablet) ——————————————————
  const renderOverview = () => {
    const grid = victronData?.grid || {};
    const battery = victronData?.battery || {};
    const gridConnected = !!grid.isConnected;
    const gridW = gridConnected ? toNumber(grid.power) : 0;
    const solarW = toNumber(victronData?.pvCharger?.power);
    const acW = toNumber(victronData?.acLoads?.power);
    const dcW = toNumber(victronData?.dcSystem?.power);
    const battW = toNumber(battery.power); // + charging, - discharging
    const isCharging = battW > 1;
    const isDischarging = battW < -1;
    const soc = normaliseSoc(battery.soc);
    const socColor = soc !== null && soc <= 20 ? EnergyColor.low : EnergyColor.battery;
    const pvState = victronData?.pvCharger?.state;
    const status = getSystemStatus();

    // Inverter <-> battery: charging from shore flows down, inverting for AC loads flows up
    const inverterBatteryDirection =
      isCharging && gridW > 1 ? 'down' : isDischarging && acW > 1 ? 'up' : null;

    const gridDetail = () => {
      if (!victronData) return 'Waiting for data';
      if (!gridConnected) return 'Plug in to use shore power';
      const l1 = toNumber(grid.l1Power);
      const l2 = toNumber(grid.l2Power);
      if (l1 !== 0 || l2 !== 0) return `L1 ${Math.round(l1)} W · L2 ${Math.round(l2)} W`;
      return 'Shore power connected';
    };

    return (
      <View style={[styles.page, { width: pageWidth }]}>
        <TabletHeader title="Energy Overview" style={styles.header} />

        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>Live readings from your Victron system, every 10 seconds</Text>
          <View style={[styles.statusPill, { backgroundColor: `${status.color}1F`, borderColor: `${status.color}55` }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusPillText, { color: status.color }]}>{status.status}</Text>
            {refreshing && <Text style={styles.statusUpdating}> · Updating</Text>}
          </View>
        </View>

        {/* Victron layout: AC bus on top, DC bus below, inverter and battery linked in the middle */}
        <View style={styles.flow}>
          <View style={styles.flowRow}>
            <EnergyNode
              title="Shore Power"
              icon="transmission-tower"
              color={EnergyColor.shore}
              active={gridW > 1}
              watts={gridConnected ? gridW : undefined}
              value="--"
              badge={victronData ? (gridConnected ? 'Connected' : 'Unplugged') : null}
              subtitle={gridDetail()}
            />
            <FlowLink color={EnergyColor.shore} direction={gridW > 1 ? 'right' : null} watts={gridW} animate={!reduceMotion} />
            <EnergyNode
              title="Inverter / Charger"
              icon="sine-wave"
              color={EnergyColor.inverter}
              active={!!victronData}
              value={victronData?.systemOverview?.state || '--'}
              subtitle="MultiPlus"
            />
            <FlowLink color={EnergyColor.acLoads} direction={acW > 1 ? 'right' : null} watts={acW} animate={!reduceMotion} />
            <EnergyNode
              title="AC Loads"
              icon="home-lightning-bolt-outline"
              color={EnergyColor.acLoads}
              active={acW > 1}
              watts={victronData ? acW : undefined}
              value="--"
              subtitle="Outlets and appliances"
            />
          </View>

          {/* Vertical link sits under the center column */}
          <View style={styles.flowSpacerRow}>
            <View style={styles.flowCell} />
            <View style={styles.linkGap} />
            <View style={[styles.flowCell, styles.flowCellCenter]}>
              <FlowLink vertical color={EnergyColor.battery} direction={inverterBatteryDirection} watts={battW} animate={!reduceMotion} />
            </View>
            <View style={styles.linkGap} />
            <View style={styles.flowCell} />
          </View>

          <View style={styles.flowRow}>
            <EnergyNode
              title="Solar"
              icon="solar-power"
              color={EnergyColor.solar}
              active={solarW > 1}
              watts={victronData ? solarW : undefined}
              value="--"
              badge={victronData ? (solarW > 1 ? 'Producing' : 'Idle') : null}
              subtitle={pvState ? `Charger: ${pvState.charAt(0).toUpperCase()}${pvState.slice(1)}` : 'SmartSolar charger'}
            />
            <FlowLink color={EnergyColor.solar} direction={solarW > 1 ? 'right' : null} watts={solarW} animate={!reduceMotion} />
            <EnergyNode
              title="Battery"
              icon={isCharging ? 'battery-charging-high' : 'battery-high'}
              color={socColor}
              active={soc !== null}
              badge={soc === null ? null : isCharging ? 'Charging' : isDischarging ? 'Discharging' : 'Idle'}
            >
              <View>
                <Text style={styles.nodeValue}>
                  {soc === null ? '--' : Math.round(soc)}
                  <Text style={styles.nodeUnit}> %</Text>
                </Text>
                <View style={styles.socTrack}>
                  <View style={[styles.socFill, { width: `${soc ?? 0}%`, backgroundColor: socColor }]} />
                </View>
                <View style={styles.socFooter}>
                  <Text style={styles.nodeSubtitle}>
                    {isCharging ? '+' : isDischarging ? '−' : ''}
                    {splitWatts(battW).value} {splitWatts(battW).unit}
                  </Text>
                  <Text style={styles.nodeSubtitle}>
                    {battery.voltage !== undefined ? `${toNumber(battery.voltage).toFixed(1)} V` : '-- V'}
                  </Text>
                </View>
              </View>
            </EnergyNode>
            <FlowLink color={EnergyColor.dcLoads} direction={dcW > 1 ? 'right' : null} watts={dcW} animate={!reduceMotion} />
            <EnergyNode
              title="DC Loads"
              icon="current-dc"
              color={EnergyColor.dcLoads}
              active={dcW > 1}
              watts={victronData ? dcW : undefined}
              value="--"
              subtitle="Lights, pumps and fans"
            />
          </View>
        </View>
      </View>
    );
  };

  // —————————————————— TABLET VIEW WITH SWIPEABLE PAGES ——————————————————
  if (isTablet) {
    return (
      <View style={styles.tabletRoot}>
        <View
          style={styles.pagerWrapper}
          onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
        >
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onHorizontalScroll}
            scrollEventThrottle={16}
          >
            {renderOverview()}
            <SystemCharts width={pageWidth} />
          </ScrollView>

          {/* Page indicator */}
          <View style={styles.pagerDotsContainer} pointerEvents="box-none">
            {PAGES.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => onTabPress(i)}
                style={styles.pagerDotHit}
                accessibilityRole="button"
                accessibilityLabel={`Show ${label}`}
                accessibilityState={{ selected: tabIndex === i }}
              >
                <View style={[styles.pagerDot, tabIndex === i && styles.pagerDotActive]} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // —————————————————— MOBILE VIEW ——————————————————
  const status = getSystemStatus();
  const battery = victronData?.battery || {};
  const overview = victronData?.systemOverview || {};
  const soc = normaliseSoc(battery.soc);
  const battW = toNumber(battery.power); // + charging, - discharging
  const isCharging = battW > 1;
  const isDischarging = battW < -1;
  const isLow = soc !== null && soc <= 20;
  const battColor = isLow ? LOW : isCharging ? CHARGING : ACCENT;
  const battState = soc === null ? 'Waiting' : isCharging ? 'Charging' : isDischarging ? 'Discharging' : 'Idle';
  const battPower = splitWatts(battW);
  const battCurrent = toNumber(battery.current);

  const batteryStats = [
    { label: 'Voltage', value: battery.voltage !== undefined ? `${toNumber(battery.voltage).toFixed(1)} V` : '--' },
    { label: 'Current', value: battery.current !== undefined ? `${battCurrent > 0 ? '+' : ''}${battCurrent.toFixed(1)} A` : '--' },
    { label: 'Power', value: victronData ? `${isCharging ? '+' : isDischarging ? '−' : ''}${battPower.value} ${battPower.unit}` : '--' },
  ];

  const inverterRows = [
    { icon: 'sine-wave', label: 'State', value: overview.state },
    { icon: 'swap-horizontal', label: 'AC mode', value: overview.mode },
    { icon: 'current-ac', label: 'AC input limit', value: overview.acLimit !== undefined ? `${overview.acLimit} A` : null },
    { icon: 'chip', label: 'Device', value: overview.name },
  ];

  const updatedText = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Waiting for first reading';

  return (
    <View style={[styles.mobileRoot, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        overScrollMode="never"
        contentContainerStyle={styles.mobileContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: title, live status, refresh */}
        <View style={styles.mobileHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.mobileTitle}>Energy</Text>
            <View style={styles.mobileStatusRow}>
              <View style={[styles.mobileStatusPill, { backgroundColor: `${status.color}1F` }]}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.mobileStatusText, { color: status.color }]}>{status.status}</Text>
              </View>
              <Text style={styles.mobileUpdated} numberOfLines={1}>{updatedText}</Text>
            </View>
          </View>
          <Pressable
            onPress={fetchVictronData}
            disabled={refreshing}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Refresh energy readings"
            accessibilityState={{ busy: refreshing }}
          >
            {refreshing
              ? <ActivityIndicator size="small" color={ACCENT} />
              : <Ionicons name="refresh" size={20} color={ACCENT} />}
          </Pressable>
        </View>

        {/* Offline banner */}
        {energyError && (
          <View style={styles.offlineBanner}>
            <View style={styles.offlineIcon}>
              <Ionicons name="cloud-offline-outline" size={18} color={LOW} />
            </View>
            <View style={styles.offlineBody}>
              <Text style={styles.offlineTitle}>Victron system offline</Text>
              <Text style={styles.offlineText}>
                {victronData ? 'Showing the last readings we received.' : 'Waiting for the Cerbo GX to respond.'}
              </Text>
            </View>
            <Pressable
              onPress={fetchVictronData}
              disabled={refreshing}
              style={({ pressed }) => [styles.retryPill, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Retry connecting to the Victron system"
            >
              <Text style={styles.retryPillText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Battery */}
        <View
          style={[styles.batteryCard, { borderColor: `${battColor}40` }]}
          accessible
          accessibilityLabel={soc === null
            ? 'Battery, waiting for data'
            : `Battery ${Math.round(soc)} percent, ${battState}${battery.timeToGo ? `, ${battery.timeToGo} remaining` : ''}`}
        >
          <View style={styles.batteryTop}>
            <View style={[styles.batteryIcon, { backgroundColor: `${battColor}24` }]}>
              <MaterialCommunityIcons name={isCharging ? 'battery-charging-high' : 'battery-high'} size={20} color={battColor} />
            </View>
            <Text style={styles.batteryLabel}>House battery</Text>
            <View style={[styles.batteryBadge, { backgroundColor: soc === null ? TRACK : `${battColor}24` }]}>
              <Text style={[styles.batteryBadgeText, { color: soc === null ? MUTED : battColor }]}>{battState}</Text>
            </View>
          </View>

          <View style={styles.batteryReadout}>
            <Text style={styles.batteryPercent}>
              {soc === null ? '--' : Math.round(soc)}
              <Text style={styles.batteryPercentUnit}>%</Text>
            </Text>
            {battery.timeToGo ? (
              <Text style={styles.batteryTimeToGo}>
                {isCharging ? 'Full in' : 'Lasts'} <Text style={styles.batteryTimeToGoValue}>{battery.timeToGo}</Text>
              </Text>
            ) : null}
          </View>

          <View style={styles.batteryTrack}>
            <View style={[styles.batteryFill, { width: `${soc ?? 0}%`, backgroundColor: battColor }]} />
          </View>

          <View style={styles.batteryStats}>
            {batteryStats.map((stat, i) => (
              <View key={stat.label} style={[styles.batteryStat, i > 0 && styles.batteryStatDivider]}>
                <Text style={styles.batteryStatLabel}>{stat.label}</Text>
                <Text style={styles.batteryStatValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <EnergyFlowDiagram energyData={victronData} />

        {/* Inverter / charger details */}
        <Text style={styles.sectionLabel}>Inverter / Charger</Text>
        <View style={styles.listCard}>
          {inverterRows.map((row, i) => (
            <View key={row.label} style={styles.listRow}>
              <View style={styles.listIcon}>
                <MaterialCommunityIcons name={row.icon} size={18} color={ACCENT} />
              </View>
              <View style={[styles.listInner, i < inverterRows.length - 1 && styles.listDivider]}>
                <Text style={styles.listLabel}>{row.label}</Text>
                <Text style={[styles.listValue, !row.value && { color: MUTED }]} numberOfLines={1}>
                  {row.value || '--'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.mapSection}>
          <Text style={styles.mapTitle}>Live Location</Text>
          <View style={styles.mapContainer}>
            <Map />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // ——— Tablet ———
  tabletRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  pagerWrapper: {
    flex: 1,
    position: 'relative',
  },
  page: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 48, // room for the page indicator
  },
  header: {
    marginHorizontal: -24,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 16,
  },
  subtitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: MUTED,
    marginRight: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusPillText: {
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
  },
  statusUpdating: {
    color: MUTED,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
  },

  // Energy flow grid: three equal columns with fixed-width links between them
  flow: {
    flex: 1,
  },
  flowRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  flowSpacerRow: {
    height: FLOW_SPACER,
    flexDirection: 'row',
  },
  flowCell: {
    flex: 1,
  },
  flowCellCenter: {
    alignItems: 'center',
  },
  linkGap: {
    width: LINK_GAP,
  },

  node: {
    flex: 1,
    minHeight: 160,
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 18,
    justifyContent: 'space-between',
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nodeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nodeTitle: {
    flex: 1,
    color: Color.white0,
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
  },
  nodeValue: {
    color: Color.white0,
    fontSize: 40,
    fontFamily: FontFamily.latoBold,
  },
  nodeUnit: {
    color: MUTED,
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
  },
  nodeSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  socTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: TRACK,
    overflow: 'hidden',
    marginTop: 8,
  },
  socFill: {
    height: '100%',
    borderRadius: 4,
  },
  socFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  linkHorizontal: {
    width: LINK_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkVertical: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  linkLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
  },
  flowDot: {
    position: 'absolute',
    width: FLOW_DOT,
    height: FLOW_DOT,
    borderRadius: FLOW_DOT / 2,
  },
  flowDotHorizontal: {
    left: 0,
    top: '50%',
    marginTop: -FLOW_DOT / 2,
  },
  flowDotVertical: {
    top: 0,
    left: '50%',
    marginLeft: -FLOW_DOT / 2,
  },
  linkChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Page indicator: small dots, 44pt touch targets
  pagerDotsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagerDotHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3434',
  },
  pagerDotActive: {
    width: 24,
    backgroundColor: Color.colorSandybrown,
  },

  // ——— Mobile (matches the mobile Home screen: brown page, dark cards, sandy accent) ———
  mobileRoot: {
    flex: 1,
    backgroundColor: MOBILE_BG,
  },
  mobileContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  mobileTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: FontFamily.latoBold,
    letterSpacing: -0.5,
  },
  mobileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  mobileStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  mobileStatusText: {
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
  },
  mobileUpdated: {
    flexShrink: 1,
    color: MUTED,
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 10,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 178, 103, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonPressed: {
    backgroundColor: 'rgba(255, 178, 103, 0.24)',
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MOBILE_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
    padding: 12,
    marginBottom: 12,
  },
  offlineIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 107, 107, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  offlineBody: { flex: 1 },
  offlineTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
  },
  offlineText: {
    color: MUTED,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  retryPill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 178, 103, 0.14)',
    marginLeft: 10,
  },
  retryPillText: {
    color: ACCENT,
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
  },

  batteryCard: {
    backgroundColor: MOBILE_CARD,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  batteryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  batteryLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
  },
  batteryBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  batteryBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
  },
  batteryReadout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  batteryPercent: {
    color: '#FFFFFF',
    fontSize: 48,
    fontFamily: FontFamily.latoBold,
  },
  batteryPercentUnit: {
    color: MUTED,
    fontSize: 22,
    fontFamily: FontFamily.latoRegular,
  },
  batteryTimeToGo: {
    color: MUTED,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
  },
  batteryTimeToGoValue: {
    color: '#FFFFFF',
    fontFamily: FontFamily.latoBold,
  },
  batteryTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: TRACK,
    overflow: 'hidden',
    marginTop: 6,
  },
  batteryFill: {
    height: '100%',
    borderRadius: 5,
  },
  batteryStats: {
    flexDirection: 'row',
    marginTop: 14,
  },
  batteryStat: {
    flex: 1,
    alignItems: 'center',
  },
  batteryStatDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255, 255, 255, 0.12)',
  },
  batteryStatLabel: {
    color: MUTED,
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
  },
  batteryStatValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    marginTop: 2,
  },

  sectionLabel: {
    color: MUTED,
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 4,
    marginTop: 12,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: MOBILE_CARD,
    borderRadius: 16,
    paddingLeft: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  listIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 178, 103, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: 52,
    paddingRight: 14,
  },
  listDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  listLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
    marginRight: 12,
  },
  listValue: {
    maxWidth: '55%',
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    textAlign: 'right',
  },

  // Map - Modernized
  mapSection: { marginBottom: 24, marginTop: 8 },
  mapTitle: { color: '#FFFFFF', fontSize: 20, fontFamily: FontFamily.latoBold, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
  mapContainer: { borderRadius: 16, overflow: 'hidden', height: 260, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
});

export default System;
