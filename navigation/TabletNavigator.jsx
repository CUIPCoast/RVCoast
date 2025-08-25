import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainScreen from "../screens/MainScreen";
import LightScreenTablet from "../screens/LightScreenTablet";
import TabletTabs from "./TabletTabs";
import TabletSplashScreen from "../components/TabletSplashScreenAdvanced";

const Stack = createStackNavigator();

const TabletNavigator = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched === null) {
        // First launch
        setIsFirstLaunch(true);
        setShowSplash(true);
      } else {
        // Not first launch - you can choose to still show splash or skip it
        setIsFirstLaunch(false);
        setShowSplash(true); // Set to false if you only want splash on first launch
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(true);
      setShowSplash(true);
    }
  };

  const handleSplashComplete = async () => {
    try {
      // Mark that the app has been launched
      await AsyncStorage.setItem('hasLaunched', 'true');
      setShowSplash(false);
    } catch (error) {
      console.error('Error saving launch status:', error);
      setShowSplash(false);
    }
  };

  // Main app content component
  const MainAppContent = () => (
    <NavigationContainer independent={true}>
      <TabletTabs />
    </NavigationContainer>
  );

  if (showSplash) {
    return (
      <TabletSplashScreen onSplashComplete={handleSplashComplete}>
        <MainAppContent />
      </TabletSplashScreen>
    );
  }

  // Once splash is complete, show only the main app
  return <MainAppContent />;
};

export default TabletNavigator;