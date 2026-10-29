// AnimatedMobileTabs.jsx
// Bottom tab bar for phones: labelled icons with a sliding highlight pill behind the active tab.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, AccessibilityInfo } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Color, FontFamily } from '../GlobalStyles';
import ErrorBoundary from '../components/ErrorBoundary';

const ACCENT = Color.colorSandybrown;
const INACTIVE = '#9E9696';
const BAR_PADDING = 8;
const PILL_INSET = 6;

// Default tabs matching your mobile TabNavigator
const DEFAULT_TABS = [
  { name: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'System', icon: 'lightning-bolt-outline', activeIcon: 'lightning-bolt' },
  { name: 'Devices', icon: 'lightbulb-group-outline', activeIcon: 'lightbulb-group' },
  { name: 'Settings', icon: 'cog-outline', activeIcon: 'cog' },
];

const AnimatedMobileTabs = ({
  tabs: tabsProp,
  initialTab,
  onTabChange,
  renderScene,
}) => {
  const insets = useSafeAreaInsets();
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

  const tabWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / tabs.length : 0;

  // Switch the screen immediately; the pill animates alongside
  const switchTab = (name) => {
    if (name === activeTab) return;
    setActiveTab(name);
    onTabChange?.(name);
  };

  // Render active screen
  const renderContent = () => {
    if (typeof renderScene === 'function') return renderScene(activeTab);

    const activeRoute = tabs.find((t) => t.name === activeTab);
    if (activeRoute?.component) {
      const ScreenComponent = activeRoute.component;
      return <ScreenComponent />;
    }

    // Fallback
    return (
      <View style={[styles.contentContainer, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#fff', fontSize: 18 }}>{activeTab}</Text>
        <Text style={{ color: '#bbb', marginTop: 6 }}>Add your screen for "{activeTab}".</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Content Area */}
      <View style={styles.contentWrapper}>
        <ErrorBoundary key={activeTab} name={activeTab}>{renderContent()}</ErrorBoundary>
      </View>

      {/* Tab bar */}
      <View
        style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                width: tabWidth - PILL_INSET * 2,
                transform: [
                  {
                    translateX: pillAnim.interpolate({
                      inputRange: [0, Math.max(1, tabs.length - 1)],
                      outputRange: [
                        BAR_PADDING + PILL_INSET,
                        BAR_PADDING + PILL_INSET + tabWidth * Math.max(1, tabs.length - 1),
                      ],
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#211D1D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 178, 103, 0.12)',
    paddingHorizontal: BAR_PADDING,
    paddingTop: 8,
  },
  pill: {
    position: 'absolute',
    top: 8,
    left: 0,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 178, 103, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
  },
  tabButton: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabLabel: {
    color: INACTIVE,
    fontSize: 12,
    fontFamily: FontFamily.latoBold,
    marginTop: 3,
  },
  tabLabelActive: {
    color: ACCENT,
  },
});

export default AnimatedMobileTabs;
