import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import RVControls, { RVControlService } from '../API/rvAPI';

const LightControl = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState('Checking...');
  const [kitchenLightOn, setKitchenLightOn] = useState(false);
  const [bedroomLightOn, setBedroomLightOn] = useState(false);
  const [bathroomLightOn, setBathroomLightOn] = useState(false);

  // Check system status on component mount
  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      setIsLoading(true);
      const status = await RVControlService.getStatus();
      setSystemStatus(status.message);
    } catch (error) {
      setSystemStatus('Offline - Check Raspberry Pi connection');
      Alert.alert('Connection Error', 'Could not connect to the RV control system');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleKitchenLight = async () => {
    try {
      setIsLoading(true);
      if (kitchenLightOn) {
        await RVControls.turnOffKitchenLight();
        setKitchenLightOn(false);
      } else {
        await RVControls.turnOnKitchenLight();
        setKitchenLightOn(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle kitchen light');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBedroomLight = async () => {
    try {
      setIsLoading(true);
      if (bedroomLightOn) {
        await RVControls.turnOffBedroomLight();
        setBedroomLightOn(false);
      } else {
        await RVControls.turnOnBedroomLight();
        setBedroomLightOn(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle bedroom light');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBathroomLight = async () => {
    try {
      setIsLoading(true);
      if (bathroomLightOn) {
        await RVControls.turnOffBathroomLight();
        setBathroomLightOn(false);
      } else {
        await RVControls.turnOnBathroomLight();
        setBathroomLightOn(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle bathroom light');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lighting Controls</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>System Status:</Text>
        <Text style={[
          styles.statusValue, 
          { color: systemStatus.includes('Online') ? '#4CAF50' : '#FF6B6B' }
        ]}>
          {systemStatus}
        </Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={checkSystemStatus}
          disabled={isLoading}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <ActivityIndicator size="large" color="#FFB267" style={styles.loader} />
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            kitchenLightOn ? styles.controlButtonActive : styles.controlButtonInactive
          ]}
          onPress={handleToggleKitchenLight}
          disabled={isLoading}
        >
          <Text style={styles.controlButtonText}>
            Kitchen Light: {kitchenLightOn ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            bedroomLightOn ? styles.controlButtonActive : styles.controlButtonInactive
          ]}
          onPress={handleToggleBedroomLight}
          disabled={isLoading}
        >
          <Text style={styles.controlButtonText}>
            Bedroom Light: {bedroomLightOn ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            bathroomLightOn ? styles.controlButtonActive : styles.controlButtonInactive
          ]}
          onPress={handleToggleBathroomLight}
          disabled={isLoading}
        >
          <Text style={styles.controlButtonText}>
            Bathroom Light: {bathroomLightOn ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#211d1d',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
  },
  statusLabel: {
    color: 'white',
    fontSize: 16,
    marginRight: 10,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#FFB267',
    padding: 8,
    borderRadius: 5,
  },
  refreshButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  },
  controlsContainer: {
    marginTop: 10,
  },
  controlButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#FFB267',
  },
  controlButtonInactive: {
    backgroundColor: '#3C3D37',
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default LightControl;