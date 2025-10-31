// navigation/TabletNavigator.jsx
import React, { useState, useEffect } from "react";
import { View } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

import AnimatedTabletTabs from "./AnimatedTabletTabs";
import { NavigationProvider, useNavigation } from "./NavigationContext";

// Splash screens
import TabletSplashScreen from "../components/TabletSplashScreenAdvanced";
import AnimatedSplashScreen from "../components/AnimatedSplashScreen";

// The same screens you used in TabletTabs
import MainScreen from '../screens/MainScreen';
import System from '../screens/System';
import Settings from '../screens/Settings';
import Vents from '../screens/Vents';
import LightScreenTablet from '../screens/LightScreenTablet';
import ClimateControl from '../screens/ClimateControlScreenTablet';
import Profile from '../screens/Profile';

const TabletNavigator = () => {
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { checkFirstLaunch(); }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched === null) {
        setShowAnimatedSplash(true);
      } else {
        setShowAnimatedSplash(true); // set false if you only want splash on first launch
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
      setShowAnimatedSplash(true);
    }
  };

  const handleAnimatedSplashComplete = () => {
    setShowAnimatedSplash(false);
    setShowCustomSplash(true);
  };

  const handleCustomSplashComplete = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      setShowCustomSplash(false);
      setIsReady(true);
    } catch (error) {
      console.error('Error saving launch status:', error);
      setShowCustomSplash(false);
      setIsReady(true);
    }
  };

  // Tablet Tab Content Component
  const TabletTabContent = () => {
    const { currentScreen } = useNavigation();

    // Define the same six routes as TabletTabs, with components + Ionicons icon names
    const ROUTES = [
      { name: 'Home',            icon: 'home-outline',              component: MainScreen },
      { name: 'System',          icon: 'stats-chart-outline',       component: LightScreenTablet }, 
      { name: 'Air Conditioning',icon: 'snow-outline',              component: ClimateControl },
      { name: 'Vents',           icon: 'cloud-outline',             component: Vents },
      { name: 'Victron',         icon: 'battery-charging-outline',  component: System },            
      { name: 'Settings',        icon: 'settings-outline',          component: Settings },
    ];

    // If a screen is pushed (like Profile), show it instead of tabs
    if (currentScreen) {
      if (currentScreen.screen === 'Profile') {
        return <Profile />;
      }
    }

    return (
      <AnimatedTabletTabs
        tabs={ROUTES}
        initialTab="Home"
        // onTabChange={(name) => console.log('Active tab:', name)}
      />
    );
  };

  const MainAppContent = () => (
    <NavigationProvider>
      <TabletTabContent />
    </NavigationProvider>
  );

  if (showAnimatedSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <AnimatedSplashScreen onComplete={handleAnimatedSplashComplete} />
      </View>
    );
  }

  if (showCustomSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <TabletSplashScreen onSplashComplete={handleCustomSplashComplete}>
          <MainAppContent />
        </TabletSplashScreen>
      </View>
    );
  }

  return isReady ? (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <MainAppContent />
    </View>
  ) : (
    <View style={{ flex: 1, backgroundColor: '#000000' }} />
  );
};

export default TabletNavigator;
