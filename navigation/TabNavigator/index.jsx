import React, { useState, useEffect } from "react";
import { Dimensions, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Home from "../../screens/Home";
import Devices from "../../screens/Devices";
import Settings from "../../screens/Settings";
import System from "../../screens/System";
import Icon from "react-native-vector-icons/AntDesign";
import useScreenSize from "../../helper/useScreenSize";
import MainScreen from "../../screens/MainScreen";


const Tab = createBottomTabNavigator();
// Function to determine which icon to show based on the route name
const screenOptions = (route, color) => {
  let iconName;

  switch (route.name) {
    case "Home":
      iconName = "home"; 
      break;
    case "Devices":
      iconName = "API"; 
      break;
    case "Settings":
      iconName = "setting"; 
      break;
    case "System":
      iconName = "barchart"; 
      break;
    default:
      break;
  }

  return <Icon name={iconName} color={color} size={24} />;
};

// Define the TabNavigator component
const TabNavigator = () => {
  const isTablet = useScreenSize(); // Check if the screen is large enough to be considered a tablet
  // If the screen is a tablet, render nothing (null) to hide the tab navigator
  if (isTablet) {
    console.log(isTablet);
    return (
    <>
        <MainScreen />
    </>);
  }

  return (
    // Setting up the Tab.Navigator with custom screen options for phones only
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => screenOptions(route, color), // Set tabBarIcon using the screenOptions function
        headerShown: false, // Hide the top header for all tabs
        tabBarActiveTintColor: "#FFB267",
        tabBarInactiveTintColor: "#FFFFFF",
        tabBarLabel: () => null, // Hide tab labels
        tabBarStyle: {
          borderTopColor: "#211D1D",
          backgroundColor: "#211D1D",
          elevation: 0,
        },
      })}
    >
      {/* Defining individual tabs and their associated components */}
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="System" component={System} />
      <Tab.Screen name="Devices" component={Devices} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
