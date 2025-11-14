import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Animated } from 'react-native';
import { Color } from '../GlobalStyles';
import { AwningService } from '../API/RVControlServices';
import { createAwningCANListener } from '../Service/AwningCANListener';
import { FontFamily } from "../GlobalStyles";

// Persistent awning state manager (outside component to persist across modal sessions)
const AwningStateManager = {
  progress: 0, // 0-100 percentage
  isExtending: false,
  isRetracting: false,
  isStopped: true,
  startTime: null,
  pausedAt: null,
  lastCommand: null,
  lastCommandTime: null,
  
  getState() {
    return {
      progress: this.progress,
      isExtending: this.isExtending,
      isRetracting: this.isRetracting,
      isStopped: this.isStopped,
      startTime: this.startTime,
      pausedAt: this.pausedAt,
      lastCommand: this.lastCommand,
      lastCommandTime: this.lastCommandTime
    };
  },
  
  setState(newState) {
    Object.assign(this, newState);
  },
  
  reset() {
    this.progress = 0;
    this.isExtending = false;
    this.isRetracting = false;
    this.isStopped = true;
    this.startTime = null;
    this.pausedAt = null;
    this.lastCommand = null;
    this.lastCommandTime = null;
  }
};

/**
 * Enhanced Awning Control Modal with persistent progress bar
 * 
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const AwningControlModal = ({ isVisible, onClose }) => {
  // Core state
  const [statusMessage, setStatusMessage] = useState('Awning Ready');
  const [showStatus, setShowStatus] = useState(true);
  
  // Progress state (synced with persistent manager)
  const [progress, setProgress] = useState(AwningStateManager.progress);
  const [isExtending, setIsExtending] = useState(AwningStateManager.isExtending);
  const [isRetracting, setIsRetracting] = useState(AwningStateManager.isRetracting);
  const [isStopped, setIsStopped] = useState(AwningStateManager.isStopped);
  
  // Progress animation
  const progressAnim = useRef(new Animated.Value(AwningStateManager.progress)).current;
  
  // Progress update interval
  const progressInterval = useRef(null);
  
  // CAN bus listener for real-time status updates
  const canBusListener = useRef(null);
  
  // Status update timeout ref
  const statusTimeout = useRef(null);
  
  // Constants
  const EXTEND_DURATION = 48000; // 48 seconds in milliseconds
  const RETRACT_DURATION = 48000; // 48 seconds in milliseconds

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
   * Update progress based on time elapsed
   */
  const updateProgress = () => {
    const state = AwningStateManager.getState();
    
    if (!state.isExtending && !state.isRetracting) {
      return;
    }
    
    if (!state.startTime) {
      return;
    }
    
    const now = Date.now();
    const elapsed = now - state.startTime;
    const duration = state.isExtending ? EXTEND_DURATION : RETRACT_DURATION;
    
    let newProgress;
    if (state.isExtending) {
      // Extending: progress increases from current to 100
      const progressDelta = (elapsed / duration) * 100;
      newProgress = Math.min(100, state.pausedAt + progressDelta);
    } else if (state.isRetracting) {
      // Retracting: progress decreases from current to 0
      const progressDelta = (elapsed / duration) * 100;
      newProgress = Math.max(0, state.pausedAt - progressDelta);
    }
    
    // Update persistent state
    AwningStateManager.setState({ progress: newProgress });
    
    // Update local state
    setProgress(newProgress);
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: newProgress,
      duration: 100,
      useNativeDriver: false,
    }).start();
    
    // Check if completed
    if ((state.isExtending && newProgress >= 100) || (state.isRetracting && newProgress <= 0)) {
      stopProgress();
      updateStatus(
        state.isExtending ? 'Awning fully extended' : 'Awning fully retracted',
        3000
      );
      
      // Update persistent state to stopped
      AwningStateManager.setState({
        isExtending: false,
        isRetracting: false,
        isStopped: true,
        startTime: null,
        pausedAt: newProgress
      });
      
      setIsExtending(false);
      setIsRetracting(false);
      setIsStopped(true);
    }
  };

  /**
   * Start progress tracking
   */
  const startProgress = (direction) => {
    const currentProgress = AwningStateManager.progress;
    const now = Date.now();
    
    if (direction === 'extend') {
      AwningStateManager.setState({
        isExtending: true,
        isRetracting: false,
        isStopped: false,
        startTime: now,
        pausedAt: currentProgress,
        lastCommand: 'extend',
        lastCommandTime: now
      });
      
      setIsExtending(true);
      setIsRetracting(false);
      setIsStopped(false);
      updateStatus('Extending awning...', 0);
    } else if (direction === 'retract') {
      AwningStateManager.setState({
        isExtending: false,
        isRetracting: true,
        isStopped: false,
        startTime: now,
        pausedAt: currentProgress,
        lastCommand: 'retract',
        lastCommandTime: now
      });
      
      setIsExtending(false);
      setIsRetracting(true);
      setIsStopped(false);
      updateStatus('Retracting awning...', 0);
    }
    
    // Clear existing interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    // Start progress update interval
    progressInterval.current = setInterval(updateProgress, 100);
  };

  /**
   * Resume progress tracking from stored state (when modal reopens)
   */
  const resumeProgress = (state) => {
    console.log('Resuming progress from state:', state);

    // Calculate how much time has passed since the operation started
    const now = Date.now();
    const elapsed = now - state.startTime;
    const duration = state.isExtending ? EXTEND_DURATION : RETRACT_DURATION;

    // Calculate what the current progress should be based on elapsed time
    let currentProgress;
    if (state.isExtending) {
      const progressDelta = (elapsed / duration) * 100;
      currentProgress = Math.min(100, state.pausedAt + progressDelta);
    } else if (state.isRetracting) {
      const progressDelta = (elapsed / duration) * 100;
      currentProgress = Math.max(0, state.pausedAt - progressDelta);
    }

    // Check if operation should have already completed
    if ((state.isExtending && currentProgress >= 100) || (state.isRetracting && currentProgress <= 0)) {
      // Operation completed while modal was closed
      console.log('Operation completed while modal was closed');

      AwningStateManager.setState({
        progress: state.isExtending ? 100 : 0,
        isExtending: false,
        isRetracting: false,
        isStopped: true,
        startTime: null,
        pausedAt: state.isExtending ? 100 : 0
      });

      setProgress(state.isExtending ? 100 : 0);
      setIsExtending(false);
      setIsRetracting(false);
      setIsStopped(true);
      progressAnim.setValue(state.isExtending ? 100 : 0);

      updateStatus(
        state.isExtending ? 'Awning fully extended' : 'Awning fully retracted',
        3000
      );

      return;
    }

    // Update current progress AND ensure state is properly synced
    AwningStateManager.setState({
      progress: currentProgress,
      isExtending: state.isExtending,
      isRetracting: state.isRetracting,
      isStopped: false,
      startTime: state.startTime,
      pausedAt: state.pausedAt
    });

    setProgress(currentProgress);
    setIsExtending(state.isExtending);
    setIsRetracting(state.isRetracting);
    setIsStopped(false);
    progressAnim.setValue(currentProgress);

    // Start the interval to continue tracking
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(updateProgress, 100);

    console.log(`Progress resumed at ${currentProgress.toFixed(1)}%`);
  };

  /**
   * Stop progress tracking
   */
  const stopProgress = () => {
    const currentProgress = AwningStateManager.progress;
    
    AwningStateManager.setState({
      isExtending: false,
      isRetracting: false,
      isStopped: true,
      startTime: null,
      pausedAt: currentProgress,
      lastCommand: 'stop',
      lastCommandTime: Date.now()
    });
    
    setIsExtending(false);
    setIsRetracting(false);
    setIsStopped(true);
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  /**
   * Execute awning command
   */
  const executeFluidCommand = async (command) => {
    console.log(`Executing fluid command: ${command}`);
    
    // Clear any pending timeouts
    if (statusTimeout.current) {
      clearTimeout(statusTimeout.current);
    }
    
    // Update progress tracking immediately
    if (command === 'extend') {
      startProgress('extend');
    } else if (command === 'retract') {
      startProgress('retract');
    } else if (command === 'stop') {
      stopProgress();
      updateStatus('Stopping awning...', 2000);
    }
    
    // Execute actual command in background (non-blocking)
    executeRVCCommandBackground(command);
  };

  /**
   * Background command execution
   */
  const executeRVCCommandBackground = async (command) => {
    try {
      let result;
      
      if (command === 'extend') {
        result = await AwningService.extendAwning();
      } else if (command === 'retract') {
        result = await AwningService.retractAwning();
      } else if (command === 'stop') {
        const { RVControlService } = await import('../API/rvAPI');
        console.log('🛑 Executing raw stop command: 19FEDB9F#0BFFC8010100FFFF');
        result = await RVControlService.executeRawCommand('19FEDB9F#0BFFC8010100FFFF');
        if (result) {
          console.log('✅ Stop command executed successfully');
          updateStatus('Awning stopped', 2000);
          result = { success: true };
        }
      }
      
      if (!result.success) {
        console.error(`Command ${command} failed:`, result.error || 'Unknown error');
        updateStatus(`Command failed: ${result.error || 'Unknown error'}`, 5000);
        stopProgress();
      }
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      updateStatus(`Error: ${error.message}`, 5000);
      stopProgress();
    }
  };

  /**
   * Initialize CAN bus listener for real-time status updates
   */
  useEffect(() => {
    if (isVisible) {
      try {
        canBusListener.current = createAwningCANListener();

        canBusListener.current.on('awningStateChange', (state) => {
          handleAwningStateChange(state);
        });
        
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
  }, [isVisible]);

  /**
   * Handle awning state changes from CAN bus
   */
  const handleAwningStateChange = (state) => {
    console.log('CAN: Awning state change detected:', state);

    // Get time since last command
    const timeSinceLastCommand = AwningStateManager.lastCommandTime ?
      Date.now() - AwningStateManager.lastCommandTime : Infinity;

    // Ignore CAN updates for 1 second after any user command to prevent interference
    if (timeSinceLastCommand < 1000) {
      console.log('CAN: Ignoring state change - waiting for command to settle');
      return;
    }

    // If user recently stopped, ignore CAN updates trying to restart movement for longer
    // This prevents the awning from auto-restarting when modal reopens
    if (AwningStateManager.lastCommand === 'stop' && timeSinceLastCommand < 10000) {
      console.log('CAN: Ignoring state change - user recently stopped awning');
      return;
    }

    if (state.isExtending && !AwningStateManager.isExtending) {
      updateStatus('CAN: Extending detected', 0);
      startProgress('extend');
    } else if (state.isRetracting && !AwningStateManager.isRetracting) {
      updateStatus('CAN: Retracting detected', 0);
      startProgress('retract');
    } else if (state.isStopped && (AwningStateManager.isExtending || AwningStateManager.isRetracting)) {
      updateStatus('CAN: Motors stopped', 3000);
      stopProgress();
    }
  };

  /**
   * Restore progress state when modal opens
   */
  useEffect(() => {
    if (isVisible) {
      // Restore state from persistent manager
      const state = AwningStateManager.getState();
      
      console.log('Modal opened, restoring state:', state);
      
      setProgress(state.progress);
      setIsExtending(state.isExtending);
      setIsRetracting(state.isRetracting);
      setIsStopped(state.isStopped);
      progressAnim.setValue(state.progress);
      
      // ONLY resume progress tracking if awning is ACTUALLY moving (not stopped)
      if (!state.isStopped && (state.isExtending || state.isRetracting)) {
        // Use resumeProgress to properly calculate current position and continue
        resumeProgress(state);
        
        updateStatus(
          state.isExtending ? 'Extending awning...' : 'Retracting awning...',
          0
        );
      } else {
        // Make sure no interval is running if stopped
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
        
        // Show appropriate status for stopped state
        if (state.progress >= 99) {
          updateStatus('Awning fully extended', 3000);
        } else if (state.progress <= 1) {
          updateStatus('Awning fully retracted', 3000);
        } else {
          updateStatus('Awning stopped', 3000);
        }
      }
    } else {
      // When modal closes, don't clear the interval if awning is still moving
      // Only clear interval if stopped
      const state = AwningStateManager.getState();
      if (state.isStopped && progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    }
  }, [isVisible]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (statusTimeout.current) {
        clearTimeout(statusTimeout.current);
      }
      // Don't clear progress interval - it should continue in background
    };
  }, []);

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

          {/* Progress Display */}
          <View style={styles.progressDisplayContainer}>
            {/* Status Text */}
            <Text style={styles.progressStatusText}>
              {isExtending ? 'Extending...' :
               isRetracting ? 'Retracting...' :
               progress >= 99 ? 'Extended' : 
               progress <= 1 ? 'Retracted' : 'Stopped'}
            </Text>

            {/* Progress Percentage */}
            <Text style={styles.progressPercentageText}>
              {Math.round(progress)}%
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>

            {/* Time Remaining (if moving) */}
            {(isExtending || isRetracting) && (
              <Text style={styles.timeRemainingText}>
                {isExtending ? 
                  `${Math.ceil(((100 - progress) / 100) * 48)}s remaining` :
                  `${Math.ceil((progress / 100) * 48)}s remaining`}
              </Text>
            )}
          </View>

          {/* Control Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isExtending && styles.activeButton
              ]}
              onPress={() => executeFluidCommand('extend')}
            >
              <Text style={styles.buttonText}>Extend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.stopButton,
                isStopped && styles.activeButton
              ]}
              onPress={() => executeFluidCommand('stop')}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isRetracting && styles.activeButton
              ]}
              onPress={() => executeFluidCommand('retract')}
            >
              <Text style={styles.buttonText}>Retract</Text>
            </TouchableOpacity>
          </View>

          {/* Status Message */}
          {showStatus && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{statusMessage}</Text>
              <Text style={styles.statusSubText}>
                CAN Bus: {canBusListener.current ? 'Monitoring' : 'Offline'}
              </Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: Color.colorGray_200,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    color: Color.white0,
    marginBottom: 20,
  },
  
  // Progress Display
  progressDisplayContainer: {
    width: '100%',
    backgroundColor: '#1B1B1B',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3A3A3A',
  },
  progressStatusText: {
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    color: Color.white0,
    marginBottom: 10,
  },
  progressPercentageText: {
    fontSize: 48,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    color: '#FF8200',
    marginBottom: 15,
  },
  progressBarContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#2F2F2F',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF8200',
    borderRadius: 10,
  },
  timeRemainingText: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: '#A9A9A9',
    marginTop: 10,
  },
  
  // Buttons
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
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  activeButton: {
    backgroundColor: '#FFB267',
    borderColor: '#FF8200',
    transform: [{ scale: 1.02 }],
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    color: Color.colorGray_200,
  },
  closeButton: {
    backgroundColor: '#2F2F2F',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButtonText: {
    color: Color.white0,
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
    minHeight: 40,
    justifyContent: 'center',
  },
  statusText: {
    color: Color.white0,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  statusSubText: {
    color: '#FFB267',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default AwningControlModal;