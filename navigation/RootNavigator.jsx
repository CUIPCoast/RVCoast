import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";


import TabNavigator from "./TabNavigator";

// Define the RootNavigator component
const RootNavigator = () => {
  return (
    // NavigationContainer is the parent container that manages navigation state and allows the app to navigate between screens
    
    <NavigationContainer independent={true}>  
      <TabNavigator /> 
    
    </NavigationContainer>
    // Render the TabNavigator component which handles the tab-based navigation
  );
};
export default RootNavigator;
