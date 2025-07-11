import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import useScreenSize from "../helper/useScreenSize.jsx";

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#383838' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#424242' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
];


const Map = () => {
  const isTablet = useScreenSize();
  const [location, setLocation] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  return (
    <View className="bg-[#211d1d] px-5 py-5">
      <View className="rounded-lg overflow-hidden shadow-lg">
      <MapView
  style={{
    width: isTablet ? 180 : 320,
    height: isTablet ? 210 : 180,
    right: isTablet ? 15: null,
    bottom: isTablet ? 30: null,
  }}
  customMapStyle={darkMapStyle}
  initialRegion={{
    latitude: 35.0456,
    longitude: -85.3097,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
  region={
    location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : undefined
  }
  showsUserLocation={true}
  showsMyLocationButton={true}
  legalLabelInsets={{ bottom: -100, right: -100 }} // iOS only
>

          {location && (
            <Marker
              coordinate={location}
              title="You are here"
              description="Your current location"
            />
          )}
        </MapView>
      </View>
    </View>
  );
};

export default Map;
