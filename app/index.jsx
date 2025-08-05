import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, LogBox } from "react-native";
import RootNavigator from "../navigation/RootNavigator";
import TabletNavigator from "../navigation/TabletNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider, useAuth } from "../components/AuthContext";
import AuthScreen from "../components/AuthScreen";
import { useScreenSize } from "../helper";

LogBox.ignoreAllLogs();

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const isTablet = useScreenSize();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#4FC3F7" />
      </View>
    );
  }

  // Tablet has direct access to RV components (no authentication required)
  // Mobile requires authentication for remote access
  if (!isTablet && !isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      {isTablet ? <TabletNavigator /> : <RootNavigator />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar hidden />
      <AppContent />
    </AuthProvider>
  );
}
