import React, { useState, useEffect } from 'react';
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

  const currentDate   = moment().format('MMMM Do, YYYY');
  const dayOfTheWeek  = moment().format('dddd');
  const isTablet      = useScreenSize();

  useEffect(() => {
    // initialize from AsyncStorage and sync to RV state
    (async () => {
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
      } catch (e) { console.error(e); }
    })();

    // subscribe
    const unsub = rvStateManager.subscribeToExternalChanges(newState => {
      if (newState.fans) {
        if (newState.fans.bathroomFan?.isOn !== isBathroomFanOn) {
          setBathroomFanOn(newState.fans.bathroomFan.isOn);
          setStatusMessage(`Bathroom fan ${newState.fans.bathroomFan.isOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
        if (newState.fans.bayVentFan?.isOn !== isBayVentFanOn) {
          setBayVentFanOn(newState.fans.bayVentFan.isOn);
          setStatusMessage(`Bay vent fan ${newState.fans.bayVentFan.isOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    });
    return unsub;
  }, [isBathroomFanOn, isBayVentFanOn]);

  useEffect(() => {
    // persist backwards-compatible
    AsyncStorage.multiSet([
      ['bathroomFanState', JSON.stringify(isBathroomFanOn)],
      ['bayVentFanState', JSON.stringify(isBayVentFanOn)],
    ]).catch(console.error);
  }, [isBathroomFanOn, isBayVentFanOn]);

  const toggleFan = async (which) => {
    setIsLoading(true);
    const newState = which === 'bath' ? !isBathroomFanOn : !isBayVentFanOn;
    const service   = which === 'bath' ? FanService.toggleBathroomFan : FanService.toggleBayVentFan;
    const setter    = which === 'bath' ? setBathroomFanOn : setBayVentFanOn;

    // optimistic UI + state manager
    rvStateManager.updateState('fans', { [`${which}roomFan`]: { isOn: newState, lastUpdated: new Date().toISOString() } });
    setter(newState);

    try {
      const res = await service();
      if (res.success) {
        setStatusMessage(`${which === 'bath' ? 'Bathroom' : 'Bay vent'} fan ${newState ? 'turned on' : 'turned off'}`);
      } else {
        throw new Error(res.error || 'toggle failed');
      }
    } catch (e) {
      // revert
      rvStateManager.updateState('fans', { [`${which}roomFan`]: { isOn: !newState, lastUpdated: new Date().toISOString() } });
      setter(!newState);
      setStatusMessage(`Error: ${e.message}`);
      console.error(e);
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
                        paddingTop: 8,
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
    justifyContent: 'space-around', // Changed from 'center' to 'space-around' for even spacing
    alignItems: 'center', 
    marginVertical: 20, 
    paddingHorizontal: 10,
    width: '50%', // Added to ensure full width utilization
  },
  mobileStatusContainer: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5, alignSelf: 'center', zIndex: 1000 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  loadingIndicator: { marginVertical: 20 },
});

export default Vents;