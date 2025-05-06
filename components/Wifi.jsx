import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  Alert,
} from 'react-native';

const Wifi = () => {
  const [wifiList, setWifiList] = useState([
    { id: '1', name: 'Home Wi-Fi', connected: false },
    { id: '2', name: 'Coffee Shop Wi-Fi', connected: false },
    { id: '3', name: 'Office Network', connected: false },
    { id: '4', name: 'Guest Wi-Fi', connected: false },
  ]);
  const [selectedWifi, setSelectedWifi] = useState(null);
  const [password, setPassword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const handleWifiSelection = (wifi) => {
    setSelectedWifi(wifi);
    setPassword('');
    setModalVisible(true);
  };

  const connectToWifi = () => {
    if (password.trim() === '') {
      Alert.alert('Error', 'Password cannot be empty');
      return;
    }

    setWifiList((prevList) =>
      prevList.map((wifi) =>
        wifi.id === selectedWifi.id
          ? { ...wifi, connected: true }
          : { ...wifi, connected: false }
      )
    );
    setModalVisible(false);
    Alert.alert('Connected', `You are now connected to ${selectedWifi.name}`);
  };

  const renderWifiItem = ({ item }) => (
    <TouchableOpacity
      style={styles.wifiItem}
      onPress={() => handleWifiSelection(item)}
    >
      <Text style={styles.wifiName}>{item.name}</Text>
      <Text style={styles.connectionStatus}>
        {item.connected ? 'Connected' : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose a Wi-Fi Network</Text>
      <FlatList
        data={wifiList}
        keyExtractor={(item) => item.id}
        renderItem={renderWifiItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              Connect to {selectedWifi?.name}
            </Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter Wi-Fi password"
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setModalVisible(false)}
                color="#888"
              />
              <Button title="Connect" onPress={connectToWifi} color="#007AFF" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  wifiItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  wifiName: {
    fontSize: 16,
    color: '#333',
  },
  connectionStatus: {
    fontSize: 14,
    color: '#007AFF',
  },
  separator: {
    height: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '50%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default Wifi;
