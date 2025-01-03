import React, { useState } from "react";
import { ScrollView, View, Text, Image } from "react-native";
import BatteryGauge from "../components/BatteryGauge";
import Map from "../components/Map";
import useScreenSize from "../helper/useScreenSize.jsx";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import VerticalSlider from "react-native-vertical-slider-smartlife";
import TankHeaterControl from "../components/TankHeaterControl";

const System = () => {
  const [isOn, setIsOn] = useState(false);
  const [isOnGray, setIsOnGray] = useState(false);

  const isTablet = useScreenSize(); 
  const [batteryLevel, setBatteryLevel] = useState(12.5);
 
  if (isTablet) {
    return (
    <View className="m-3">
      <View className="flex-row justify-between">
        <Text className="text-white text-lg">Solar Power</Text>
        <ToggleSwitch  isOn={isOn} setIsOn={setIsOn} />

      </View>
      <View className="justify-between pb-5">
      <Image className="h-4 w-7 mt-2 ml-2" source={require("../assets/battery.png")} />


      <BatteryGauge />
        
      </View>
    </View>);
  }
  return (
    <ScrollView 
      overScrollMode="never"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }} 
      decelerationRate={0.8}
      className="bg-brown"
    >
      <Text className="text-white text-3xl font-semibold mb-4">Health</Text>

      <View className="mb-6">
        <Text className="text-white text-lg font-semibold mb-2">Live Location</Text>
        <Map />
      </View>

      <View className="items-center">
        <View className="flex-row items-center mb-3">
          <View className="bg-orange-300 p-4 rounded-lg items-center mx-3 h-22 w-32">
            <Text className="text-black text-lg font-bold mb-1">Shore</Text>
            <Text className="text-gray-700 text-2xl font-bold">965 W</Text>
          </View>

          <View className="bg-orange-300 p-4 rounded-lg items-center mx-3 h-22 w-32">
            <Text className="text-black text-lg font-bold mb-1">Battery Life</Text>
            <Text className="text-gray-700 text-2xl font-bold">61%</Text>
          </View>
        </View>
        

          <View className="flex-row justify-between mb-8">
            <View className="bg-orange-300 p-4 rounded-lg items-center mx-3 h-22 w-32">
              <Text className="text-black text-lg font-bold mb-1">AC Loads</Text>
              <Text className="text-gray-700 text-2xl font-bold">662 W</Text>
            </View>

            <View className="bg-orange-300 p-4 rounded-lg items-center mx-3 h-22 w-32">
              <Text className="text-black text-lg font-bold mb-1">PV Charger</Text>
              <Text className="text-gray-700 text-2xl font-bold">0.0 W</Text>
            </View>

        </View>
      </View>

      <View className="items-center">
        <BatteryGauge />
        {/* <BatteryGauge /> */}
      </View>

      <View className="mt-3">

      <TankHeaterControl
  name="Fresh Water Tank Heater"
  percentage={80}
  isOn={isOn}
  setIsOn={setIsOn}
  trackColor={{ minimum: "lightblue", maximum: "white" }}
/>

<TankHeaterControl
  name="Gray Water Tank Heater"
  percentage={40}
  isOn={isOnGray}
  setIsOn={setIsOnGray}
  trackColor={{ minimum: "gray", maximum: "white" }}
/>

      

      </View>

      

    </ScrollView>
  );
  
};

export default System;
