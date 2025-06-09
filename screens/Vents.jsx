import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import useScreenSize from '../helper/useScreenSize.jsx';
import { Col, Row, Grid } from 'react-native-easy-grid';
import moment from 'moment';
import { FanService } from '../API/RVControlServices';
import { Feather as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import RV State Management
import rvStateManager from '../API/RVStateManager/RVStateManager';

const Vents = () => {
  // Fan states - these will be managed by RV state manager
  const [isBathroomFanOn, setBathroomFanOn] = useState(false);
  const [isBayVentFanOn, setBayVentFanOn] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);

  const currentDate = moment().format('MMMM Do, YYYY');
  const DayOfTheWeek = moment().format('dddd');
  const isTablet = useScreenSize();

  // Initialize fan states from RV state manager
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Get current fan states from RV state manager
        // Note: We could create a dedicated fan category in RV state manager
        // For now, we'll use a general approach and fall back to AsyncStorage
        
        // Try to get from AsyncStorage first and sync to RV state manager
        const savedBathroomFan = await AsyncStorage.getItem('bathroomFanState');
        const savedBayVentFan = await AsyncStorage.getItem('bayVentFanState');
        
        if (savedBathroomFan !== null) {
          const fanState = JSON.parse(savedBathroomFan);
          setBathroomFanOn(fanState);
          // Update RV state manager with saved state
          rvStateManager.updateState('fans', { 
            bathroomFan: { isOn: fanState, lastUpdated: new Date().toISOString() }
          });
        }
        
        if (savedBayVentFan !== null) {
          const fanState = JSON.parse(savedBayVentFan);
          setBayVentFanOn(fanState);
          // Update RV state manager with saved state
          rvStateManager.updateState('fans', { 
            bayVentFan: { isOn: fanState, lastUpdated: new Date().toISOString() }
          });
        }
        
      } catch (error) {
        console.error('Error initializing Vents state:', error);
      }
    };
    
    initializeState();
  }, []);

  // Subscribe to external state changes from RV state manager
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
      if (newState.fans) {
        // Update fan states when external changes occur
        if (newState.fans.bathroomFan && newState.fans.bathroomFan.isOn !== isBathroomFanOn) {
          setBathroomFanOn(newState.fans.bathroomFan.isOn);
          setStatusMessage(`Bathroom fan ${newState.fans.bathroomFan.isOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
        
        if (newState.fans.bayVentFan && newState.fans.bayVentFan.isOn !== isBayVentFanOn) {
          setBayVentFanOn(newState.fans.bayVentFan.isOn);
          setStatusMessage(`Bay vent fan ${newState.fans.bayVentFan.isOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    });
    
    return unsubscribe;
  }, [isBathroomFanOn, isBayVentFanOn]);

  // Save fan states to AsyncStorage when they change (backwards compatibility)
  useEffect(() => {
    const saveFanStates = async () => {
      try {
        await AsyncStorage.setItem('bathroomFanState', JSON.stringify(isBathroomFanOn));
        await AsyncStorage.setItem('bayVentFanState', JSON.stringify(isBayVentFanOn));
      } catch (error) {
        console.error('Error saving fan states:', error);
      }
    };
    
    saveFanStates();
  }, [isBathroomFanOn, isBayVentFanOn]);

  // Handle bathroom fan toggle with RV state management
  const toggleBathroomFan = async () => {
    setIsLoading(true);
    const newState = !isBathroomFanOn;
    
    try {
      // Update RV state first for immediate UI feedback
      rvStateManager.updateState('fans', {
        bathroomFan: { 
          isOn: newState, 
          lastUpdated: new Date().toISOString() 
        }
      });
      setBathroomFanOn(newState);
      
      const result = await FanService.toggleBathroomFan();
      if (result.success) {
        // Show success status
        setStatusMessage(`Bathroom fan ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        // Revert state on error
        rvStateManager.updateState('fans', {
          bathroomFan: { 
            isOn: !newState, 
            lastUpdated: new Date().toISOString() 
          }
        });
        setBathroomFanOn(!newState);
        
        console.error('Failed to toggle bathroom fan:', result.error);
        setStatusMessage('Failed to toggle bathroom fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      // Revert state on error
      rvStateManager.updateState('fans', {
        bathroomFan: { 
          isOn: !newState, 
          lastUpdated: new Date().toISOString() 
        }
      });
      setBathroomFanOn(!newState);
      
      console.error('Error toggling bathroom fan:', error);
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bay vent fan toggle with RV state management
  const toggleBayVentFan = async () => {
    setIsLoading(true);
    const newState = !isBayVentFanOn;
    
    try {
      // Update RV state first for immediate UI feedback
      rvStateManager.updateState('fans', {
        bayVentFan: { 
          isOn: newState, 
          lastUpdated: new Date().toISOString() 
        }
      });
      setBayVentFanOn(newState);
      
      const result = await FanService.toggleBayVentFan();
      if (result.success) {
        // Show success status
        setStatusMessage(`Bay vent fan ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        // Revert state on error
        rvStateManager.updateState('fans', {
          bayVentFan: { 
            isOn: !newState, 
            lastUpdated: new Date().toISOString() 
          }
        });
        setBayVentFanOn(!newState);
        
        console.error('Failed to toggle bay vent fan:', result.error);
        setStatusMessage('Failed to toggle bay vent fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      // Revert state on error
      rvStateManager.updateState('fans', {
        bayVentFan: { 
          isOn: !newState, 
          lastUpdated: new Date().toISOString() 
        }
      });
      setBayVentFanOn(!newState);
      
      console.error('Error toggling bay vent fan:', error);
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

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
          <Row className="bg-black" size={1}>
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

        {/* Status message */}
        {showStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Processing command...</Text>
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
      
      {/* Status message */}
      {showStatus && (
        <View style={styles.mobileStatusContainer}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}
      
      {renderControls()}
      
      {/* Loading indicator */}
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
    zIndex: 1000,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 10,
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
});

export default Vents;