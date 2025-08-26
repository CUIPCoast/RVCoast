import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainScreen from "../screens/MainScreen";
import LightScreenTablet from "../screens/LightScreenTablet";
import TabletTabs from "./TabletTabs";
import TabletSplashScreen from "../components/TabletSplashScreenAdvanced";
import AnimatedSplashScreen from "../components/AnimatedSplashScreen";

const Stack = createStackNavigator();

const TabletNavigator = () => {
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched === null) {
        // First launch
        setIsFirstLaunch(true);
        setShowAnimatedSplash(true);
      } else {
        // Not first launch - you can choose to still show splash or skip it
        setIsFirstLaunch(false);
        setShowAnimatedSplash(true); // Set to false if you only want splash on first launch
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(true);
      setShowAnimatedSplash(true);
    }
  };

  const handleAnimatedSplashComplete = () => {
    setShowAnimatedSplash(false);
    setShowCustomSplash(true);
  };

  const handleCustomSplashComplete = async () => {
    try {
      // Mark that the app has been launched
      await AsyncStorage.setItem('hasLaunched', 'true');
      setShowCustomSplash(false);
      setIsReady(true);
    } catch (error) {
      console.error('Error saving launch status:', error);
      setShowCustomSplash(false);
      setIsReady(true);
    }
  };

  // Main app content component - only create when needed
  const MainAppContent = () => (
    <NavigationContainer independent={true}>
      <TabletTabs />
    </NavigationContainer>
  );

  // Show animated splash screen first
  if (showAnimatedSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <AnimatedSplashScreen onComplete={handleAnimatedSplashComplete}>
          {/* Don't render MainAppContent until splash is done */}
        </AnimatedSplashScreen>
      </View>
    );
  }

  // Show custom splash screen second
  if (showCustomSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <TabletSplashScreen onSplashComplete={handleCustomSplashComplete}>
          <MainAppContent />
        </TabletSplashScreen>
      </View>
    );
  }

  // Once both splashes are complete, show only the main app
  return isReady ? (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <MainAppContent />
    </View>
  ) : (
    <View style={{ flex: 1, backgroundColor: '#000000' }} />
  );
};

export default TabletNavigator;