import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Color } from '../GlobalStyles';
import { AwningService } from '../API/RVControlServices';

/**
 * Modal for controlling the RV's awning
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const AwningControlModal = ({ isVisible, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isRetracting, setIsRetracting] = useState(false);
  
  // Animation refs and state
  const awningExtension = useRef(new Animated.Value(0)).current; // 0 = retracted, 1 = extended
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  // Start awning extension animation
  const animateExtend = () => {
    setAnimationInProgress(true);
    Animated.timing(awningExtension, {
      toValue: 1,
      duration: 3000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setAnimationInProgress(false);
      }
    });
  };
  
  // Start awning retraction animation
  const animateRetract = () => {
    setAnimationInProgress(true);
    Animated.timing(awningExtension, {
      toValue: 0,
      duration: 3000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setAnimationInProgress(false);
      }
    });
  };
  
  // Stop animation at current position
  const stopAnimation = () => {
    awningExtension.stopAnimation();
    setAnimationInProgress(false);
  };

  // Handle extending the awning
  const handleExtend = async () => {
    setIsLoading(true);
    setIsExtending(true);
    setIsRetracting(false);
    
    // Start the extension animation
    animateExtend();
    
    try {
      const result = await AwningService.extendAwning();
      
      if (result.success) {
        setStatusMessage('Awning extending...');
      } else {
        // Stop animation if the API call fails
        stopAnimation();
        setStatusMessage('Failed to extend awning');
      }
      
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (error) {
      // Stop animation on error
      stopAnimation();
      console.error('Error extending awning:', error);
      setStatusMessage('Error: ' + error.message);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle retracting the awning
  const handleRetract = async () => {
    setIsLoading(true);
    setIsRetracting(true);
    setIsExtending(false);
    
    // Start the retraction animation
    animateRetract();
    
    try {
      const result = await AwningService.retractAwning();
      
      if (result.success) {
        setStatusMessage('Awning retracting...');
      } else {
        // Stop animation if the API call fails
        stopAnimation();
        setStatusMessage('Failed to retract awning');
      }
      
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (error) {
      // Stop animation on error
      stopAnimation();
      console.error('Error retracting awning:', error);
      setStatusMessage('Error: ' + error.message);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle stopping the awning
  const handleStop = async () => {
    setIsLoading(true);
    
    // Stop the animation
    stopAnimation();
    
    try {
      const result = await AwningService.stopAwning();
      
      if (result.success) {
        setStatusMessage('Awning stopped');
        setIsExtending(false);
        setIsRetracting(false);
      } else {
        setStatusMessage('Failed to stop awning');
      }
      
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (error) {
      console.error('Error stopping awning:', error);
      setStatusMessage('Error: ' + error.message);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isVisible) {
      setIsExtending(false);
      setIsRetracting(false);
      setShowStatus(false);
      // Reset animation to retracted position when modal closes
      awningExtension.setValue(0);
    }
  }, [isVisible]);

  // Awning Animation Component
  const AwningAnimation = () => {
    // Calculate animated styles
    const awningWidth = awningExtension.interpolate({
      inputRange: [0, 1],
      outputRange: ['5%', '75%']
    });
    
    const awningAngle = awningExtension.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '-25deg']
    });
    
    const awningTranslateX = awningExtension.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -20]
    });
    
    const awningOpacity = awningExtension.interpolate({
      inputRange: [0, 0.1],
      outputRange: [0, 1],
      extrapolate: 'clamp'
    });

    return (
      <View style={styles.animationContainer}>
        {/* RV Side View */}
        <View style={styles.rv}>
          <View style={styles.rvWindow} />
          <View style={styles.rvDoor} />
        </View>
        
        {/* Awning Mount Point */}
        <View style={styles.awningMount} />
        
        {/* Animated Awning Arm */}
        <Animated.View 
          style={[
            styles.awningArm, 
            { 
              transform: [
                { translateX: awningTranslateX },
                { rotateZ: awningAngle },
              ],
              opacity: awningOpacity
            }
          ]} 
        />
        
        {/* Animated Awning Fabric */}
        <Animated.View 
          style={[
            styles.awningFabric, 
            { 
              width: awningWidth,
              transform: [
                { translateX: awningTranslateX },
                { rotateZ: awningAngle },
              ],
              opacity: awningOpacity
            }
          ]} 
        />
        
        {/* Animation Status */}
        <Text style={styles.animationStatus}>
          {isExtending ? 'Extending...' : isRetracting ? 'Retracting...' : ''}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Awning Control</Text>

          {/* Awning Animation */}
          <AwningAnimation />

          {/* Control Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isExtending ? styles.activeButton : null,
                isLoading ? styles.disabledButton : null
              ]}
              onPress={handleExtend}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Extend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.stopButton,
                isLoading ? styles.disabledButton : null
              ]}
              onPress={handleStop}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isRetracting ? styles.activeButton : null,
                isLoading ? styles.disabledButton : null
              ]}
              onPress={handleRetract}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Retract</Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <ActivityIndicator 
              size="large" 
              color="#FF8200" 
              style={styles.loadingIndicator} 
            />
          )}

          {/* Status Message */}
          {showStatus && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: Color.colorGray_200,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Color.white0,
    marginBottom: 20,
  },
  
  // Animation styles
  animationContainer: {
    width: '100%',
    height: 160,
    marginBottom: 25,
    position: 'relative',
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  rv: {
    width: 80,
    height: 120,
    backgroundColor: '#777',
    borderRadius: 5,
    position: 'absolute',
    left: '25%',
    bottom: 10,
  },
  rvWindow: {
    width: 30,
    height: 25,
    backgroundColor: '#AAA',
    borderRadius: 3,
    position: 'absolute',
    top: 15,
    right: 10,
  },
  rvDoor: {
    width: 20,
    height: 40,
    backgroundColor: '#555',
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    left: 15,
  },
  awningMount: {
    width: 5,
    height: 5,
    backgroundColor: '#333',
    position: 'absolute',
    left: '32%',
    top: 35,
  },
  awningArm: {
    width: 3,
    height: 50,
    backgroundColor: '#999',
    position: 'absolute',
    left: '32%',
    top: 35,
    transformOrigin: 'top left',
  },
  awningFabric: {
    height: 5,
    backgroundColor: '#FF8200', // Orange awning fabric
    position: 'absolute',
    left: '32%',
    top: 35,
    borderBottomRightRadius: 5,
    transformOrigin: 'top left',
  },
  animationStatus: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
  },
  
  // Control button styles
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Color.white0,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#FFB267',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Color.colorGray_200,
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
  },
  closeButtonText: {
    color: Color.white0,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginBottom: 20,
  },
  statusText: {
    color: Color.white0,
    fontWeight: 'bold',
  }
});

export default AwningControlModal;