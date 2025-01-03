import React, { useState } from 'react';
import { View, TouchableWithoutFeedback, Animated, Text } from 'react-native';

const ToggleSwitch = ( { isOn, setIsOn } ) => {
  const translateX = new Animated.Value(isOn ? 18 : 0);

  const toggleSwitch = () => {
    setIsOn((prev) => !prev);
    Animated.timing(translateX, {
      toValue: isOn ? 0 : 18,
      duration: 200,
      useNativeDriver: true,
    }).start();

  };

  return (
    <TouchableWithoutFeedback onPress={toggleSwitch} >
      <View className={`w-10 h-5 rounded-full flex-row items-center p-1 ${
            isOn ? 'bg-orange-300' : 'bg-gray-300'
          }`} 
      >
        
        <Animated.View
          style={{
            transform: [{ translateX }],
          }}
          className={`w-4 h-4 rounded-full bg-white`}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ToggleSwitch;
