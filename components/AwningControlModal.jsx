import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Color } from '../GlobalStyles';
import { AwningService } from '../API/RVControlServices';
import rvStateManager from '../API/RVStateManager/RVStateManager';

/**
 * Modal for controlling the RV's awning with integrated state management
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
  
  // State management integration
  const [awningState, setAwningState] = useState({
    position: 0, // 0 = fully retracted, 100 = fully extended
    isMoving: false,
    lastCommand: null,
    lastUpdate: null
  });
  
  // Animation refs and state
  const awningExtension = useRef(new Animated.Value(0)).current; // 0 = retracted, 1 = extended
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  // Subscribe to RV state changes
  useEffect(() => {
    // Initialize awning state if it doesn't exist
    const currentAwningState = rvStateManager.getCategoryState('awning');
    if (!currentAwningState || Object.keys(currentAwningState).length === 0) {
      const initialState = {
        position: 0,
        isMoving: false,
        lastCommand: null,
        lastUpdate: new Date().toISOString()
      };
      rvStateManager.updateState('awning', initialState);
      setAwningState(initialState);
    } else {
      setAwningState(currentAwningState);
      // Sync animation with stored state
      awningExtension.setValue(currentAwningState.position / 100);
    }

    // Subscribe to awning state changes
    const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
      if (category === 'awning') {
        setAwningState(state.awning);
        
        // Update animation to match state
        if (!animationInProgress) {
          Animated.timing(awningExtension, {
            toValue: state.awning.position / 100,
            duration: 500,
            useNativeDriver: false,
          }).start();
        }
      }
    });

    return unsubscribe;
  }, []);

  // Listen for external state changes (from other devices or CAN bus)
  useEffect(() => {
    const unsubscribeExternal = rvStateManager.subscribeToExternalChanges((state) => {
      if (state.awning) {
        console.log('AwningControlModal: External awning state change detected');
        setAwningState(state.awning);
        
        // Stop local animation if state changed externally
        if (animationInProgress) {
          awningExtension.stopAnimation();
          setAnimationInProgress(false);
          setIsExtending(false);
          setIsRetracting(false);
        }
        
        // Show status message for external changes
        if (state.awning.isMoving) {
          setStatusMessage(`Awning ${state.awning.lastCommand} (remote control)`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    });

    return unsubscribeExternal;
  }, [animationInProgress]);

  // Update state manager when local animation progresses
  useEffect(() => {
    if (animationInProgress) {
      const listener = awningExtension.addListener(({ value }) => {
        const position = Math.round(value * 100);
        
        // Update state manager with current position
        rvStateManager.updateState('awning', {
          position: position,
          isMoving: true,
          lastCommand: isExtending ? 'extending' : 'retracting',
          lastUpdate: new Date().toISOString()
        });
      });

      return () => {
        awningExtension.removeListener(listener);
      };
    }
  }, [animationInProgress, isExtending, isRetracting]);
  
  // Start awning extension animation
  const animateExtend = (targetPosition = 100) => {
    setAnimationInProgress(true);
    
    // Update state to show movement started
    rvStateManager.updateState('awning', {
      position: awningState.position,
      isMoving: true,
      lastCommand: 'extending',
      lastUpdate: new Date().toISOString()
    });
    
    Animated.timing(awningExtension, {
      toValue: targetPosition / 100,
      duration: 3000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setAnimationInProgress(false);
        
        // Update final state
        rvStateManager.updateState('awning', {
          position: targetPosition,
          isMoving: false,
          lastCommand: 'extended',
          lastUpdate: new Date().toISOString()
        });
      }
    });
  };
  
  // Start awning retraction animation
  const animateRetract = (targetPosition = 0) => {
    setAnimationInProgress(true);
    
    // Update state to show movement started
    rvStateManager.updateState('awning', {
      position: awningState.position,
      isMoving: true,
      lastCommand: 'retracting',
      lastUpdate: new Date().toISOString()
    });
    
    Animated.timing(awningExtension, {
      toValue: targetPosition / 100,
      duration: 3000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setAnimationInProgress(false);
        
        // Update final state
        rvStateManager.updateState('awning', {
          position: targetPosition,
          isMoving: false,
          lastCommand: 'retracted',
          lastUpdate: new Date().toISOString()
        });
      }
    });
  };
  
  // Stop animation at current position
  const stopAnimation = () => {
    awningExtension.stopAnimation((currentValue) => {
      const currentPosition = Math.round(currentValue * 100);
      
      // Update state with stopped position
      rvStateManager.updateState('awning', {
        position: currentPosition,
        isMoving: false,
        lastCommand: 'stopped',
        lastUpdate: new Date().toISOString()
      });
    });
    
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
        
        // Log command execution in state manager
        rvStateManager.updateState('awning', {
          ...awningState,
          isMoving: true,
          lastCommand: 'extending',
          lastUpdate: new Date().toISOString()
        });
      } else {
        // Stop animation if the API call fails
        stopAnimation();
        setStatusMessage('Failed to extend awning');
        
        // Log failed command
        rvStateManager.updateState('awning', {
          ...awningState,
          isMoving: false,
          lastCommand: 'extend_failed',
          lastUpdate: new Date().toISOString()
        });
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
      
      // Log error in state
      rvStateManager.updateState('awning', {
        ...awningState,
        isMoving: false,
        lastCommand: 'extend_error',
        lastUpdate: new Date().toISOString(),
        lastError: error.message
      });
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
        
        // Log command execution in state manager
        rvStateManager.updateState('awning', {
          ...awningState,
          isMoving: true,
          lastCommand: 'retracting',
          lastUpdate: new Date().toISOString()
        });
      } else {
        // Stop animation if the API call fails
        stopAnimation();
        setStatusMessage('Failed to retract awning');
        
        // Log failed command
        rvStateManager.updateState('awning', {
          ...awningState,
          isMoving: false,
          lastCommand: 'retract_failed',
          lastUpdate: new Date().toISOString()
        });
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
      
      // Log error in state
      rvStateManager.updateState('awning', {
        ...awningState,
        isMoving: false,
        lastCommand: 'retract_error',
        lastUpdate: new Date().toISOString(),
        lastError: error.message
      });
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
        
        // Update state to reflect stopped status
        const currentPosition = Math.round(awningExtension._value * 100);
        rvStateManager.updateState('awning', {
          position: currentPosition,
          isMoving: false,
          lastCommand: 'stopped',
          lastUpdate: new Date().toISOString()
        });
      } else {
        setStatusMessage('Failed to stop awning');
        
        // Log failed stop command
        rvStateManager.updateState('awning', {
          ...awningState,
          lastCommand: 'stop_failed',
          lastUpdate: new Date().toISOString()
        });
      }
      
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (error) {
      console.error('Error stopping awning:', error);
      setStatusMessage('Error: ' + error.message);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      
      // Log error in state
      rvStateManager.updateState('awning', {
        ...awningState,
        lastCommand: 'stop_error',
        lastUpdate: new Date().toISOString(),
        lastError: error.message
      });
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
      
      // Stop any ongoing animation
      if (animationInProgress) {
        stopAnimation();
      }
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
        
        {/* Position indicator */}
        <View style={styles.positionIndicator}>
          <Text style={styles.positionText}>
            Position: {awningState.position}%
          </Text>
          {awningState.isMoving && (
            <Text style={styles.movingText}>
              {awningState.lastCommand}
            </Text>
          )}
        </View>
        
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
                (isExtending || awningState.lastCommand === 'extending') ? styles.activeButton : null,
                (isLoading || awningState.isMoving) ? styles.disabledButton : null
              ]}
              onPress={handleExtend}
              disabled={isLoading || awningState.isMoving}
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
                (isRetracting || awningState.lastCommand === 'retracting') ? styles.activeButton : null,
                (isLoading || awningState.isMoving) ? styles.disabledButton : null
              ]}
              onPress={handleRetract}
              disabled={isLoading || awningState.isMoving}
            >
              <Text style={styles.buttonText}>Retract</Text>
            </TouchableOpacity>
          </View>

          {/* State Information */}
          <View style={styles.stateInfo}>
            <Text style={styles.stateLabel}>Status:</Text>
            <Text style={styles.stateValue}>
              {awningState.isMoving ? 
                `${awningState.lastCommand} (${awningState.position}%)` : 
                `Stopped at ${awningState.position}%`
              }
            </Text>
            {awningState.lastUpdate && (
              <Text style={styles.lastUpdate}>
                Last updated: {new Date(awningState.lastUpdate).toLocaleTimeString()}
              </Text>
            )}
          </View>

          {/* Loading Indicator */}
          {(isLoading || awningState.isMoving) && (
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
    height: 180,
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
    bottom: 30,
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
    top: 50,
  },
  awningArm: {
    width: 3,
    height: 50,
    backgroundColor: '#999',
    position: 'absolute',
    left: '32%',
    top: 50,
    transformOrigin: 'top left',
  },
  awningFabric: {
    height: 5,
    backgroundColor: '#FF8200', // Orange awning fabric
    position: 'absolute',
    left: '32%',
    top: 50,
    borderBottomRightRadius: 5,
    transformOrigin: 'top left',
  },
  positionIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: 5,
  },
  positionText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  movingText: {
    fontSize: 10,
    color: '#FF8200',
    fontStyle: 'italic',
  },
  animationStatus: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
  },
  
  // State information styles
  stateInfo: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  stateLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Color.white0,
    marginBottom: 5,
  },
  stateValue: {
    fontSize: 16,
    color: Color.white0,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#CCC',
    marginTop: 5,
  },
  
  // Control button styles
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
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