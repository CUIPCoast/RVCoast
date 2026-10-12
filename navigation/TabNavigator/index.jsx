import React from "react";
import Home from "../../screens/Home";
import Devices from "../../screens/Devices";
import Settings from "../../screens/Settings";
import System from "../../screens/System";
import useScreenSize from "../../helper/useScreenSize";
import MainScreen from "../../screens/MainScreen";
import AnimatedMobileTabs from "../AnimatedMobileTabs";

// Define the TabNavigator component
const TabNavigator = () => {
  const isTablet = useScreenSize();
  
  // If the screen is a tablet, render MainScreen (which shows tablet navigation)
  if (isTablet) {
    console.log(isTablet);
    return <MainScreen />;
  }

  // Define mobile routes with AntDesign icon names
  const MOBILE_ROUTES = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home', component: Home },
    { name: 'System', label: 'Energy', icon: 'lightning-bolt-outline', activeIcon: 'lightning-bolt', component: System },
    { name: 'Devices', icon: 'lightbulb-group-outline', activeIcon: 'lightbulb-group', component: Devices },
    { name: 'Settings', icon: 'cog-outline', activeIcon: 'cog', component: Settings },
  ];

  // For phones, use the new animated tabs
  return (
    <AnimatedMobileTabs
      tabs={MOBILE_ROUTES}
      initialTab="Home"
      // onTabChange={(name) => console.log('Active mobile tab:', name)}
    />
  );
};

export default TabNavigator;