import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, LogBox } from "react-native";
import RootNavigator from "../navigation/RootNavigator";
import TabletNavigator from "../navigation/TabletNavigator";
import { AuthProvider, useAuth } from "../components/AuthContext";
import { useScreenSize } from "../helper";

LogBox.ignoreAllLogs();

const AppContent = () => {
  const { isLoading } = useAuth();
  const isTablet = useScreenSize();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#4FC3F7" />
      </View>
    );
  }

  // Return tablet or mobile navigator
  return isTablet ? <TabletNavigator /> : <RootNavigator />;
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar hidden />
      <AppContent />
    </AuthProvider>
  );
}