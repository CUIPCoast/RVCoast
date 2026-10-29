import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { Color } from '../GlobalStyles';
import { AwningService } from '../API/RVControlServices';
import { createAwningCANListener } from '../Service/AwningCANListener';
import { FontFamily } from "../GlobalStyles";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useScreenSize from '../helper/useScreenSize.jsx';

// How long the real awning takes to fully extend / retract (ms) - adjust to match the RV.
const AWNING_EXTEND_DURATION = 25000;
const AWNING_RETRACT_DURATION = 25000;

/**
 * Enhanced Awning Control Modal with fluid command switching and CAN bus status detection
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const AwningControlModal = ({ isVisible, onClose }) => {
  const isTablet = useScreenSize();
  const insets = useSafeAreaInsets();
  // Core state
  const [statusMessage, setStatusMessage] = useState('Awning Ready');
  const [showStatus, setShowStatus] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  
  // Awning state - tracks actual awning status
  const [awningState, setAwningState] = useState({
    isExtending: false,
    isRetracting: false,
    isStopped: true,
    position: 0, // 0 = fully retracted, 1 = fully extended
    lastCommand: null,
    lastCommandTime: null
  });

  // CAN bus listener for real-time status updates
  const canBusListener = useRef(null);
  
  // Status update timeout ref
  const statusTimeout = useRef(null);

  /**
   * Initialize CAN bus listener for real-time awning status detection
   */
  useEffect(() => {
    if (!demoMode && isVisible) {
      try {
        canBusListener.current = createAwningCANListener();
        
        // Listen for awning-specific events - but give priority to user commands
        canBusListener.current.on('awningStateChange', (state) => {
          // Only apply CAN state if it doesn't conflict with recent user commands
          const timeSinceLastCommand = awningState.lastCommandTime ? 
            Date.now() - awningState.lastCommandTime : Infinity;
          
          // If less than 1 second since user command, ignore CAN updates to prevent conflicts
          if (timeSinceLastCommand > 1000) {
            handleAwningStateChange(state);
          } else {
            console.log('Ignoring CAN state change due to recent user command');
          }
        });
        
        canBusListener.current.on('motorStateChange', handleMotorStateChange);
        canBusListener.current.on('positionUpdate', handlePositionUpdate);
        canBusListener.current.on('limitReached', handleLimitReached);
        canBusListener.current.on('commandExecuted', handleCommandExecuted);
        
        canBusListener.current.on('connected', () => {
          console.log('Awning CAN bus connected');
          updateStatus('CAN Bus Connected', 3000);
        });
        
        canBusListener.current.on('error', (error) => {
          console.warn('Awning CAN bus error:', error);
          updateStatus('CAN Bus Error - Using Local State', 3000);
        });
        
        canBusListener.current.start();
      } catch (error) {
        console.warn('Failed to initialize awning CAN bus listener:', error);
        updateStatus('CAN Bus Unavailable - Using Local State', 3000);
      }
    }
    
    return () => {
      if (canBusListener.current) {
        canBusListener.current.stop();
        canBusListener.current = null;
      }
    };
  }, [demoMode, isVisible]);

  /**
   * Handle awning state changes from CAN bus
   */
  const handleAwningStateChange = (state) => {
    console.log('CAN: Awning state change detected:', state);
    
    // Update local state based on CAN feedback
    setAwningState(prev => ({
      ...prev,
      isExtending: state.isExtending,
      isRetracting: state.isRetracting,
      isStopped: state.isStopped,
      position: state.position / 100, // Convert percentage to 0-1 range
      lastCommand: state.lastCommand || prev.lastCommand,
      lastCommandTime: state.timestamp
    }));
    
    // Update status based on real state - but don't override user commands
    if (state.isExtending && !awningState.isExtending) {
      updateStatus('CAN: Extending detected', 0);
    } else if (state.isRetracting && !awningState.isRetracting) {
      updateStatus('CAN: Retracting detected', 0);
    } else if (state.isStopped && (awningState.isExtending || awningState.isRetracting)) {
      updateStatus('CAN: Motors stopped', 3000);
    }
  };

  /**
   * Handle individual motor state changes
   */
  const handleMotorStateChange = (motorEvent) => {
    console.log('CAN: Motor state change:', motorEvent);
    
    const message = `${motorEvent.motorType} motor ${motorEvent.isRunning ? 'started' : 'stopped'}`;
    updateStatus(`CAN: ${message}`, 2000);
  };

  /**
   * Handle position updates from CAN bus
   */
  const handlePositionUpdate = (positionEvent) => {
    console.log('CAN: Position update:', positionEvent);
    
    // Update position in awning state
    setAwningState(prev => ({
      ...prev,
      position: positionEvent.position / 100
    }));
  };

  /**
   * Handle limit reached events
   */
  const handleLimitReached = (limitEvent) => {
    console.log('CAN: Limit reached:', limitEvent);
    
    const limitMessage = limitEvent.limitType === 'extended' ? 
      'Awning fully extended' : 'Awning fully retracted';
    
    updateStatus(`CAN: ${limitMessage}`, 5000);
    
    // Update state to stopped
    setAwningState(prev => ({
      ...prev,
      isExtending: false,
      isRetracting: false,
      isStopped: true,
      position: limitEvent.limitType === 'extended' ? 1 : 0
    }));
  };

  /**
   * Handle command execution confirmations
   */
  const handleCommandExecuted = (commandEvent) => {
    console.log('CAN: Command executed confirmation:', commandEvent);
    updateStatus(`CAN: ${commandEvent.command} executed`, 2000);
  };

  /**
   * Update status message with optional timeout
   */
  const updateStatus = (message, timeout = 0) => {
    setStatusMessage(message);
    setShowStatus(true);
    
    if (statusTimeout.current) {
      clearTimeout(statusTimeout.current);
    }
    
    if (timeout > 0) {
      statusTimeout.current = setTimeout(() => {
        setShowStatus(false);
      }, timeout);
    }
  };

  /**
   * Fluid command execution - no loading states, immediate response
   */
  const executeFluidCommand = async (command) => {
    console.log(`Executing fluid command: ${command}`);
    
    // Clear any pending demo completions that might interfere
    if (statusTimeout.current) {
      clearTimeout(statusTimeout.current);
    }
    
    // Update state immediately for responsive UI - this is the authoritative state
    const newState = {
      isExtending: command === 'extend',
      isRetracting: command === 'retract', 
      isStopped: command === 'stop',
      lastCommand: command,
      lastCommandTime: Date.now()
    };
    
    // Force state update immediately - don't let CAN bus override user commands
    setAwningState(prev => {
      console.log(`State transition: ${JSON.stringify(prev)} -> ${JSON.stringify({...prev, ...newState})}`);
      return { ...prev, ...newState };
    });
    
    // Update status immediately
    if (command === 'extend') {
      updateStatus('Extending awning...', 0);
    } else if (command === 'retract') {
      updateStatus('Retracting awning...', 0);
    } else if (command === 'stop') {
      updateStatus('Stopping awning...', 2000);
    }
    
    // Execute actual command in background (non-blocking)
    executeRVCCommandBackground(command);
  };

  /**
   * Background command execution for live mode
   */
  const executeRVCCommandBackground = async (command) => {
    try {
      let result;
      
      if (command === 'extend') {
        result = await AwningService.extendAwning();
      } else if (command === 'retract') {
        result = await AwningService.retractAwning();
      } else if (command === 'stop') {
        // Import RVControlService dynamically to avoid import issues
        const { RVControlService } = await import('../API/rvAPI');
        
        // Use the exact raw CAN command that works from your testing
        console.log('🛑 Executing raw stop command: 19FEDB9F#0BFFC8010100FFFF');
        result = await RVControlService.executeRawCommand('19FEDB9F#0BFFC8010100FFFF');
        if (result) {
          console.log('✅ Stop command executed successfully');
          updateStatus('Awning stopped', 2000);
          result = { success: true }; // Normalize the response
        }
      }
      
      if (!result.success) {
        console.error(`Command ${command} failed:`, result.error || 'Unknown error');
        updateStatus(`Command failed: ${result.error || 'Unknown error'}`, 5000);
        // Revert state on failure
        setAwningState(prev => ({
          ...prev,
          isExtending: false,
          isRetracting: false,
          isStopped: true
        }));
      }
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      updateStatus(`Error: ${error.message}`, 5000);
      // Revert state on error
      setAwningState(prev => ({
        ...prev,
        isExtending: false,
        isRetracting: false,
        isStopped: true
      }));
    }
  };

  /**
   * Simulate demo completion with realistic timing
   */
  const simulateDemoCompletion = (command) => {
    if (command === 'stop') {
      // Stop completes immediately
      const stopTimeout = setTimeout(() => {
        setAwningState(current => {
          // Only update if we're still in a stopped state (haven't been overridden)
          if (current.isStopped && current.lastCommand === 'stop') {
            updateStatus('Awning stopped', 3000);
            return current; // Keep current state
          }
          return current;
        });
      }, 200);
      
      // Store timeout for cleanup
      statusTimeout.current = stopTimeout;
    } else {
      // Extend/retract take time, but can be interrupted
      const duration = command === 'extend' ? AWNING_EXTEND_DURATION : AWNING_RETRACT_DURATION;
      
      const completionTimeout = setTimeout(() => {
        // Only complete if still in the same state (not interrupted)
        setAwningState(current => {
          console.log(`Demo completion check for ${command}:`, current);
          
          if (current.lastCommand === command && current.lastCommandTime) {
            const timeSinceCommand = Date.now() - current.lastCommandTime;
            if (timeSinceCommand >= duration - 1000) { // Allow some tolerance
              
              // Check if we're still in the right state
              const stillInCorrectState = (command === 'extend' && current.isExtending) || 
                                        (command === 'retract' && current.isRetracting);
              
              if (stillInCorrectState) {
                const completedState = {
                  ...current,
                  isExtending: false,
                  isRetracting: false,
                  isStopped: true,
                  position: command === 'extend' ? 1 : 0
                };
                
                updateStatus(
                  command === 'extend' ? 'Awning fully extended' : 'Awning fully retracted',
                  3000
                );
                
                console.log(`Demo completion: ${command} finished`, completedState);
                return completedState;
              }
            }
          }
          return current;
        });
      }, duration);
      
      // Store timeout for cleanup
      statusTimeout.current = completionTimeout;
    }
  };

  // Reset when modal closes
  useEffect(() => {
    if (!isVisible) {
      // Reset to fully retracted
      setAwningState({
        isExtending: false,
        isRetracting: false,
        isStopped: true,
        position: 0,
        lastCommand: null,
        lastCommandTime: null
      });
      
      setShowStatus(false);
      
      // Clear status timeout
      if (statusTimeout.current) {
        clearTimeout(statusTimeout.current);
      }
    }
  }, [isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusTimeout.current) {
        clearTimeout(statusTimeout.current);
      }
    };
  }, []);

  // ——— Bottom sheet on phones, centered card on tablets ———
  const isMoving = awningState.isExtending || awningState.isRetracting;
  const motionLabel = awningState.isExtending
    ? 'Extending'
    : awningState.isRetracting
      ? 'Retracting'
      : awningState.position >= 1
        ? 'Extended'
        : awningState.position <= 0
          ? 'Retracted'
          : 'Stopped';

  const controls = [
    { command: 'retract', label: 'Retract', icon: 'arrow-collapse-left', active: awningState.isRetracting },
    { command: 'stop', label: 'Stop', icon: 'stop', active: awningState.isStopped, danger: true },
    { command: 'extend', label: 'Extend', icon: 'arrow-expand-right', active: awningState.isExtending },
  ];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType={isTablet ? 'fade' : 'slide'}
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, isTablet && styles.backdropTablet]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close awning controls"
        />
        <View
          style={[
            styles.sheet,
            isTablet ? styles.sheetTablet : { paddingBottom: insets.bottom + 20 },
          ]}
        >
          {!isTablet && <View style={styles.grabber} />}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="rv-truck" size={22} color="#FFB267" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Awning</Text>
              <View style={styles.stateRow}>
                <View style={[styles.stateDot, { backgroundColor: isMoving ? '#FFB267' : '#6B6363' }]} />
                <Text style={styles.stateText}>{motionLabel}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {controls.map(({ command, label, icon, active, danger }) => {
              const activeColor = danger ? '#FF6B6B' : '#FFB267';
              return (
                <TouchableOpacity
                  key={command}
                  style={[
                    styles.control,
                    isTablet && styles.controlTablet,
                    active && { backgroundColor: activeColor, borderColor: activeColor },
                  ]}
                  onPress={() => executeFluidCommand(command)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} awning`}
                  accessibilityState={{ selected: active }}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={isTablet ? 34 : 28}
                    color={active ? '#1B1B1B' : danger ? '#FF6B6B' : '#FFFFFF'}
                  />
                  <Text style={[styles.controlLabel, { color: active ? '#1B1B1B' : '#FFFFFF' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status */}
          <View style={styles.statusBar}>
            <Ionicons name="information-circle-outline" size={16} color="#9E9696" />
            <Text style={styles.statusMessage} numberOfLines={1}>
              {showStatus ? statusMessage : 'Awning ready'}
            </Text>
            <Text style={styles.canStatus}>
              CAN {canBusListener.current ? 'online' : 'offline'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropTablet: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTablet: {
    width: 600,
    maxWidth: '90%',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 28,
  },
  controlTablet: {
    height: 112,
    borderRadius: 22,
  },
  sheet: {
    backgroundColor: '#211D1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.15)',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    color: Color.white0,
    fontSize: 22,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stateText: {
    color: '#C9C1C1',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
  },
  closeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  control: {
    flex: 1,
    height: 92,
    borderRadius: 18,
    backgroundColor: '#2A2626',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1B1B1B',
  },
  statusMessage: {
    flex: 1,
    color: Color.white0,
    fontSize: 13,
    marginLeft: 8,
    fontFamily: FontFamily.latoRegular,
  },
  canStatus: {
    color: '#FFB267',
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 8,
  },
});

export default AwningControlModal;