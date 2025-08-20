// components/TabletSetupScreen.jsx - Initial RV setup and configuration
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';

const { width, height } = Dimensions.get('window');

const TabletSetupScreen = ({ onSetupComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState({
    rvName: '',
    ownerName: '',
    wifiNetwork: '',
    wifiPassword: '',
    features: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rvInfo, setRVInfo] = useState(null);
  const [qrCode, setQRCode] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [discoveredSystems, setDiscoveredSystems] = useState([]);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;

  const setupSteps = [
    {
      title: "Welcome to Coast RV",
      subtitle: "Let's set up your RV control system",
      component: WelcomeStep
    },
    {
      title: "Name Your RV",
      subtitle: "Give your RV a friendly name",
      component: RVNamingStep
    },
    {
      title: "Owner Information",
      subtitle: "Set up the primary owner account",
      component: OwnerInfoStep
    },
    {
      title: "Discover Systems",
      subtitle: "Finding available RV systems",
      component: SystemDiscoveryStep
    },
    {
      title: "Network Setup",
      subtitle: "Configure network access",
      component: NetworkSetupStep
    },
    {
      title: "Setup Complete",
      subtitle: "Your RV is ready to control",
      component: CompletionStep
    }
  ];

  useEffect(() => {
    animateToStep(currentStep);
  }, [currentStep]);

  const animateToStep = (step) => {
    const progress = (step / (setupSteps.length - 1)) * 100;
    
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(stepAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(stepAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ]).start();
  };

  const handleNext = async () => {
    if (currentStep < setupSteps.length - 1) {
      if (currentStep === 1 && !setupData.rvName.trim()) {
        Alert.alert('Required', 'Please enter a name for your RV');
        return;
      }
      
      if (currentStep === 2 && !setupData.ownerName.trim()) {
        Alert.alert('Required', 'Please enter the owner name');
        return;
      }
      
      if (currentStep === 3) {
        await performSystemDiscovery();
      }
      
      if (currentStep === 4) {
        await completeSetup();
        return;
      }
      
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const performSystemDiscovery = async () => {
    setIsLoading(true);
    
    try {
      // Simulate system discovery
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockSystems = [
        { id: 'victron', name: 'Victron Energy System', status: 'detected', icon: 'battery-charging' },
        { id: 'lighting', name: 'RV-C Lighting', status: 'detected', icon: 'bulb' },
        { id: 'climate', name: 'Climate Control', status: 'detected', icon: 'thermometer' },
        { id: 'water', name: 'Water Systems', status: 'detected', icon: 'water' },
        { id: 'generator', name: 'Generator', status: 'not_found', icon: 'flash' },
      ];
      
      setDiscoveredSystems(mockSystems);
      setSetupData(prev => ({
        ...prev,
        features: mockSystems.filter(s => s.status === 'detected').map(s => s.id)
      }));
    } catch (error) {
      Alert.alert('Discovery Error', 'Failed to discover RV systems. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const completeSetup = async () => {
    setIsLoading(true);
    
    try {
      // Initialize RV system
      const response = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceInfo: {
            type: 'tablet',
            name: 'RV Control Tablet',
            platform: 'react-native'
          }
        })
      });
      
      const initResult = await response.json();
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Setup initialization failed');
      }
      
      // Complete setup
      const completeResponse = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${initResult.token}`
        },
        body: JSON.stringify({
          rvName: setupData.rvName,
          ownerName: setupData.ownerName,
          features: setupData.features,
          networkConfig: {
            wifiNetwork: setupData.wifiNetwork,
            wifiPassword: setupData.wifiPassword
          }
        })
      });
      
      const completeResult = await completeResponse.json();
      
      if (!completeResult.success) {
        throw new Error(completeResult.error || 'Setup completion failed');
      }
      
      // Generate QR code for mobile connections
      const qrResponse = await fetch('/api/discovery/qr');
      const qrResult = await qrResponse.json();
      
      setRVInfo({
        id: completeResult.rvId,
        name: completeResult.rvName,
        token: initResult.token
      });
      
      setQRCode(qrResult.qrCode);
      setCurrentStep(setupSteps.length - 1);
      
    } catch (error) {
      Alert.alert('Setup Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetupData = (field, value) => {
    setSetupData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Step Components

  function WelcomeStep() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.welcomeIconContainer}>
          <LinearGradient
            colors={['#FFB267', '#FF7043']}
            style={styles.welcomeIcon}
          >
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.welcomeLogo}
            />
          </LinearGradient>
        </View>
        
        <Text style={styles.welcomeTitle}>
          Welcome to Coast RV
        </Text>
        
        <Text style={styles.welcomeDescription}>
          This tablet will become your RV's central control hub. We'll guide you through 
          setting up your systems and creating secure connections for your mobile devices.
        </Text>
        
        <View style={styles.featureList}>
          <FeatureItem icon="bulb" text="Control all lighting systems" />
          <FeatureItem icon="thermometer" text="Manage climate and temperature" />
          <FeatureItem icon="water" text="Monitor water and tank levels" />
          <FeatureItem icon="battery-charging" text="Track power and solar systems" />
          <FeatureItem icon="phone-portrait" text="Connect mobile devices securely" />
        </View>
      </View>
    );
  }

  function RVNamingStep() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>RV Name</Text>
          <TextInput
            style={styles.largeInput}
            placeholder="e.g., Family Adventure Coach"
            placeholderTextColor="#666"
            value={setupData.rvName}
            onChangeText={(value) => updateSetupData('rvName', value)}
            autoFocus
          />
          <Text style={styles.inputHint}>
            Choose a friendly name that will identify your RV on mobile devices
          </Text>
        </View>
        
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Preview</Text>
          <View style={styles.previewContent}>
            <Ionicons name="car" size={40} color="#FFB267" />
            <View style={styles.previewText}>
              <Text style={styles.previewName}>
                {setupData.rvName || "Your RV Name"}
              </Text>
              <Text style={styles.previewId}>RV-######</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  function OwnerInfoStep() {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionTitle}>Primary Owner Account</Text>
        <Text style={styles.sectionDescription}>
          The owner account has full control over all RV systems and can manage other users.
        </Text>
        
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Owner Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., John Smith"
            placeholderTextColor="#666"
            value={setupData.ownerName}
            onChangeText={(value) => updateSetupData('ownerName', value)}
          />
        </View>
        
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Owner Permissions</Text>
          <PermissionItem icon="checkmark-circle" text="Full system control" enabled />
          <PermissionItem icon="checkmark-circle" text="Device management" enabled />
          <PermissionItem icon="checkmark-circle" text="User permissions" enabled />
          <PermissionItem icon="checkmark-circle" text="System configuration" enabled />
        </View>
      </View>
    );
  }

  function SystemDiscoveryStep() {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionTitle}>Discovering RV Systems</Text>
        <Text style={styles.sectionDescription}>
          Scanning for available systems in your RV...
        </Text>
        
        {isLoading ? (
          <View style={styles.discoveryLoading}>
            <ActivityIndicator size="large" color="#FFB267" />
            <Text style={styles.discoveryLoadingText}>
              Scanning RV systems...
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.systemsList}>
            {discoveredSystems.map((system) => (
              <SystemCard key={system.id} system={system} />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  function NetworkSetupStep() {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionTitle}>Network Configuration</Text>
        <Text style={styles.sectionDescription}>
          Configure WiFi settings for remote access (optional)
        </Text>
        
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>WiFi Network (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Network name"
            placeholderTextColor="#666"
            value={setupData.wifiNetwork}
            onChangeText={(value) => updateSetupData('wifiNetwork', value)}
          />
        </View>
        
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>WiFi Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={setupData.wifiPassword}
            onChangeText={(value) => updateSetupData('wifiPassword', value)}
            secureTextEntry
          />
        </View>
        
        <View style={styles.networkNote}>
          <Ionicons name="information-circle" size={20} color="#FFB267" />
          <Text style={styles.networkNoteText}>
            WiFi setup allows mobile devices to connect from anywhere. 
            You can skip this and use direct connection only.
          </Text>
        </View>
      </View>
    );
  }

  function CompletionStep() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.completionHeader}>
          <LinearGradient
            colors={['#4CAF50', '#45A049']}
            style={styles.successIcon}
          >
            <Ionicons name="checkmark" size={48} color="#fff" />
          </LinearGradient>
          
          <Text style={styles.completionTitle}>
            Setup Complete!
          </Text>
          
          <Text style={styles.completionSubtitle}>
            {rvInfo?.name} is ready for control
          </Text>
        </View>
        
        <View style={styles.completionDetails}>
          <Text style={styles.rvIdLabel}>RV ID</Text>
          <Text style={styles.rvIdValue}>{rvInfo?.id}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => setShowQRModal(true)}
        >
          <LinearGradient
            colors={['#FFB267', '#FF7043']}
            style={styles.qrButtonGradient}
          >
            <Ionicons name="qr-code" size={24} color="#fff" />
            <Text style={styles.qrButtonText}>
              Show QR Code for Mobile Connection
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => onSetupComplete(rvInfo)}
        >
          <Text style={styles.completeButtonText}>
            Start Using Coast RV
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Helper Components

  function FeatureItem({ icon, text }) {
    return (
      <View style={styles.featureItem}>
        <Ionicons name={icon} size={24} color="#FFB267" />
        <Text style={styles.featureText}>{text}</Text>
      </View>
    );
  }

  function PermissionItem({ icon, text, enabled }) {
    return (
      <View style={styles.permissionItem}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={enabled ? "#4CAF50" : "#666"} 
        />
        <Text style={[
          styles.permissionText,
          !enabled && styles.permissionTextDisabled
        ]}>
          {text}
        </Text>
      </View>
    );
  }

  function SystemCard({ system }) {
    return (
      <View style={[
        styles.systemCard,
        system.status === 'detected' && styles.systemCardDetected
      ]}>
        <View style={styles.systemCardContent}>
          <Ionicons 
            name={system.icon} 
            size={28} 
            color={system.status === 'detected' ? "#4CAF50" : "#666"} 
          />
          <View style={styles.systemInfo}>
            <Text style={styles.systemName}>{system.name}</Text>
            <Text style={[
              styles.systemStatus,
              system.status === 'detected' && styles.systemStatusDetected
            ]}>
              {system.status === 'detected' ? 'Detected' : 'Not Found'}
            </Text>
          </View>
          <Ionicons 
            name={system.status === 'detected' ? "checkmark-circle" : "close-circle"} 
            size={24} 
            color={system.status === 'detected' ? "#4CAF50" : "#F44336"} 
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D1117', '#1B1B1B', '#27303F']}
        style={styles.background}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Step {currentStep + 1} of {setupSteps.length}
            </Text>
          </View>
        </View>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: stepAnim,
              transform: [
                {
                  translateY: stepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.stepTitle}>
            {setupSteps[currentStep].title}
          </Text>
          <Text style={styles.stepSubtitle}>
            {setupSteps[currentStep].subtitle}
          </Text>

          {React.createElement(setupSteps[currentStep].component)}
        </Animated.View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.prevButton,
              currentStep === 0 && styles.navButtonDisabled
            ]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <Ionicons name="chevron-back" size={24} color="#FFB267" />
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === setupSteps.length - 1 ? 'Complete' : 'Next'}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* QR Code Modal */}
        <Modal
          visible={showQRModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowQRModal(false)}
        >
          <View style={styles.qrModalOverlay}>
            <View style={styles.qrModalContent}>
              <View style={styles.qrModalHeader}>
                <Text style={styles.qrModalTitle}>Mobile Connection</Text>
                <TouchableOpacity
                  onPress={() => setShowQRModal(false)}
                  style={styles.qrModalClose}
                >
                  <Ionicons name="close" size={28} color="#999" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.qrModalDescription}>
                Scan this QR code with your mobile device to connect to your RV
              </Text>
              
              <View style={styles.qrCodeContainer}>
                {qrCode && (
                  <Image
                    source={{ uri: qrCode }}
                    style={styles.qrCodeImage}
                  />
                )}
              </View>
              
              <View style={styles.qrInstructions}>
                <Text style={styles.qrInstructionTitle}>Instructions:</Text>
                <Text style={styles.qrInstruction}>
                  1. Install Coast RV app on your mobile device
                </Text>
                <Text style={styles.qrInstruction}>
                  2. Open the app and tap "Scan QR Code"
                </Text>
                <Text style={styles.qrInstruction}>
                  3. Point camera at this QR code
                </Text>
                <Text style={styles.qrInstruction}>
                  4. Follow prompts to complete connection
                </Text>
              </View>
            </View>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 178, 103, 0.2)',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFB267',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 18,
    color: '#999',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  // Welcome Step
  welcomeIconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeIcon: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  welcomeTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 18,
    color: '#ccc',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 600,
    alignSelf: 'center',
  },
  featureList: {
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 16,
    fontWeight: '500',
  },

  // Input Styles
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFB267',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(39, 48, 63, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255, 178, 103, 0.2)',
  },
  largeInput: {
    backgroundColor: 'rgba(39, 48, 63, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontSize: 24,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255, 178, 103, 0.3)',
    textAlign: 'center',
    fontWeight: '600',
  },
  inputHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Preview Card
  previewCard: {
    backgroundColor: 'rgba(39, 48, 63, 0.6)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.2)',
    marginTop: 30,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB267',
    marginBottom: 16,
    textAlign: 'center',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    marginLeft: 16,
    alignItems: 'center',
  },
  previewName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  previewId: {
    fontSize: 16,
    color: '#999',
    fontFamily: 'monospace',
  },

  // Section Styles
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 500,
    alignSelf: 'center',
  },

  // Permission Card
  permissionCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginTop: 20,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    fontWeight: '500',
  },
  permissionTextDisabled: {
    color: '#666',
  },

  // Discovery Styles
  discoveryLoading: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  discoveryLoadingText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
    fontWeight: '500',
  },
  systemsList: {
    flex: 1,
    marginTop: 20,
  },
  systemCard: {
    backgroundColor: 'rgba(39, 48, 63, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  systemCardDetected: {
    borderColor: 'rgba(76, 175, 80, 0.5)',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  systemCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemInfo: {
    flex: 1,
    marginLeft: 16,
  },
  systemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  systemStatus: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  systemStatusDetected: {
    color: '#4CAF50',
  },

  // Network Setup
  networkNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 178, 103, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.3)',
  },
  networkNoteText: {
    fontSize: 14,
    color: '#FFB267',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },

  // Completion Styles
  completionHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  completionTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
  completionDetails: {
    backgroundColor: 'rgba(39, 48, 63, 0.8)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.2)',
    alignItems: 'center',
  },
  rvIdLabel: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  rvIdValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFB267',
    fontFamily: 'monospace',
  },
  qrButton: {
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  qrButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  completeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: '700',
  },

  // Navigation
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 30,
    paddingBottom: 40,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 120,
  },
  prevButton: {
    backgroundColor: 'rgba(39, 48, 63, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255, 178, 103, 0.3)',
  },
  nextButton: {
    backgroundColor: '#FFB267',
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: '#FFB267',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },

  // QR Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  qrModalContent: {
    backgroundColor: '#1B1B1B',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.2)',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  qrModalClose: {
    padding: 8,
  },
  qrModalDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  qrCodeImage: {
    width: 256,
    height: 256,
  },
  qrInstructions: {
    backgroundColor: 'rgba(39, 48, 63, 0.6)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.2)',
  },
  qrInstructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB267',
    marginBottom: 12,
  },
  qrInstruction: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default TabletSetupScreen;