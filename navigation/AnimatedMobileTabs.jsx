// AnimatedMobileTabs.jsx
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
import {AntDesign } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

// Default tabs matching your mobile TabNavigator
const DEFAULT_TABS = [
  { name: 'Home', icon: 'home' },
  { name: 'System', icon: 'api' },
  { name: 'Devices', icon: 'api' },
  { name: 'Settings', icon: 'setting' },
];

const AnimatedMobileTabs = ({
  tabs: tabsProp,
  initialTab,
  onTabChange,
  renderScene,
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

  const perTabWidth = useMemo(() => screenWidth / tabs.length, [tabs.length]);

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

  const INDICATOR_WIDTH_RATIO = 0.6; // 60% of a tab width
  const indicatorWidth = useMemo(
    () => perTabWidth * INDICATOR_WIDTH_RATIO,
    [perTabWidth]
  );

  const indicatorCenterOffset = useMemo(
    () => (perTabWidth - indicatorWidth) / 2,
    [perTabWidth, indicatorWidth]
  );

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
      <View style={styles.contentWrapper}>{renderContent()}</View>

      {/* Custom Tab Bar - at bottom for mobile */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {/* Animated Tab Indicator - at top of tab bar */}
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
                    { transform: [{ scale: isActive ? 1.15 : 1 }] },
                  ]}
                >
                  <AntDesign
                    name={tab.icon}
                    color={isActive ? '#FFB267' : '#FFFFFF'}
                    size={24}
                  />
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  contentWrapper: { 
    flex: 1, 
    overflow: 'hidden' 
  },
  contentContainer: { 
    flex: 1 
  },
  tabBarContainer: { 
    backgroundColor: '#211D1D',
    borderTopWidth: 1,
    borderTopColor: '#211D1D',
  },
  tabBar: {
    backgroundColor: '#211D1D',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
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
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 60,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 178, 103, 0.08)',
  },
  iconContainer: { 
    padding: 4 
  },
});

export default AnimatedMobileTabs;