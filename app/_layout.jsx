import { StyleSheet, Text, View } from 'react-native'
import { SplashScreen, Stack } from 'expo-router'
import { Header } from 'react-native/Libraries/NewAppScreen'
import { useFonts } from "expo-font"
import { useEffect } from 'react'

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

const Rootlayout = () => {
  const [fontsLoaded, error] = useFonts({
    "Manrope-Bold": require("../assets/Manrope/static/Manrope-Bold.ttf"),
    "Manrope-SemiBold": require("../assets/Manrope/static/Manrope-SemiBold.ttf"),
    "Manrope-Medium": require("../assets/Manrope/static/Manrope-Medium.ttf"),
    "Manrope-Regular": require("../assets/Manrope/static/Manrope-Regular.ttf"),
  });
  if (!fontsLoaded) {
    return null;
  }
  return (
    <Stack>
        <Stack.Screen name="index" options={{headerShown: false}} />
    </Stack>
  )
}

export default Rootlayout

