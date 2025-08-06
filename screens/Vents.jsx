import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, ActivityIndicator } from 'react-native';
import useScreenSize from '../helper/useScreenSize.jsx';
import { Col, Row, Grid } from 'react-native-easy-grid';
import moment from 'moment';
import { FanService } from '../API/RVControlServices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rvStateManager from '../API/RVStateManager/RVStateManager';

// Import our new scalable button
import FanButton from '../components/FanButton';

const Vents = () => {
  const [isBathroomFanOn, setBathroomFanOn] = useState(false);
  const [isBayVentFanOn, setBayVentFanOn]     = useState(false);
  const [isLoading, setIsLoading]              = useState(false);
  const [statusMessage, setStatusMessage]      = useState('');
  const [showStatus, setShowStatus]            = useState(false);

  // Use refs to track previous values and prevent unnecessary effects
  const prevBathroomFanRef = useRef(isBathroomFanOn);
  const prevBayVentFanRef = useRef(isBayVentFanOn);
  const isInitializedRef = useRef(false);

  const currentDate   = moment().format('MMMM Do, YYYY');
  const dayOfTheWeek  = moment().format('dddd');
  const isTablet      = useScreenSize();

  // Initialize from AsyncStorage once on mount
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        const savedBathroomFan = await AsyncStorage.getItem('bathroomFanState');
        const savedBayVentFan  = await AsyncStorage.getItem('bayVentFanState');
        
        if (savedBathroomFan != null) {
          const state = JSON.parse(savedBathroomFan);
          setBathroomFanOn(state);
          rvStateManager.updateState('fans', { bathroomFan: { isOn: state, lastUpdated: new Date().toISOString() } });
        }
        if (savedBayVentFan != null) {
          const state = JSON.parse(savedBayVentFan);
          setBayVentFanOn(state);
          rvStateManager.updateState('fans', { bayVentFan: { isOn: state, lastUpdated: new Date().toISOString() } });
        }
        isInitializedRef.current = true;
      } catch (e) { 
        console.error('Error initializing fan state:', e); 
      }
    };

    initializeFromStorage();
  }, []); // Empty dependency array - only run on mount

  // Subscribe to external state changes once on mount
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges(newState => {
      if (!isInitializedRef.current) return; // Don't process until initialized
      
      if (newState.fans) {
        // Only update if the values actually changed and it's not from our own update
        if (newState.fans.bathroomFan?.isOn !== undefined && 
            newState.fans.bathroomFan.isOn !== prevBathroomFanRef.current) {
          setBathroomFanOn(newState.fans.bathroomFan.isOn);
          prevBathroomFanRef.current = newState.fans.bathroomFan.isOn;
          setStatusMessage(`Bathroom fan ${newState.fans.bathroomFan.isOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
        
        if (newState.fans.bayVentFan?.isOn !== undefined && 
            newState.fans.bayVentFan.isOn !== prevBayVentFanRef.current) {
          setBayVentFanOn(newState.fans.bayVentFan.isOn);
          prevBayVentFanRef.current = newState.fans.bayVentFan.isOn;
          setStatusMessage(`Bay vent fan ${newState.fans.bayVentFan.isOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    });

    return unsubscribe;
  }, []); // Empty dependency array - only subscribe once on mount

  // Persist state changes to AsyncStorage
  useEffect(() => {
    if (!isInitializedRef.current) return; // Don't persist until initialized

    const persistState = async () => {
      try {
        await AsyncStorage.multiSet([
          ['bathroomFanState', JSON.stringify(isBathroomFanOn)],
          ['bayVentFanState', JSON.stringify(isBayVentFanOn)],
        ]);
      } catch (error) {
        console.error('Error persisting fan state:', error);
      }
    };

    persistState();
    
    // Update refs to track current values
    prevBathroomFanRef.current = isBathroomFanOn;
    prevBayVentFanRef.current = isBayVentFanOn;
  }, [isBathroomFanOn, isBayVentFanOn]);

  const toggleFan = async (which) => {
    if (isLoading) return; // Prevent multiple concurrent requests
    
    setIsLoading(true);
    const newState = which === 'bath' ? !isBathroomFanOn : !isBayVentFanOn;
    const service   = which === 'bath' ? FanService.toggleBathroomFan : FanService.toggleBayVentFan;
    const setter    = which === 'bath' ? setBathroomFanOn : setBayVentFanOn;
    const fanKey = which === 'bath' ? 'bathroomFan' : 'bayVentFan';

    // Optimistic UI update
    setter(newState);
    
    // Update state manager
    rvStateManager.updateState('fans', { 
      [fanKey]: { 
        isOn: newState, 
        lastUpdated: new Date().toISOString() 
      } 
    });

    try {
      const res = await service();
      if (res.success) {
        setStatusMessage(`${which === 'bath' ? 'Bathroom' : 'Bay vent'} fan ${newState ? 'turned on' : 'turned off'}`);
      } else {
        throw new Error(res.error || 'Toggle failed');
      }
    } catch (e) {
      // Revert on error
      setter(!newState);
      rvStateManager.updateState('fans', { 
        [fanKey]: { 
          isOn: !newState, 
          lastUpdated: new Date().toISOString() 
        } 
      });
      setStatusMessage(`Error: ${e.message}`);
      console.error('Fan toggle error:', e);
    } finally {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      setIsLoading(false);
    }
  };

  const renderControls = () => (
    <View style={styles.fanControlsContainer}>
      <FanButton
        size={240}
        isOn={isBayVentFanOn}
        onPress={() => toggleFan('bay')}
        iconName="sun"
        label="Bay Vent"
        loading={isLoading}
      />
      <FanButton
        size={240}
        isOn={isBathroomFanOn}
        onPress={() => toggleFan('bath')}
        iconName="wind"
        label="Bath Fan"
        loading={isLoading}
      />
    </View>
  );

  if (isTablet) {
    return (
      <Grid style={styles.container}>
        <Row size={10}>
                <Row className="bg-black" size={9}>
                  <Col className="m-1 ml-3">
                    <Text className="text-3xl text-white">{dayOfTheWeek}</Text>
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
                        
                        backgroundColor: "white",
                      }}
                    />
                  </View>
                </Row>
              </Row>
        <Row size={70} style={styles.centered}>
          <Col style={styles.centered}>
            <Text style={[styles.headerText, { marginBottom: 20 }]}>Fan Controls</Text>
            {renderControls()}
          </Col>
        </Row>
      </Grid>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Fan Controls</Text>
      {showStatus && <View style={styles.mobileStatusContainer}><Text style={styles.statusText}>{statusMessage}</Text></View>}
      {renderControls()}
      {isLoading && <ActivityIndicator size="large" color="#FF8200" style={styles.loadingIndicator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerText: { color: '#FFF', fontSize: 24, fontWeight: '600' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  fanControlsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around',
    alignItems: 'center', 
    marginVertical: 20, 
    paddingHorizontal: 10,
    width: '50%',
  },
  mobileStatusContainer: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 25, paddingVertical: 8, borderRadius: 5, alignSelf: 'center', zIndex: 1000 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  loadingIndicator: { marginVertical: 20 },
});

export default Vents;