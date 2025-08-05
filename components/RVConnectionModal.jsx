import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';
import { useScreenSize } from '../helper';
import Ionicons from 'react-native-vector-icons/Ionicons';

const RVConnectionModal = ({ visible, onClose }) => {
  const [rvData, setRvData] = useState({
    rvId: '',
    rvName: '',
    rvModel: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { connectToRV, user } = useAuth();
  const isTablet = useScreenSize();

  const handleConnect = async () => {
    if (!rvData.rvId.trim() || !rvData.rvName.trim()) {
      Alert.alert('Error', 'Please fill in RV ID and Name');
      return;
    }

    setIsLoading(true);
    try {
      const result = await connectToRV(rvData);
      
      if (result.success) {
        Alert.alert('Success', 'Connected to RV successfully!');
        setRvData({ rvId: '', rvName: '', rvModel: '' });
        onClose();
      } else {
        Alert.alert('Connection Failed', result.error || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setRvData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, isTablet && styles.tabletModal]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, isTablet && styles.tabletTitle]}>
              Connect to RV
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.subtitle, isTablet && styles.tabletSubtitle]}>
              Enter your RV details to establish connection
            </Text>

            {/* RV ID Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="keypad-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isTablet && styles.tabletInput]}
                placeholder="RV ID (e.g., RV123456)"
                placeholderTextColor="#888"
                value={rvData.rvId}
                onChangeText={(value) => handleInputChange('rvId', value)}
                autoCapitalize="characters"
              />
            </View>

            {/* RV Name Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="home-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isTablet && styles.tabletInput]}
                placeholder="RV Name (e.g., My Coast RV)"
                placeholderTextColor="#888"
                value={rvData.rvName}
                onChangeText={(value) => handleInputChange('rvName', value)}
                autoCapitalize="words"
              />
            </View>

            {/* RV Model Input (Optional) */}
            <View style={styles.inputContainer}>
              <Ionicons name="car-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isTablet && styles.tabletInput]}
                placeholder="RV Model (Optional)"
                placeholderTextColor="#888"
                value={rvData.rvModel}
                onChangeText={(value) => handleInputChange('rvModel', value)}
                autoCapitalize="words"
              />
            </View>

            {/* Current Connection Status */}
            {user?.rvConnection && (
              <View style={styles.currentConnection}>
                <Text style={styles.connectionTitle}>Current Connection:</Text>
                <Text style={styles.connectionInfo}>
                  {user.rvConnection.rvName} ({user.rvConnection.rvId})
                </Text>
                <Text style={styles.connectionTime}>
                  Connected: {new Date(user.rvConnection.connectedAt).toLocaleDateString()}
                </Text>
              </View>
            )}

            {/* Connect Button */}
            <TouchableOpacity
              style={[styles.connectButton, isTablet && styles.tabletConnectButton]}
              onPress={handleConnect}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#66BB6A', '#4CAF50', '#388E3C']}
                style={styles.connectGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="link-outline" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={[styles.connectButtonText, isTablet && styles.tabletConnectButtonText]}>
                      {user?.rvConnection ? 'Update Connection' : 'Connect to RV'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Info Text */}
            <Text style={styles.infoText}>
              Your RV ID can be found on the control panel or in your RV documentation.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'rgba(40, 41, 43, 0.98)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  tabletModal: {
    maxWidth: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabletTitle: {
    fontSize: 26,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 25,
    textAlign: 'center',
  },
  tabletSubtitle: {
    fontSize: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  tabletInput: {
    height: 60,
    fontSize: 18,
  },
  currentConnection: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  connectionTitle: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  connectionInfo: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 3,
  },
  connectionTime: {
    color: '#888',
    fontSize: 12,
  },
  connectButton: {
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabletConnectButton: {
    marginTop: 20,
  },
  connectGradient: {
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabletConnectButtonText: {
    fontSize: 18,
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 16,
  },
});

export default RVConnectionModal;