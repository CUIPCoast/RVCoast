import { StyleSheet, Text, View, Dimensions } from 'react-native'
import { SplashScreen, Stack } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'

import { useFonts } from "expo-font"
import { useEffect } from 'react'

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

// Function to detect if device is a tablet based on screen size
const isTablet = () => {
  const { width, height } = Dimensions.get('window')
  const aspectRatio = width / height
  const pixelDensity = Dimensions.get('window').scale

  // Calculate screen diagonal in inches
  const screenWidth = width / pixelDensity
  const screenHeight = height / pixelDensity
  const diagonalInches = Math.sqrt(
    Math.pow(screenWidth, 2) + Math.pow(screenHeight, 2)
  ) / 160

  // Consider devices with diagonal >= 7 inches as tablets
  return diagonalInches >= 7
}

const Rootlayout = () => {
  const [fontsLoaded, error] = useFonts({
    "Lato-Bold": require("../assets/Lato/Lato-Bold.ttf"),
    "Lato-ThinItalic": require("../assets/Lato/Lato-ThinItalic.ttf"),
    "Lato-Light": require("../assets/Lato/Lato-Light.ttf"),
    "Lato-Regular": require("../assets/Lato/Lato-Regular.ttf"),
  });

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (isTablet()) {
          // Tablet: Lock to landscape mode only
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          )
        } else {
          // Mobile: Lock to portrait mode only
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          )
        }
      } catch (error) {
        console.error('Error locking orientation:', error)
      }
    }

    lockOrientation()
  }, [])

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

