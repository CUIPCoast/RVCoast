import React from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const Map = () => {
  return (
    <View className="bg-[#211d1d] px-5 py-5">
      <View className="rounded-lg overflow-hidden shadow-lg">
        <MapView
          className="w-full h-40"
          initialRegion={{
            latitude: 35.051034,   // change these coordinates
            longitude: -85.32180226,  // change these coordinates
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: 35.051034, longitude: -85.32180226 }}
            title="My Location"
            description="Here is my current location"
          />
        </MapView>
      </View>
    </View>
  );
};

export default Map;
