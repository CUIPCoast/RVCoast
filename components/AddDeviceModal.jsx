import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from "react-native";
import { Color, FontFamily } from "../GlobalStyles";
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';

/**
 * Modal for adding new devices to the RV system
 * Provides placeholder UI for Bluetooth devices and accessories
 *
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const AddDeviceModal = ({ isVisible, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('bluetooth');
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState([]);
  const [scanAnimation] = useState(new Animated.Value(0));

  // Placeholder device data
  const placeholderDevices = {
    bluetooth: [
      { id: 1, name: "RV Speaker Pro", type: "Audio", signal: "strong", paired: false },
      { id: 2, name: "Climate Control BT", type: "Climate", signal: "medium", paired: false },
      { id: 3, name: "Smart Thermostat", type: "Climate", signal: "strong", paired: false },
      { id: 4, name: "Backup Camera", type: "Camera", signal: "weak", paired: false },
    ],
    accessory: [
      { id: 5, name: "Smart Lock", type: "Security", compatible: true },
      { id: 6, name: "Solar Panel Controller", type: "Power", compatible: true },
      { id: 7, name: "Water Level Sensor", type: "Water", compatible: true },
      { id: 8, name: "Tire Pressure Monitor", type: "Safety", compatible: true },
    ],
    sensor: [
      { id: 9, name: "Temperature Sensor", type: "Climate", status: "available" },
      { id: 10, name: "Motion Detector", type: "Security", status: "available" },
      { id: 11, name: "CO2 Monitor", type: "Safety", status: "available" },
      { id: 12, name: "Humidity Sensor", type: "Climate", status: "available" },
    ],
  };

  // Device categories
  const categories = [
    { id: 'bluetooth', name: 'Bluetooth', icon: 'bluetooth' },
    { id: 'accessory', name: 'Accessories', icon: 'package' },
    { id: 'sensor', name: 'Sensors', icon: 'activity' },
  ];

  // Start scanning animation
  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnimation.setValue(0);
    }
  }, [isScanning]);

  // Handle scanning
  const handleScan = () => {
    setIsScanning(true);
    setFoundDevices([]);

    // Simulate finding devices over time
    setTimeout(() => {
      setFoundDevices([placeholderDevices[selectedCategory][0]]);
    }, 1000);

    setTimeout(() => {
      setFoundDevices([
        placeholderDevices[selectedCategory][0],
        placeholderDevices[selectedCategory][1],
      ]);
    }, 2000);

    setTimeout(() => {
      setFoundDevices(placeholderDevices[selectedCategory]);
      setIsScanning(false);
    }, 3500);
  };

  // Handle device connection (placeholder)
  const handleConnectDevice = (device) => {
    alert(`Connecting to ${device.name}...\n\nThis is a placeholder UI. Device connection functionality will be implemented based on your specific hardware requirements.`);
  };

  // Get signal strength color
  const getSignalColor = (signal) => {
    switch (signal) {
      case 'strong': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'weak': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Render device item based on category
  const renderDeviceItem = (device) => {
    const isBluetoothDevice = selectedCategory === 'bluetooth';
    const isAccessory = selectedCategory === 'accessory';
    const isSensor = selectedCategory === 'sensor';

    return (
      <TouchableOpacity
        key={device.id}
        style={styles.deviceItem}
        onPress={() => handleConnectDevice(device)}
        activeOpacity={0.7}
      >
        <View style={styles.deviceInfo}>
          <View style={styles.deviceIconContainer}>
            {isBluetoothDevice && (
              <Ionicons name="bluetooth" size={24} color="#3b82f6" />
            )}
            {isAccessory && (
              <Feather name="package" size={24} color="#8b5cf6" />
            )}
            {isSensor && (
              <Feather name="activity" size={24} color="#10b981" />
            )}
          </View>

          <View style={styles.deviceDetails}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceType}>{device.type}</Text>
          </View>
        </View>

        <View style={styles.deviceStatus}>
          {isBluetoothDevice && device.signal && (
            <View style={styles.signalContainer}>
              <View style={[styles.signalDot, { backgroundColor: getSignalColor(device.signal) }]} />
              <Text style={[styles.signalText, { color: getSignalColor(device.signal) }]}>
                {device.signal}
              </Text>
            </View>
          )}

          {isAccessory && device.compatible && (
            <View style={styles.compatibleBadge}>
              <Text style={styles.compatibleText}>Compatible</Text>
            </View>
          )}

          {isSensor && device.status && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Available</Text>
            </View>
          )}

          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
        </View>
      </TouchableOpacity>
    );
  };

  const scanOpacity = scanAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Add New Device</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Category Selection */}
          <View style={styles.categoryContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.activeCategoryButton
                ]}
                onPress={() => {
                  setSelectedCategory(category.id);
                  setFoundDevices([]);
                  setIsScanning(false);
                }}
              >
                <Feather
                  name={category.icon}
                  size={20}
                  color={selectedCategory === category.id ? '#1a1a1a' : 'rgba(255,255,255,0.6)'}
                />
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.activeCategoryText
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scan Button */}
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanningButton]}
            onPress={handleScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <Animated.View style={{ opacity: scanOpacity }}>
                <ActivityIndicator size="small" color="#1a1a1a" />
              </Animated.View>
            ) : (
              <Feather name="search" size={20} color="#1a1a1a" />
            )}
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning...' : `Scan for ${categories.find(c => c.id === selectedCategory)?.name}`}
            </Text>
          </TouchableOpacity>

          {/* Found Devices List */}
          <View style={styles.devicesSection}>
            <Text style={styles.sectionTitle}>
              {foundDevices.length > 0
                ? `Found ${foundDevices.length} device${foundDevices.length !== 1 ? 's' : ''}`
                : isScanning
                  ? 'Searching for devices...'
                  : 'No devices found'}
            </Text>

            <ScrollView
              style={styles.devicesList}
              showsVerticalScrollIndicator={false}
            >
              {foundDevices.length > 0 ? (
                foundDevices.map(renderDeviceItem)
              ) : !isScanning && (
                <View style={styles.emptyState}>
                  <Feather name="inbox" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyStateText}>
                    Tap "Scan" to search for nearby devices
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <MaterialIcons name="info-outline" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.infoText}>
              This is a placeholder UI. Device functionality will be implemented based on your hardware.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontFamily: FontFamily.latoBold,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  activeCategoryButton: {
    backgroundColor: '#FFB267',
    borderColor: '#FFD4A8',
  },
  categoryText: {
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  activeCategoryText: {
    color: '#1a1a1a',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB267',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 10,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanningButton: {
    opacity: 0.8,
  },
  scanButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  devicesSection: {
    flex: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  devicesList: {
    flex: 1,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  deviceType: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.1,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  signalText: {
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  compatibleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  compatibleText: {
    fontSize: 11,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: '#a78bfa',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusText: {
    fontSize: 11,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: '#6EE7B7',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 16,
    textAlign: 'center',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
});

export default AddDeviceModal;
