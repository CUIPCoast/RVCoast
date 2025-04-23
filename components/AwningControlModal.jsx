import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
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

  // Handle extending the awning
  const handleExtend = async () => {
    setIsLoading(true);
    setIsExtending(true);
    setIsRetracting(false);
    
    try {
      const result = await AwningService.extendAwning();
      
      if (result.success) {
        setStatusMessage('Awning extending...');
      } else {
        setStatusMessage('Failed to extend awning');
      }
      
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (error) {
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
    
    try {
      const result = await AwningService.retractAwning();
      
      if (result.success) {
        setStatusMessage('Awning retracting...');
      } else {
        setStatusMessage('Failed to retract awning');
      }
      
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } catch (error) {
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
    }
  }, [isVisible]);

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
    marginBottom: 30,
  },
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