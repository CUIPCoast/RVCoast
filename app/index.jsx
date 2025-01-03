import React from "react";
import { StatusBar } from "expo-status-bar";
import { Dimensions } from "react-native";
import RootNavigator from "../navigation/RootNavigator";
import TabletNavigator from "../navigation/TabletNavigator"; // New tablet navigator
import { NavigationContainer } from "@react-navigation/native";
import useScreenSize from "../helper/useScreenSize";
export default function App() {
 
  return (
    <>
      <StatusBar hidden />
      <NavigationContainer>
        {useScreenSize() ? <TabletNavigator /> : <RootNavigator />}
      </NavigationContainer>
    </>
  );
}
