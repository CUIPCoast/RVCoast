import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import useScreenSize from '../helper/useScreenSize.jsx';
import { Col, Row, Grid } from 'react-native-easy-grid';
import moment from 'moment';
import { FanService } from '../API/RVControlServices';
import { Feather as Icon } from '@expo/vector-icons';

const Vents = () => {
  const [isBathroomFanOn, setBathroomFanOn] = useState(false);
  const [isBayVentFanOn, setBayVentFanOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);

  const currentDate = moment().format('MMMM Do, YYYY');
  const DayOfTheWeek = moment().format('dddd');
  const isTablet = useScreenSize();

  const toggleBathroomFan = async () => {
    setIsLoading(true);
    try {
      const result = await FanService.toggleBathroomFan();
      if (result.success) {
        setBathroomFanOn(prev => !prev);
        setStatusMessage(`Bathroom fan ${!isBathroomFanOn ? 'turned on' : 'turned off'}`);
      } else {
        setStatusMessage('Failed to toggle bathroom fan');
      }
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      setIsLoading(false);
    }
  };

  const toggleBayVentFan = async () => {
    setIsLoading(true);
    try {
      const result = await FanService.toggleBayVentFan();
      if (result.success) {
        setBayVentFanOn(prev => !prev);
        setStatusMessage(`Bay vent fan ${!isBayVentFanOn ? 'turned on' : 'turned off'}`);
      } else {
        setStatusMessage('Failed to toggle bay vent fan');
      }
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadSavedFanStates = async () => {
      try {
        // TODO: load any saved states via AsyncStorage
      } catch (error) {
        console.error('Error loading saved fan states:', error);
      }
    };
    loadSavedFanStates();
  }, []);

  const renderControls = () => (
    <View style={styles.fanControlsContainer}>
      {/* Bay Vent Control */}
      <TouchableOpacity
        style={[
          styles.modernFanButton,
          isBayVentFanOn ? styles.fanButtonActive : styles.fanButtonInactive,
          isLoading && styles.disabledButton,
        ]}
        onPress={toggleBayVentFan}
        disabled={isLoading}
      >
        <View style={styles.fanIconContainer}>
          <View style={[styles.fanIconCircle, isBayVentFanOn ? styles.iconCircleActive : styles.iconCircleInactive]}>
            <Icon name="sun" size={24} color={isBayVentFanOn ? '#FFF' : '#888'} />
          </View>
        </View>
        <Text style={styles.fanButtonLabel}>Bay Vent</Text>
        <View style={[styles.statusIndicator, isBayVentFanOn ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusText}>{isBayVentFanOn ? 'ON' : 'OFF'}</Text>
        </View>
      </TouchableOpacity>

      {/* Bathroom Fan Control */}
      <TouchableOpacity
        style={[
          styles.modernFanButton,
          isBathroomFanOn ? styles.fanButtonActive : styles.fanButtonInactive,
          isLoading && styles.disabledButton,
        ]}
        onPress={toggleBathroomFan}
        disabled={isLoading}
      >
        <View style={styles.fanIconContainer}>
          <View style={[styles.fanIconCircle, isBathroomFanOn ? styles.iconCircleActive : styles.iconCircleInactive]}>
            <Icon name="wind" size={24} color={isBathroomFanOn ? '#FFF' : '#888'} />
          </View>
        </View>
        <Text style={styles.fanButtonLabel}>Bath Fan</Text>
        <View style={[styles.statusIndicator, isBathroomFanOn ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusText}>{isBathroomFanOn ? 'ON' : 'OFF'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (isTablet) {
    return (
      <Grid style={styles.container}>
        <Row size={10}>
                        <Row className="bg-black" size={9}>
                            <Col className="m-1 ml-3">
                                <Text className="text-3xl text-white">{DayOfTheWeek}</Text>
                                <Text className="text-lg text-white">{currentDate}</Text>
                            </Col>
                        </Row>
                        <Row
                            className="bg-black"
                            size={1}
                        >
                            <View className="pt-3 pl-3">
                            <Image
                                source={require("../assets/images/icon.png")}
                                style={{
                                    width: 70,
                                    height: 45,
                                    right: 0,
                                    paddingTop: 10,
                                    backgroundColor: "white"
                                }}
                            />
                            </View>
                        </Row>
                    </Row>

        {showStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        <Row size={70} style={styles.centered}>
          <Col style={styles.centered}>
            <Text style={[styles.headerText, { marginBottom: 20 }]}>Fan Controls</Text>
            {renderControls()}
          </Col>
        </Row>
      </Grid>
    );
  }

  // Mobile Layout
  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Fan Controls</Text>
      {showStatus && (
        <View style={styles.mobileStatusContainer}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}
      {renderControls()}
      {isLoading && <ActivityIndicator size="large" color="#FF8200" style={styles.loadingIndicator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
  },
  logo: {
    width: 70,
    height: 45,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fanControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  modernFanButton: {
    width: 140,
    height: 160,
    borderRadius: 16,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginHorizontal: 10,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
  },
  fanButtonActive: {
    backgroundColor: '#27303F',
    borderColor: '#4F7BFA',
  },
  fanButtonInactive: {
    backgroundColor: '#1E242E',
    borderColor: '#323845',
  },
  disabledButton: {
    opacity: 0.6,
  },
  fanIconContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  fanIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleActive: {
    backgroundColor: '#4F7BFA',
  },
  iconCircleInactive: {
    backgroundColor: '#2D333F',
    borderWidth: 1,
    borderColor: '#3D4452',
  },
  fanButtonLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',

  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 46,
    alignItems: 'center',
  },
  statusActive: {
    backgroundColor: '#4F7BFA',
  },
  statusInactive: {
    backgroundColor: '#323845',
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusContainer: {
    position: 'absolute',
    top: '40%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'center',
    zIndex: 1000,
  },
  mobileStatusContainer: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'center',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
});

export default Vents;
