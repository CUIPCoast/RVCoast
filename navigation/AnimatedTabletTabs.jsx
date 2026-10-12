// AnimatedTabletTabs.jsx
// Floating tablet tab bar: icon + label side by side, with a sliding highlight pill behind the active tab.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, AccessibilityInfo } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Color, FontFamily } from '../GlobalStyles';

const ACCENT = Color.colorSandybrown;
const INACTIVE = '#9E9696';
const BAR_PADDING = 6;
const BAR_HEIGHT = 64;

const DEFAULT_TABS = [
  { name: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'System', label: 'Lights', icon: 'lightbulb-outline', activeIcon: 'lightbulb' },
  { name: 'Air Conditioning', label: 'Climate', icon: 'snowflake' },
  { name: 'Vents', icon: 'weather-windy' },
  { name: 'Victron', icon: 'battery-charging-outline', activeIcon: 'battery-charging' },
  { name: 'Settings', icon: 'cog-outline', activeIcon: 'cog' },
];

const AnimatedTabletTabs = ({
  tabs: tabsProp,
  initialTab,
  onTabChange,
  renderScene,
}) => {
  const tabs = useMemo(
    () => (tabsProp?.length ? tabsProp : DEFAULT_TABS),
    [tabsProp]
  );

  const initialIndex = Math.max(0, tabs.findIndex((t) => t.name === initialTab));
  const [activeTab, setActiveTab] = useState(tabs[initialIndex]?.name ?? tabs[0].name);
  const [barWidth, setBarWidth] = useState(0);

  const pillAnim = useRef(new Animated.Value(initialIndex)).current;
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.name === activeTab));

  // Respect the system "reduce motion" setting
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  // Slide the pill whenever the active tab changes
  useEffect(() => {
    Animated.timing(pillAnim, {
      toValue: activeIndex,
      duration: reduceMotion ? 0 : 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, pillAnim, reduceMotion]);

  // Measured from the real bar so the pill always lines up with its tab
  const tabWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / tabs.length : 0;

  // Switch the screen immediately; the pill animates alongside
  const switchTab = (name) => {
    if (name === activeTab) return;
    setActiveTab(name);
    onTabChange?.(name);
  };

  const renderContent = () => {
    if (typeof renderScene === 'function') return renderScene(activeTab);
    const activeRoute = tabs.find((t) => t.name === activeTab);
    if (activeRoute?.component) {
      const ScreenComponent = activeRoute.component;
      return <ScreenComponent />;
    }
    return (
      <View style={[styles.contentContainer, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#fff', fontSize: 18, fontFamily: FontFamily.latoBold }}>{activeTab}</Text>
        <Text style={{ color: '#bbb', marginTop: 6, fontFamily: FontFamily.latoRegular }}>Add your screen for "{activeTab}".</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Content Area */}
      <View style={styles.contentWrapper}>{renderContent()}</View>

      {/* Tab bar */}
      <View style={styles.tabBarContainer}>
        <View
          style={styles.tabBar}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          accessibilityRole="tablist"
        >
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pill,
                {
                  width: tabWidth,
                  transform: [
                    {
                      translateX: pillAnim.interpolate({
                        inputRange: [0, Math.max(1, tabs.length - 1)],
                        outputRange: [BAR_PADDING, BAR_PADDING + tabWidth * Math.max(1, tabs.length - 1)],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}

          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const label = tab.label || tab.name;
            return (
              <Pressable
                key={tab.name}
                style={({ pressed }) => [styles.tabButton, pressed && !isActive && styles.tabPressed]}
                onPress={() => switchTab(tab.name)}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: isActive }}
              >
                <MaterialCommunityIcons
                  name={isActive ? tab.activeIcon || tab.icon : tab.icon}
                  color={isActive ? ACCENT : INACTIVE}
                  size={24}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Side padding kept from the old bar: screens like Victron place cards at fixed coordinates
  container: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: '#000',
  },
  contentWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
  },
  tabBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  tabBar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    padding: BAR_PADDING,
    borderRadius: 22,
    backgroundColor: '#211D1D',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  pill: {
    position: 'absolute',
    top: BAR_PADDING,
    left: 0,
    height: BAR_HEIGHT - BAR_PADDING * 2 - 2,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 178, 103, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabLabel: {
    color: INACTIVE,
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    marginLeft: 8,
  },
  tabLabelActive: {
    color: ACCENT,
  },
});

export default AnimatedTabletTabs;
