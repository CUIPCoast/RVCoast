import React, { useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from "react-native";
import TabNavigator from "./TabNavigator";
import MobileSplashScreen from "../components/MobileSplashScreenAdvanced";
import MobileAnimatedSplashScreen from "../components/MobileAnimatedSplashScreen";

// Define the RootNavigator component
const RootNavigator = () => {
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [showCustomSplash, setShowCustomSplash] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { 
    checkFirstLaunch(); 
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('mobileLaunched');
      if (hasLaunched === null) {
        setShowAnimatedSplash(true);
      } else {
        setShowAnimatedSplash(true); // set to false if you only want splash on first launch
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
      await AsyncStorage.setItem('mobileLaunched', 'true');
      setShowCustomSplash(false);
      setIsReady(true);
    } catch (error) {
      console.error('Error saving launch status:', error);
      setShowCustomSplash(false);
      setIsReady(true);
    }
  };

  // REMOVED NavigationContainer - it's already in app/index.jsx
  const MainAppContent = () => (
    <TabNavigator /> 
  );

  if (showAnimatedSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <MobileAnimatedSplashScreen onComplete={handleAnimatedSplashComplete} />
      </View>
    );
  }

  if (showCustomSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <MobileSplashScreen onSplashComplete={handleCustomSplashComplete}>
          <MainAppContent />
        </MobileSplashScreen>
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

export default RootNavigator;