import { StyleSheet, Text, View } from 'react-native'
import { SplashScreen, Stack } from 'expo-router'

import { useFonts } from "expo-font"
import { useEffect } from 'react'

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

const Rootlayout = () => {
  const [fontsLoaded, error] = useFonts({
    "Lato-Bold": require("../assets/Lato/Lato-Bold.ttf"),
    "Lato-ThinItalic": require("../assets/Lato/Lato-ThinItalic.ttf"),
    "Lato-Light": require("../assets/Lato/Lato-Light.ttf"),
    "Lato-Regular": require("../assets/Lato/Lato-Regular.ttf"),
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

