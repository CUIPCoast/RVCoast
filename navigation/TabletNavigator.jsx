import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import MainScreen from "../screens/MainScreen";
import LightScreenTablet from "../screens/LightScreenTablet";
import TabletTabs from "./TabletTabs";
const Stack = createStackNavigator();

const TabletNavigator = () => {
  return (
    <NavigationContainer independent={true}>
      <TabletTabs />
    </NavigationContainer>
  );
};

export default TabletNavigator;