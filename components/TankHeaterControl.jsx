import React from "react";
import { View, Text } from "react-native";
import VerticalSlider from "react-native-vertical-slider-smartlife";
import ToggleSwitch from "./ToggleSwitch"; // Adjust the path to your ToggleSwitch component
import useScreenSize from "../helper/useScreenSize.jsx";



const TankHeaterControl = ({ name, percentage, isOn, setIsOn, trackColor }) => {

    const isTablet = useScreenSize(); 
    if (isTablet){
        return (
    <View className="flex-row justify-center items-center py-4">
      <View className="items-center">
        <Text className="text-white text-lg font-semibold mb-2">{name}</Text> {/* Name on top */}
        <VerticalSlider
          value={percentage}
          disabled={false}
          min={0}
          max={100}
          width={60} // Narrow width for vertical slider
          height={120} // Increased height for vertical orientation
          step={1}
          borderRadius={5}
          minimumTrackTintColor={trackColor.minimum}
          maximumTrackTintColor={trackColor.maximum}
        />
        <Text className="text-white text-md font-semibold mt-2">{percentage}%</Text> {/* Percentage below slider */}
      </View>
      <View className="ml-3">
        <ToggleSwitch isOn={isOn} setIsOn={setIsOn} />
      </View>
    </View>
  );
    };
  return (
    <View className="flex-row justify-between py-2">
      <View className="items-center">
        <Text className="text-white">{percentage}%</Text>
        <VerticalSlider
          value={percentage}
          disabled={false}
          min={0}
          max={100}
          width={50} // Narrow width for vertical slider
          height={70} // Increased height for vertical orientation
          step={1}
          borderRadius={5}
          minimumTrackTintColor={trackColor.minimum}
          maximumTrackTintColor={trackColor.maximum}
        />
      </View>
      <View className="flex-row mt-10">
        <Text className="text-white text-lg mr-10">{name}</Text>
        <View className="mt-1">
          <ToggleSwitch isOn={isOn} setIsOn={setIsOn} />
        </View>
      </View>
    </View>
  );
};

export default TankHeaterControl;
