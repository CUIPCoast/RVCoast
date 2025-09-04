// AnimatedTabletTabs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

// Default labels + icons that mirror your TabletTabs layout.
// (Components are supplied from the navigator via props; these are only fallbacks.)
const DEFAULT_TABS = [
  { name: 'Home', icon: 'home-outline' },
  { name: 'System', icon: 'stats-chart-outline' },
  { name: 'Air Conditioning', icon: 'snow-outline' },
  { name: 'Vents', icon: 'cloud-outline' },
  { name: 'Victron', icon: 'battery-charging-outline' },
  { name: 'Settings', icon: 'settings-outline' },
];



const AnimatedTabletTabs = ({
  tabs: tabsProp,        // [{ name, icon, component }]
  initialTab,
  onTabChange,
  renderScene,          // optional: (activeTabName) => ReactNode
}) => {
  const tabs = useMemo(
    () => (tabsProp?.length ? tabsProp : DEFAULT_TABS),
    [tabsProp]
  );

  const initialIndex = Math.max(
    0,
    tabs.findIndex((t) => t.name === initialTab)
  );

  const [activeTab, setActiveTab] = useState(tabs[initialIndex]?.name ?? tabs[0].name);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const tabIndicatorAnim = useRef(new Animated.Value(initialIndex)).current;

  // Keep indicator in sync if tabs/activeTab change
  useEffect(() => {
    const idx = Math.max(0, tabs.findIndex((t) => t.name === activeTab));
    tabIndicatorAnim.setValue(idx);
  }, [tabs, activeTab, tabIndicatorAnim]);

  const perTabWidth = useMemo(() => (screenWidth - 80) / tabs.length, [tabs.length]);

  const switchTab = (name) => {
    const toIndex = tabs.findIndex((t) => t.name === name);
    if (toIndex < 0 || name === activeTab) return;

    setIsTransitioning(true);
    Animated.timing(tabIndicatorAnim, {
      toValue: toIndex,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(name);
      setIsTransitioning(false);
      onTabChange?.(name);
    });
  };

const INDICATOR_WIDTH_RATIO = 0.95; // 60% of a tab (tweak to taste)

const indicatorWidth = useMemo(
  () => perTabWidth * INDICATOR_WIDTH_RATIO,
  [perTabWidth]
);

const indicatorCenterOffset = useMemo(
  () => (perTabWidth - indicatorWidth) / 2,
  [perTabWidth, indicatorWidth]
);


  // Render active screen (exactly like TabletTabs shows each Screen component)
  const renderContent = () => {
    if (typeof renderScene === 'function') return renderScene(activeTab);

    const activeRoute = tabs.find((t) => t.name === activeTab);
    if (activeRoute?.component) {
      const ScreenComponent = activeRoute.component;
      return <ScreenComponent />;
    }

    // Fallback if no component provided
    return (
      <View style={[styles.contentContainer, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#fff', fontSize: 18 }}>{activeTab}</Text>
        <Text style={{ color: '#bbb', marginTop: 6 }}>Add your screen for “{activeTab}”.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Content Area */}
      <View style={styles.contentWrapper}>{renderContent()}</View>

      {/* Custom Tab Bar */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {/* Animated Tab Indicator */}
          <Animated.View
  style={[
    styles.tabIndicator,
    {
      width: indicatorWidth,
      transform: [
        {
          translateX: tabIndicatorAnim.interpolate({
            inputRange: [0, tabs.length - 1],
            outputRange: [
              indicatorCenterOffset,
              perTabWidth * (tabs.length - 1) + indicatorCenterOffset
            ],
            extrapolate: 'clamp',
          }),
        },
      ],
    },
  ]}
/>

          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tabButton, isActive && styles.activeTabButton]}
                onPress={() => switchTab(tab.name)}
                activeOpacity={0.7}
                disabled={isTransitioning}
              >
                <Animated.View
                  style={[
                    styles.iconContainer,
                    { transform: [{ scale: isActive ? 1.1 : 1 }] },
                  ]}
                >
                  <Icon
                    name={tab.icon}
                    color={isActive ? '#FFB267' : '#FFFFFF'}
                    size={24}
                  />
                </Animated.View>

                <Animated.Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? '#FFB267' : '#FFFFFF',
                      opacity: isActive ? 1 : 0.7,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                >
                  {tab.name === 'Air Conditioning' ? 'AC' : tab.name}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 10, paddingBottom: -10, backgroundColor: '#000' },
  contentWrapper: { flex: 1, overflow: 'hidden' },
  contentContainer: { flex: 1 },
  tabBarContainer: { paddingHorizontal: 10, paddingBottom: 10 },
  tabBar: {
    backgroundColor: '#242124',
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    height: 3,
    
    backgroundColor: '#FFB267',
    borderRadius: 2,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  tabButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, marginHorizontal: 2, minHeight: 60,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 178, 103, 0.1)',
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: { marginBottom: 4, padding: 2 },
  tabLabel: { fontSize: 10, textAlign: 'center', letterSpacing: 0.3 },
});

export default AnimatedTabletTabs;
