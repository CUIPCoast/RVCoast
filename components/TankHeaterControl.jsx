import React, { useState, useEffect, useRef } from "react";
import { View, Text } from "react-native";
import VerticalSlider from "react-native-vertical-slider-smartlife";
import ToggleSwitch from "./ToggleSwitch"; // Adjust the path to your ToggleSwitch component
import useScreenSize from "../helper/useScreenSize.jsx";
import { RVControlService } from "../API/rvAPI";
import { createCANBusListener } from "../Service/CANBusListener";

const TankHeaterControl = ({ name, tankType, isOn, setIsOn, trackColor }) => {
  const [percentage, setPercentage] = useState(25); // Start with current actual levels
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const canListener = useRef(null);
  const reconnectTimeout = useRef(null);
  const isTablet = useScreenSize();

  // Initialize tank levels based on current real data
  useEffect(() => {
    const initializeTankLevels = () => {
      if (tankType === "fresh") {
        setPercentage(25); // Current fresh water level
      } else if (tankType === "gray") {
        setPercentage(0); // Current gray water level
      } else if (tankType === "black") {
        setPercentage(0); // Assuming black tank is also empty
      }
    };

    initializeTankLevels();
  }, [tankType]);

  // Set up CAN bus listener for real-time tank data
  useEffect(() => {
    const setupCANListener = () => {
      try {
        console.log(`TankHeaterControl: Setting up CAN listener for ${name} (${tankType})`);
        
        canListener.current = createCANBusListener();
        
        // Listen for tank status messages
        canListener.current.on('message', (message) => {
          try {
            // Look for TANK_STATUS messages (DGN 1FFB7)
            if (message.dgn === '1FFB7' || message.name === 'TANK_STATUS') {
              handleTankStatusMessage(message);
            }
          } catch (error) {
            console.error('Error processing tank message:', error);
          }
        });

        canListener.current.on('connected', () => {
          console.log(`TankHeaterControl: CAN listener connected for ${name}`);
          setIsConnected(true);
          setLastUpdate(new Date());
        });

        canListener.current.on('disconnected', () => {
          console.log(`TankHeaterControl: CAN listener disconnected for ${name}`);
          setIsConnected(false);
          // Try to reconnect after a delay
          scheduleReconnect();
        });

        canListener.current.on('error', (error) => {
          console.error(`TankHeaterControl: CAN listener error for ${name}:`, error);
          setIsConnected(false);
          scheduleReconnect();
        });

        // Start the listener
        canListener.current.start();

      } catch (error) {
        console.error(`TankHeaterControl: Failed to setup CAN listener for ${name}:`, error);
        scheduleReconnect();
      }
    };

    setupCANListener();

    // Cleanup on unmount
    return () => {
      if (canListener.current) {
        canListener.current.stop();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [name, tankType]);

  const scheduleReconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    reconnectTimeout.current = setTimeout(() => {
      console.log(`TankHeaterControl: Attempting to reconnect CAN listener for ${name}`);
      if (canListener.current) {
        canListener.current.start();
      }
    }, 5000); // Retry every 5 seconds
  };

  const handleTankStatusMessage = (message) => {
    try {
      // Parse tank status from CAN message
      // From the CAN traffic, we see messages like:
      // {"dgn": "1FFB7", "name": "TANK_STATUS", "instance": 0, "instance definition": "fresh water", "relative level": 1, "resolution": 4, ...}
      
      const tankInstance = message.instance;
      const instanceDefinition = message["instance definition"];
      const relativeLevel = message["relative level"];
      const resolution = message.resolution || 4;
      
      // Map tank instances to our tank types
      let matchesTankType = false;
      
      if (tankType === "fresh" && (tankInstance === 0 || instanceDefinition === "fresh water")) {
        matchesTankType = true;
      } else if (tankType === "gray" && (tankInstance === 2 || instanceDefinition === "gray water")) {
        matchesTankType = true;
      } else if (tankType === "black" && (tankInstance === 1 || instanceDefinition === "black waste")) {
        matchesTankType = true;
      }
      
      if (matchesTankType && relativeLevel !== undefined) {
        // Calculate percentage based on relative level and resolution
        // Resolution 4 means levels are reported in 25% increments (0, 1, 2, 3, 4)
        const maxLevel = Math.pow(2, resolution) - 1;
        const newPercentage = Math.round((relativeLevel / maxLevel) * 100);
        
        console.log(`TankHeaterControl: ${name} tank level update: ${newPercentage}% (raw: ${relativeLevel}/${maxLevel})`);
        
        setPercentage(newPercentage);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error(`TankHeaterControl: Error parsing tank status for ${name}:`, error);
    }
  };

  // Handle toggle for water heater
  const handleToggle = async (newIsOn) => {
    setIsLoading(true);
    
    try {
      // Use the water_heater_toggle command from server.js
      const result = await RVControlService.executeCommand('water_heater_toggle');
      
      if (result.status === 'success') {
        setIsOn(newIsOn);
        console.log(`${name} heater toggled to: ${newIsOn ? 'ON' : 'OFF'}`);
      } else {
        console.error(`Failed to toggle ${name} heater:`, result.error);
      }
    } catch (error) {
      console.error(`Error toggling ${name} heater:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual slider changes (for testing/calibration)
  const handleSliderChange = (value) => {
    console.log(`TankHeaterControl: Manual adjustment for ${name}: ${value}%`);
    setPercentage(value);
  };

  // Get connection status indicator
  const getConnectionStatus = () => {
    if (isConnected) {
      return { color: '#10B981', text: '●' }; // Green dot
    } else {
      return { color: '#EF4444', text: '●' }; // Red dot
    }
  };

  const connectionStatus = getConnectionStatus();

  // This preserves the original UI while adding real-time data
  if (isTablet) {
    return (
      <View className="flex-row justify-center items-center py-4">
        <View className="items-center" style={{ minHeight: 220 }}> {/* Fixed height container */}
          <View className="flex-row items-center mb-2">
            <Text className="text-white text-lg font-semibold">{name}</Text>
            <Text style={{ color: connectionStatus.color, marginLeft: 8, fontSize: 16 }}>
              {connectionStatus.text}
            </Text>
          </View>
          
          <VerticalSlider
            value={percentage}
            disabled={false} // Allow manual adjustment for testing
            min={0}
            max={100}
            width={60}
            height={120}
            step={1}
            borderRadius={5}
            minimumTrackTintColor={trackColor.minimum}
            maximumTrackTintColor={trackColor.maximum}
            onChange={handleSliderChange}
          />
          
          <Text className="text-white text-md font-semibold mt-2">{percentage}%</Text>
          
          {lastUpdate && (
            <Text className="text-gray-400 text-xs mt-1">
              {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
          
          {/* Water heater toggle for fresh water tank - with consistent spacing */}
          <View className="mt-4" style={{ minHeight: 60 }}> {/* Fixed height for heater section */}
            {tankType === "fresh" ? (
              <>
                <Text className="text-white text-sm mb-2">Water Heater</Text>
                <ToggleSwitch 
                  isOn={isOn} 
                  setIsOn={handleToggle} 
                  disabled={isLoading}
                />
              </>
            ) : (
              // Empty space to maintain consistent height
              <View style={{ height: 60 }} />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row justify-between py-2">
      <View className="items-center" style={{ minHeight: 140 }}> {/* Fixed height container */}
        <Text className="text-white">{percentage}%</Text>
        <VerticalSlider
          value={percentage}
          disabled={false} // Allow manual adjustment for testing
          min={0}
          max={100}
          width={50}
          height={70}
          step={1}
          borderRadius={5}
          minimumTrackTintColor={trackColor.minimum}
          maximumTrackTintColor={trackColor.maximum}
          onChange={handleSliderChange}
        />
        {lastUpdate && (
          <Text className="text-gray-400 text-xs mt-1">
            {lastUpdate.toLocaleTimeString()}
          </Text>
        )}
      </View>
      
      <View className="flex-row mt-10" style={{ alignItems: 'flex-start' }}> {/* Align to top */}
        <View className="flex-row items-center">
          <Text className="text-white text-lg mr-2">{name}</Text>
          <Text style={{ color: connectionStatus.color, fontSize: 14 }}>
            {connectionStatus.text}
          </Text>
        </View>
        
        {/* Water heater toggle for fresh water tank - with consistent spacing */}
        <View className="ml-10" style={{ minHeight: 40, justifyContent: 'flex-start' }}> {/* Fixed positioning */}
          {tankType === "fresh" ? (
            <View className="mt-1">
              <ToggleSwitch 
                isOn={isOn} 
                setIsOn={handleToggle} 
                disabled={isLoading}
              />
            </View>
          ) : (
            // Empty space to maintain consistent layout
            <View style={{ width: 50, height: 40 }} />
          )}
        </View>
      </View>
    </View>
  );
};

export default TankHeaterControl;