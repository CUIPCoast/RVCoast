import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import VerticalSlider from "react-native-vertical-slider-smartlife";
import ToggleSwitch from "./ToggleSwitch"; // Adjust the path to your ToggleSwitch component
import useScreenSize from "../helper/useScreenSize.jsx";
import { RVControlService } from "../API/rvAPI";
import AsyncStorage from '@react-native-async-storage/async-storage';

const TankHeaterControl = ({ name, initialPercentage, isOn, setIsOn, trackColor }) => {
  const [percentage, setPercentage] = useState(initialPercentage); // State for slider percentage
  const [isLoading, setIsLoading] = useState(false);
  const isTablet = useScreenSize();

  // Load saved tank levels from AsyncStorage on mount
  useEffect(() => {
    const loadTankLevels = async () => {
      try {
        // We're attempting to fetch saved tank levels for both fresh and grey water
        if (name === "Fresh Water") {
          const freshWaterLevel = await AsyncStorage.getItem('freshWaterLevel');
          if (freshWaterLevel) {
            setPercentage(parseInt(freshWaterLevel, 10));
          }
        } else if (name === "Gray Water") {
          const greyWaterLevel = await AsyncStorage.getItem('greyWaterLevel');
          if (greyWaterLevel) {
            setPercentage(parseInt(greyWaterLevel, 10));
          }
        }
      } catch (error) {
        console.error(`Error loading ${name} level:`, error);
      }
    };

    loadTankLevels();
  }, [name]);

  // Save tank levels to AsyncStorage when changed
  useEffect(() => {
    const saveTankLevel = async () => {
      try {
        if (name === "Fresh Water") {
          await AsyncStorage.setItem('freshWaterLevel', percentage.toString());
        } else if (name === "Gray Water") {
          await AsyncStorage.setItem('greyWaterLevel', percentage.toString());
        }
      } catch (error) {
        console.error(`Error saving ${name} level:`, error);
      }
    };

    saveTankLevel();
  }, [percentage, name]);

  // Handle toggle for water heater
  const handleToggle = async (newIsOn) => {
    setIsLoading(true);
    
    try {
      // Use the water_heater_toggle command from server.js
      const result = await RVControlService.executeCommand('water_heater_toggle');
      
      if (result.status === 'success') {
        setIsOn(newIsOn);
        
        // Save the state to AsyncStorage
        if (name === "Fresh Water") {
          await AsyncStorage.setItem('freshWaterHeaterState', JSON.stringify(newIsOn));
        } else if (name === "Gray Water") {
          await AsyncStorage.setItem('greyWaterHeaterState', JSON.stringify(newIsOn));
        }
      } else {
        console.error(`Failed to toggle ${name} heater:`, result.error);
      }
    } catch (error) {
      console.error(`Error toggling ${name} heater:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // This preserves the original UI
  if (isTablet) {
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
            onChange={(value) => setPercentage(value)} // Update percentage dynamically
          />
          <Text className="text-white text-md font-semibold mt-2">{percentage}%</Text> {/* Percentage below slider */}
        </View>
        
      </View>
    );
  }

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
          onChange={(value) => setPercentage(value)} // Update percentage dynamically
        />
      </View>
      <View className="flex-row mt-10">
        <Text className="text-white text-lg mr-10">{name}</Text>
        <View className="mt-1">
          <ToggleSwitch 
            isOn={isOn} 
            setIsOn={handleToggle} 
            disabled={isLoading}
          />
        </View>
      </View>
    </View>
  );
};

export default TankHeaterControl;