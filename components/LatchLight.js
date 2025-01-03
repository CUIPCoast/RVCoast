import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ToggleSwitch from "../components/ToggleSwitch.jsx";
const LatchLight = ({ name }) => {
  const [isOn, setIsOn] = useState(false);

  const toggleLight = () => {
    setIsOn((prevState) => !prevState); // Properly toggle state
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      <ToggleSwitch isOn={isOn} setIsOn={setIsOn} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 18,
    color: '#FFF',
    width: 270, // Fixed width for alignment
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center', // Ensure the text is centered
  },
  on: {
    backgroundColor: '#FFA500', // Orange when on
  },
  off: {
    backgroundColor: '#3C3D37', // Gray when off
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold', // For better text visibility
  },
  onText: {
    color: '#000', // Black text when on
  },
  offText: {
    color: '#FFF', // White text when off
  },
});

export default LatchLight;
