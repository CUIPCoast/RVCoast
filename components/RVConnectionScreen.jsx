// components/RVConnectionScreen.jsx - Complete RV connection interface
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Image,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useScreenSize } from '../helper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import rvConnectionService from '../Service/RVConnectionService';

const RVConnectionScreen = ({ onConnectionEstablished }) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [discoveredRVs, setDiscoveredRVs] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedRV, setSelectedRV] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualRVId, setManualRVId] = useState('');
  const [manualIP, setManualIP] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [permissionLevel, setPermissionLevel] = useState(null);
  
  const isTablet = useScreenSize();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeConnection();
    setupEventListeners();
    
    return () => {
      rvConnectionService.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    // Start pulse animation when discovering
    if (isDiscovering) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isDiscovering]);

  const initializeConnection = async () => {
    try {
      await rvConnectionService.initialize();
      const status = rvConnectionService.getConnectionStatus();
      
      if (status.isConnected) {
        // Already connected, proceed to main app
        setConnectionState('connected');
        setPermissionLevel(status.permissions);
        onConnectionEstablished(status);
      } else {
        // Start discovery
        startDiscovery();
      }
    } catch (error) {
      console.error('Error initializing connection:', error);
      setConnectionError('Failed to initialize connection service');
    }
  };

  const setupEventListeners = () => {
    rvConnectionService.on('stateChanged', handleStateChange);
    rvConnectionService.on('rvsDiscovered', handleRVsDiscovered);
    rvConnectionService.on('connected', handleConnectionSuccess);
    rvConnectionService.on('connectionError', handleConnectionError);
    rvConnectionService.on('discoveryError', handleDiscoveryError);
    rvConnectionService.on('networkLost', handleNetworkLost);
  };

  const handleStateChange = ({ current }) => {
    setConnectionState(current);
    if (current === 'connected') {
      setIsConnecting(false);
      setIsDiscovering(false);
    } else if (current === 'error') {
      setIsConnecting(false);
      setIsDiscovering(false);
    }
  };

  const handleRVsDiscovered = (rvs) => {
    setDiscoveredRVs(rvs);
    setIsDiscovering(false);
    
    if (rvs.length === 0) {
      setConnectionError('No RVs found on the network. Try manual connection or check your network.');
    } else {
      setConnectionError(null);
    }
  };

  const handleConnectionSuccess = (connectionInfo) => {
    setPermissionLevel(connectionInfo.permissions);
    setConnectionError(null);
    setIsConnecting(false);
    
    // Slight delay to show success state before transitioning
    setTimeout(() => {
      onConnectionEstablished(connectionInfo);
    }, 1000);
  };

  const handleConnectionError = (error) => {
    setConnectionError(error.message || 'Failed to connect to RV');
    setIsConnecting(false);
  };

  const handleDiscoveryError = (error) => {
    setConnectionError(error.message || 'Failed to discover RVs');
    setIsDiscovering(false);
  };

  const handleNetworkLost = () => {
    setConnectionError('Network connection lost. Please check your WiFi connection.');
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const startDiscovery = async () => {
    setIsDiscovering(true);
    setConnectionError(null);
    setDiscoveredRVs([]);
    
    try {
      await rvConnectionService.discoverRVs();
    } catch (error) {
      console.error('Discovery error:', error);
      setConnectionError('Failed to discover RVs. Please try again.');
      setIsDiscovering(false);
    }
  };

  const connectToRV = async (rvInfo) => {
    setIsConnecting(true);
    setSelectedRV(rvInfo);
    setConnectionError(null);
    
    try {
      const result = await rvConnectionService.connectToRV(rvInfo);
      
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError(error.message);
      setIsConnecting(false);
      setSelectedRV(null);
    }
  };

  const handleManualConnection = async () => {
    if (!manualRVId.trim() && !manualIP.trim()) {
      Alert.alert('Error', 'Please enter either an RV ID or IP address');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      let rvInfo;
      
      if (manualIP.trim()) {
        // Direct IP connection
        rvInfo = {
          id: `manual-${Date.now()}`,
          name: `RV at ${manualIP}`,
          ip: manualIP.trim(),
          port: 3000,
          isManual: true
        };
      } else {
        // RV ID lookup (would need to implement ID resolution service)
        rvInfo = await resolveRVId(manualRVId.trim());
      }

      await connectToRV(rvInfo);
      setShowManualEntry(false);
      setManualRVId('');
      setManualIP('');
    } catch (error) {
      setConnectionError(error.message);
      setIsConnecting(false);
    }
  };

  const resolveRVId = async (rvId) => {
    // This would typically query a discovery service or try common IP patterns
    // For now, we'll return a placeholder
    throw new Error('RV ID resolution not yet implemented. Please use IP address.');
  };

  const handleQRScan = (data) => {
    try {
      const rvInfo = JSON.parse(data);
      setShowQRScanner(false);
      connectToRV(rvInfo);
    } catch (error) {
      Alert.alert('Invalid QR Code', 'The scanned QR code is not a valid RV connection code.');
    }
  };

  const renderRVCard = (rv) => (
    <TouchableOpacity
      key={rv.id}
      style={[
        styles.rvCard,
        isTablet && styles.tabletRVCard,
        selectedRV?.id === rv.id && styles.selectedRVCard
      ]}
      onPress={() => connectToRV(rv)}
      disabled={isConnecting}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={
          selectedRV?.id === rv.id
            ? ['rgba(255, 178, 103, 0.3)', 'rgba(255, 122, 61, 0.2)']
            : ['rgba(39, 48, 63, 0.8)', 'rgba(27, 27, 27, 0.9)']
        }
        style={styles.rvCardGradient}
      >
        <View style={styles.rvCardHeader}>
          <View style={styles.rvIconContainer}>
            <Ionicons 
              name="car-outline" 
              size={isTablet ? 32 : 24} 
              color="#FFB267" 
            />
          </View>
          <View style={styles.rvInfo}>
            <Text style={[styles.rvName, isTablet && styles.tabletRVName]}>
              {rv.name}
            </Text>
            <Text style={[styles.rvDetails, isTablet && styles.tabletRVDetails]}>
              {rv.model ? `${rv.model} • ` : ''}{rv.id}
            </Text>
          </View>
          <View style={styles.signalContainer}>
            <View style={[
              styles.signalDot,
              rv.signalStrength === 'excellent' && styles.signalExcellent,
              rv.signalStrength === 'good' && styles.signalGood,
              rv.signalStrength === 'fair' && styles.signalFair,
              rv.signalStrength === 'poor' && styles.signalPoor,
            ]} />
          </View>
        </View>
        
        {rv.features && rv.features.length > 0 && (
          <View style={styles.featuresContainer}>
            {rv.features.slice(0, 4).map((feature, index) => (
              <View key={index} style={styles.featureTag}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
            {rv.features.length > 4 && (
              <Text style={styles.moreFeatures}>+{rv.features.length - 4} more</Text>
            )}
          </View>
        )}
        
        <View style={styles.rvCardFooter}>
          <Text style={[styles.ipAddress, isTablet && styles.tabletIPAddress]}>
            {rv.ip}:{rv.port}
          </Text>
          {selectedRV?.id === rv.id && isConnecting && (
            <ActivityIndicator color="#FFB267" size="small" />
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderConnectionStatus = () => {
    const getStatusConfig = () => {
      switch (connectionState) {
        case 'discovering':
          return {
            icon: 'search-outline',
            title: 'Searching for RVs...',
            message: 'Scanning your network for available RV control systems',
            color: '#4F7BFA'
          };
        case 'connecting':
          return {
            icon: 'link-outline',
            title: `Connecting to ${selectedRV?.name || 'RV'}...`,
            message: 'Establishing secure connection and authenticating',
            color: '#FFB267'
          };
        case 'connected':
          return {
            icon: 'checkmark-circle-outline',
            title: 'Connected Successfully!',
            message: `Connected to ${selectedRV?.name || 'your RV'} with ${permissionLevel} access`,
            color: '#4CAF50'
          };
        case 'error':
          return {
            icon: 'alert-circle-outline',
            title: 'Connection Failed',
            message: connectionError || 'Unable to establish connection',
            color: '#F44336'
          };
        default:
          return {
            icon: 'wifi-outline',
            title: 'Ready to Connect',
            message: 'Find and connect to your RV control system',
            color: '#FFB267'
          };
      }
    };

    const config = getStatusConfig();
    
    return (
      <View style={[styles.statusContainer, isTablet && styles.tabletStatusContainer]}>
        <Animated.View 
          style={[
            styles.statusIconContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <LinearGradient
            colors={[`${config.color}20`, `${config.color}10`]}
            style={styles.statusIconGradient}
          >
            <Ionicons 
              name={config.icon} 
              size={isTablet ? 64 : 48} 
              color={config.color} 
            />
          </LinearGradient>
        </Animated.View>
        
        <Text style={[styles.statusTitle, isTablet && styles.tabletStatusTitle]}>
          {config.title}
        </Text>
        <Text style={[styles.statusMessage, isTablet && styles.tabletStatusMessage]}>
          {config.message}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D1117', '#1B1B1B', '#27303F']}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={isDiscovering}
              onRefresh={startDiscovery}
              tintColor="#FFB267"
              colors={['#FFB267']}
            />
          }
        >
          {/* Header */}
          <View style={[styles.header, isTablet && styles.tabletHeader]}>
            <Image
              source={require('../assets/images/icon.png')}
              style={[styles.headerLogo, isTablet && styles.tabletHeaderLogo]}
            />
            <Text style={[styles.headerTitle, isTablet && styles.tabletHeaderTitle]}>
              Coast RV
            </Text>
            <Text style={[styles.headerSubtitle, isTablet && styles.tabletHeaderSubtitle]}>
              Connect to Your RV
            </Text>
          </View>

          {/* Connection Status */}
          {renderConnectionStatus()}

          {/* Error Display */}
          {connectionError && (
            <View style={[styles.errorContainer, isTablet && styles.tabletErrorContainer]}>
              <Ionicons name="alert-circle" size={24} color="#F44336" />
              <Text style={[styles.errorText, isTablet && styles.tabletErrorText]}>
                {connectionError}
              </Text>
            </View>
          )}

          {/* Connection Options */}
          {connectionState === 'disconnected' && !isDiscovering && !isConnecting && (
            <View style={styles.connectionOptions}>
              <TouchableOpacity
                style={[styles.primaryButton, isTablet && styles.tabletPrimaryButton]}
                onPress={startDiscovery}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFB267', '#FF7043']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="search" size={isTablet ? 24 : 20} color="#fff" />
                  <Text style={[styles.primaryButtonText, isTablet && styles.tabletPrimaryButtonText]}>
                    Discover RVs
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.alternativeOptions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, isTablet && styles.tabletSecondaryButton]}
                  onPress={() => setShowQRScanner(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="qr-code-outline" size={isTablet ? 24 : 20} color="#FFB267" />
                  <Text style={[styles.secondaryButtonText, isTablet && styles.tabletSecondaryButtonText]}>
                    Scan QR Code
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, isTablet && styles.tabletSecondaryButton]}
                  onPress={() => setShowManualEntry(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={isTablet ? 24 : 20} color="#FFB267" />
                  <Text style={[styles.secondaryButtonText, isTablet && styles.tabletSecondaryButtonText]}>
                    Manual Entry
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Discovered RVs */}
          {discoveredRVs.length > 0 && (
            <View style={styles.rvsContainer}>
              <Text style={[styles.rvsTitle, isTablet && styles.tabletRVsTitle]}>
                Available RVs ({discoveredRVs.length})
              </Text>
              {discoveredRVs.map(renderRVCard)}
            </View>
          )}

          {/* Help Section */}
          <View style={[styles.helpContainer, isTablet && styles.tabletHelpContainer]}>
            <Text style={[styles.helpTitle, isTablet && styles.tabletHelpTitle]}>
              Need Help?
            </Text>
            <View style={styles.helpItem}>
              <Ionicons name="information-circle-outline" size={16} color="#FFB267" />
              <Text style={styles.helpText}>
                Make sure you're connected to your RV's WiFi network
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="information-circle-outline" size={16} color="#FFB267" />
              <Text style={styles.helpText}>
                Check that the RV control system is powered on
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="information-circle-outline" size={16} color="#FFB267" />
              <Text style={styles.helpText}>
                For QR code, check your RV's control panel or documentation
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Manual Entry Modal */}
        <Modal
          visible={showManualEntry}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowManualEntry(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, isTablet && styles.tabletModalContainer]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isTablet && styles.tabletModalTitle]}>
                  Manual Connection
                </Text>
                <TouchableOpacity
                  onPress={() => setShowManualEntry(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>RV ID (if available)</Text>
                  <TextInput
                    style={[styles.input, isTablet && styles.tabletInput]}
                    placeholder="e.g., RV-A7B3C9"
                    placeholderTextColor="#666"
                    value={manualRVId}
                    onChangeText={setManualRVId}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.orLine} />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>IP Address</Text>
                  <TextInput
                    style={[styles.input, isTablet && styles.tabletInput]}
                    placeholder="e.g., 192.168.1.100"
                    placeholderTextColor="#666"
                    value={manualIP}
                    onChangeText={setManualIP}
                    keyboardType="numeric"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, isTablet && styles.tabletModalButton]}
                  onPress={handleManualConnection}
                  disabled={isConnecting}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FFB267', '#FF7043']}
                    style={styles.modalButtonGradient}
                  >
                    {isConnecting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="link" size={20} color="#fff" />
                        <Text style={[styles.modalButtonText, isTablet && styles.tabletModalButtonText]}>
                          Connect
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* QR Scanner Modal */}
        <Modal
          visible={showQRScanner}
          animationType="slide"
          onRequestClose={() => setShowQRScanner(false)}
        >
          <View style={styles.qrScannerContainer}>
            {/* QR Scanner implementation would go here */}
            <Text style={styles.qrPlaceholder}>QR Code Scanner</Text>
            <Text style={styles.qrSubtext}>Camera integration needed</Text>
            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQRScanner(false)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  tabletHeader: {
    marginBottom: 60,
  },
  headerLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
  },
  tabletHeaderLogo: {
    width: 100,
    height: 100,
    borderRadius: 25,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  tabletHeaderTitle: {
    fontSize: 42,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#FFB267',
    fontWeight: '500',
  },
  tabletHeaderSubtitle: {
    fontSize: 22,
  },

  // Status Styles
  statusContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
  },
  tabletStatusContainer: {
    marginBottom: 60,
    paddingVertical: 30,
  },
  statusIconContainer: {
    marginBottom: 20,
  },
  statusIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  tabletStatusTitle: {
    fontSize: 32,
    marginBottom: 12,
  },
  statusMessage: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  tabletStatusMessage: {
    fontSize: 18,
    maxWidth: 400,
  },

  // Error Styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  tabletErrorContainer: {
    padding: 20,
    marginBottom: 30,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  tabletErrorText: {
    fontSize: 16,
  },

  // Button Styles
  connectionOptions: {
    marginBottom: 30,
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabletPrimaryButton: {
    marginBottom: 30,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  tabletPrimaryButtonText: {
    fontSize: 20,
  },
  alternativeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(39, 48, 63, 0.8)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.2)',
  },
  tabletSecondaryButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#FFB267',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabletSecondaryButtonText: {
    fontSize: 16,
  },

  // RV Card Styles
  rvsContainer: {
    marginBottom: 30,
  },
  rvsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  tabletRVsTitle: {
    fontSize: 24,
    marginBottom: 20,
  },
  rvCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabletRVCard: {
    marginBottom: 20,
  },
  selectedRVCard: {
    shadowColor: '#FFB267',
    shadowOpacity: 0.4,
    borderWidth: 2,
    borderColor: '#FFB267',
  },
  rvCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  rvCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rvIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 178, 103, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rvInfo: {
    flex: 1,
  },
  rvName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  tabletRVName: {
    fontSize: 20,
  },
  rvDetails: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabletRVDetails: {
    fontSize: 16,
  },
  signalContainer: {
    alignItems: 'center',
  },
  signalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#666',
  },
  signalExcellent: {
    backgroundColor: '#4CAF50',
  },
  signalGood: {
    backgroundColor: '#8BC34A',
  },
  signalFair: {
    backgroundColor: '#FF9800',
  },
  signalPoor: {
    backgroundColor: '#F44336',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  featureTag: {
    backgroundColor: 'rgba(255, 178, 103, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#FFB267',
    fontWeight: '500',
  },
  moreFeatures: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  rvCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ipAddress: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  tabletIPAddress: {
    fontSize: 14,
  },

  // Help Styles
  helpContainer: {
    backgroundColor: 'rgba(39, 48, 63, 0.5)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.1)',
  },
  tabletHelpContainer: {
    padding: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB267',
    marginBottom: 12,
  },
  tabletHelpTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#1B1B1B',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.2)',
  },
  tabletModalContainer: {
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 178, 103, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  tabletModalTitle: {
    fontSize: 24,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB267',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(39, 48, 63, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.2)',
  },
  tabletInput: {
    paddingVertical: 16,
    fontSize: 18,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 178, 103, 0.2)',
  },
  orText: {
    color: '#666',
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  modalButton: {
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabletModalButton: {
    marginTop: 20,
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  tabletModalButtonText: {
    fontSize: 18,
  },

  // QR Scanner Styles
  qrScannerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPlaceholder: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
  },
  qrSubtext: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
  },
  qrCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
});

export default RVConnectionScreen;