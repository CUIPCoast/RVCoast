// ModalComponent.js
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Settings from '../screens/Settings';
import Devices from '../screens/Devices';
import Home from '../screens/Home';
import GroupComponent from './GroupComponent';
import Wifi from './Wifi';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ModalComponent = ({ nameComponent }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const isWifi = nameComponent === 'Wifi';

  const renderLogo = (name) => {
    switch (name) {
      case 'Settings': return <Ionicons name="settings-outline" size={32} color="#FFF" />;
      case 'Home':     return <Ionicons name="home-outline"      size={32} color="#FFF" />;
      case 'Devices':  return <Ionicons name="phone-portrait-outline" size={32} color="#FFF" />;
      case 'Wifi':     return <Ionicons name="wifi-outline"      size={192} color="#FFF" />;
      default:         return <Text>?</Text>;
    }
  };

  const renderContent = (name) => {
    switch (name) {
      case 'Settings': return <Settings />;
      case 'Home':     return <Home />;
      case 'Devices':  return <Devices />;
      case 'Wifi':     return <Wifi />;
      default:         return <Text>Screen not found!</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* the icon you tap */}
      <Pressable onPress={() => setModalVisible(true)}>
        {renderLogo(nameComponent)}
      </Pressable>

      <Modal
        animationType="slide"
        transparent={!isWifi}      // if full-screen, let it be opaque
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          Alert.alert('Modal has been closed.');
        }}
      >
        {isWifi ? (
          // full screen wrapper
          <SafeAreaView style={styles.fullscreen}>
            <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            {renderContent(nameComponent)}
          </SafeAreaView>
        ) : (
          // your old centered box for everything else
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
              {renderContent(nameComponent)}
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
  },
  centeredView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ModalComponent;
