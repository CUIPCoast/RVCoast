import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Slider } from 'react-native-elements';
import useScreenSize from "../helper/useScreenSize.jsx";


const MainLight = ({
  name,
  min = 0,
  max = 100,
  value = min,
  onValueChange = () => {},
}) => {
  const isTablet = useScreenSize(); 
  if (isTablet) {
    return (
      
      <View style={styles.tabletContainer}>
        <Text style={styles.tabletName}>{name}</Text>
        <Slider
        value={value}
        onValueChange={onValueChange}
        minimumValue={min}
        maximumValue={max}
        step={1} // Ensures whole number values
        minimumTrackTintColor="#FFB267"
        thumbStyle={styles.customThumb}
        trackStyle={styles.trackStyle}
        containerStyle={styles.sliderContainer}
        accessibilityLabel={`${name} slider`}
        accessibilityValue={{ min, max, now: value }}
      />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      <Slider
        value={value}
        onValueChange={onValueChange}
        minimumValue={min}
        maximumValue={max}
        step={1} // Ensures whole number values
        minimumTrackTintColor="#FFB267"
        thumbStyle={styles.customThumb}
        trackStyle={styles.trackStyle}
        containerStyle={styles.sliderContainer}
        accessibilityLabel={`${name} slider`}
        accessibilityValue={{ min, max, now: value }}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  tabletContainer: {
    marginVertical: 10,
    paddingHorizontal: 32,
  },
  tabletName: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 5,
    alignSelf: 'flex-start', // Ensures the text aligns to the left
    marginLeft: -30, // Explicitly set to ensure no unintended margin
    paddingLeft: 0, // Ensures no additional padding on the left
  },
  
  tabletSlider:{
    width: '100%',
  },
  container: {

    marginVertical: 10,
    paddingHorizontal: 32,

  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFF',
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  sliderContainer: {
    width: '100%', // Ensures it takes full width
    marginTop: 10, // Adjust this to control overall vertical alignment
    height: 6,
    borderRadius: 6,

  },
  trackStyle: {
    height:3,
    borderRadius: 6,
    marginBottom: 10,
    top: 15, // Adjust this value to control the vertical alignment
    shadowColor: '#FFB267',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
},

  customThumb: {
    paddingTop:20,
    width: 28, // Outer circle diameter
    height: 28,
    borderRadius: 14, // Half of width/height for rounded shape
    backgroundColor: '#F8F8F8', // Main orange color
    borderColor: '#6B6869', // Inner circle border color
    borderWidth: 4, // Thickness of the border to simulate an inner circle
  },
});

export default MainLight;