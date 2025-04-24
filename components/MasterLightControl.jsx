import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

const MasterLightControl = ({ isOn, onToggleOn, onToggleOff, isLoading }) => {
  return (
    <View style={styles.masterLightContainer}>
      <View style={styles.masterLightContent}>
        <View style={styles.masterLightLeft}>
          <Image
            source={require("../assets/lamplight.png")}
            style={styles.masterLightIcon}
          />
          <Text style={styles.masterLightText}>Light Master</Text>
        </View>
        
        <View style={styles.masterLightRight}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFB267" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* ON Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: isOn ? '#FFB267' : '#444',
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  borderTopLeftRadius: 20,
                  borderBottomLeftRadius: 20,
                  marginRight: 1,
                }}
                onPress={onToggleOn}
                disabled={isLoading || isOn}
              >
                <Text style={{ color: isOn ? '#000' : '#FFF' }}>ON</Text>
              </TouchableOpacity>
              
              {/* OFF Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: !isOn ? '#FFB267' : '#444',
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  borderTopRightRadius: 20,
                  borderBottomRightRadius: 20,
                }}
                onPress={onToggleOff}
                disabled={isLoading || !isOn}
              >
                <Text style={{ color: !isOn ? '#000' : '#FFF' }}>OFF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  masterLightContainer: {
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    padding: 15,
  },
  masterLightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masterLightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterLightIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  masterLightText: {
    color: 'white',
    fontSize: 16,
  },
  masterLightRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default MasterLightControl;