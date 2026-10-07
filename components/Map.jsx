import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import useScreenSize from "../helper/useScreenSize.jsx";
import { FontFamily } from "../GlobalStyles";

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

const DEFAULT_REGION = {
  latitude: 35.0456,
  longitude: -85.3097,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const ACCENT = '#FFB267';

// Haversine distance between two { latitude, longitude } points, in metres.
const distanceMeters = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

const toCoords = (loc) => ({
  latitude: loc.coords.latitude,
  longitude: loc.coords.longitude,
});

// Custom "you are here" marker in the app's accent colour.
const UserMarker = () => (
  <View style={styles.markerHalo}>
    <View style={styles.markerDot}>
      <Ionicons name="person" size={14} color="#1B1B1B" />
    </View>
  </View>
);

const Map = () => {
  const isTablet = useScreenSize();
  const mapRef = useRef(null);
  const watcherRef = useRef(null);
  const followRef = useRef(true);
  const [location, setLocation] = useState(null);
  // 'locating' | 'ready' | 'denied' | 'disabled' | 'error'
  const [status, setStatus] = useState('locating');
  // Android needs tracksViewChanges on for the first render so custom marker views draw.
  const [trackMarker, setTrackMarker] = useState(true);
  const [place, setPlace] = useState(null);
  const geocodedAtRef = useRef(null);

  const centerOn = useCallback((coords, duration = 600) => {
    if (!coords || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      duration
    );
  }, []);

  const startTracking = useCallback(async () => {
    setStatus('locating');
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        setStatus('disabled');
        return;
      }

      // Show a fast approximate fix first, then refine with live updates.
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        const coords = toCoords(lastKnown);
        setLocation(coords);
        setStatus('ready');
        centerOn(coords, 0);
      }

      watcherRef.current?.remove();
      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (loc) => {
          const coords = toCoords(loc);
          setLocation(coords);
          setStatus('ready');
          if (followRef.current) centerOn(coords);
        }
      );
    } catch (error) {
      console.warn('Unable to get location:', error);
      setStatus('error');
    }
  }, [centerOn]);

  useEffect(() => {
    startTracking();
    return () => {
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, [startTracking]);

  // Reverse-geocode into a readable place name; only re-run after moving ~250 m.
  useEffect(() => {
    if (!location) return;
    const last = geocodedAtRef.current;
    if (last && distanceMeters(last, location) < 250) return;
    geocodedAtRef.current = location;

    let cancelled = false;
    Location.reverseGeocodeAsync(location)
      .then(([place]) => {
        if (cancelled || !place) return;
        const city = place.city || place.subregion || place.district;
        const region = place.region || place.country;
        const street = [place.streetNumber, place.street].filter(Boolean).join(' ') || place.name;
        setPlace({
          title: [city, region].filter(Boolean).join(', ') || 'Current location',
          subtitle: street && street !== city ? street : null,
        });
      })
      .catch((error) => {
        console.warn('Reverse geocode failed:', error);
        geocodedAtRef.current = null;
      });
    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !location) return undefined;
    setTrackMarker(true);
    const timer = setTimeout(() => setTrackMarker(false), 500);
    return () => clearTimeout(timer);
  }, [location?.latitude, location?.longitude]);

  const handleRecenter = () => {
    followRef.current = true;
    if (location) {
      centerOn(location);
    } else {
      startTracking();
    }
  };

  const handleStatusPress = () => {
    if (status === 'denied') {
      Linking.openSettings();
    } else {
      startTracking();
    }
  };

  // ——— Tablet: keep the original compact framed map ———
  if (isTablet) {
    return (
      <View className="bg-[#211d1d] px-5 py-5">
        <View className="rounded-lg overflow-hidden shadow-lg">
          <MapView
            ref={mapRef}
            style={{ width: 180, height: 210, right: 15, bottom: 30 }}
            customMapStyle={darkMapStyle}
            initialRegion={DEFAULT_REGION}
            showsUserLocation={true}
            showsMyLocationButton={true}
            legalLabelInsets={{ bottom: -100, right: -100 }} // iOS only
          >
            {location && (
              <Marker coordinate={location} title="You are here" description="Your current location" />
            )}
          </MapView>
        </View>
      </View>
    );
  }

  // ——— Mobile: full-bleed map with live user marker ———
  const statusCopy = {
    locating: 'Finding your location…',
    denied: 'Location access is off. Tap to open Settings',
    disabled: 'Location services are off. Tap to retry',
    error: "Couldn't get your location. Tap to retry",
  };

  return (
    <View style={styles.mobileWrapper}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={darkMapStyle}
        userInterfaceStyle="dark"
        initialRegion={DEFAULT_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPanDrag={() => { followRef.current = false; }}
      >
        {location && (
          <Marker
            coordinate={location}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={Platform.OS === 'android' ? trackMarker : true}
            title={place?.title || 'You are here'}
            description={place?.subtitle || undefined}
          >
            <UserMarker />
          </Marker>
        )}
      </MapView>

      {status === 'ready' && (
        <View
          style={styles.placeCard}
          accessible
          accessibilityLabel={`Current location: ${place ? place.title : 'finding address'}`}
        >
          <View style={styles.placeIcon}>
            <Ionicons name="location" size={16} color="#1B1B1B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.placeCaption}>YOU ARE HERE</Text>
            <Text style={styles.placeTitle} numberOfLines={1}>
              {place ? place.title : 'Finding address…'}
            </Text>
            {place?.subtitle ? (
              <Text style={styles.placeSubtitle} numberOfLines={1}>{place.subtitle}</Text>
            ) : null}
          </View>
        </View>
      )}

      {status !== 'ready' && (
        <TouchableOpacity
          style={styles.statusChip}
          onPress={handleStatusPress}
          disabled={status === 'locating'}
          accessibilityRole="button"
          accessibilityLabel={statusCopy[status]}
        >
          {status === 'locating' ? (
            <ActivityIndicator size="small" color={ACCENT} />
          ) : (
            <Ionicons name="alert-circle" size={16} color={ACCENT} />
          )}
          <Text style={styles.statusText}>{statusCopy[status]}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.recenterButton}
        onPress={handleRecenter}
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
      >
        <Ionicons name="locate" size={20} color={ACCENT} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  mobileWrapper: {
    flex: 1,
    backgroundColor: '#212121',
  },
  markerHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 178, 103, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 68,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 27, 27, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 8,
    flexShrink: 1,
  },
  placeCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 27, 27, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
  },
  placeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  placeCaption: {
    color: ACCENT,
    fontSize: 11,
    fontFamily: FontFamily.latoBold,
    letterSpacing: 1,
  },
  placeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    marginTop: 1,
  },
  placeSubtitle: {
    color: '#C9C1C1',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    marginTop: 1,
  },
  recenterButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 27, 27, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Map;
