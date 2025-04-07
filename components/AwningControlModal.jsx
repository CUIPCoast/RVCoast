import React, { useState } from "react";
import { StyleSheet, View, Text, Modal, Pressable, Button, Image, ActivityIndicator, ScrollView } from "react-native";
import { Color } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize";
import { AwningService } from "../services/rvControlServices"; // Import the service instead of the API

const AwningControlModal = ({ isVisible, onClose }) => {
  const isTablet = useScreenSize();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [operationLog, setOperationLog] = useState([]);
  const [activeButton, setActiveButton] = useState(null); // 'extend', 'retract', 'stop', or null

  // Log operations with timestamps
  const logOperation = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;
    console.log(logEntry); // Console log for debugging
    setOperationLog(prev => [logEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
  };

  // Handler functions for each awning action using the service layer
  const handleExtend = async () => {
    setStatus('Extending awning...');
    setActiveButton('extend'); // Set this button as active
    setLoading(true);
    
    try {
      logOperation('Sending command to extend awning');
      const result = await AwningService.extendAwning();
      
      if (result.success) {
        logOperation('Awning extend command executed successfully');
        setStatus('Awning extending');
      } else {
        logOperation(`Error executing extend command: ${result.error}`);
        setStatus(`Error: ${result.error}`);
        setActiveButton(null);
      }
    } catch (error) {
      logOperation(`Unexpected error: ${error.message}`);
      setStatus(`Error: ${error.message}`);
      setActiveButton(null);
    } finally {
      setLoading(false);
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleRetract = async () => {
    setStatus('Retracting awning...');
    setActiveButton('retract'); // Set this button as active
    setLoading(true);
    
    try {
      logOperation('Sending command to retract awning');
      const result = await AwningService.retractAwning();
      
      if (result.success) {
        logOperation('Awning retract command executed successfully');
        setStatus('Awning retracting');
      } else {
        logOperation(`Error executing retract command: ${result.error}`);
        setStatus(`Error: ${result.error}`);
        setActiveButton(null);
      }
    } catch (error) {
      logOperation(`Unexpected error: ${error.message}`);
      setStatus(`Error: ${error.message}`);
      setActiveButton(null);
    } finally {
      setLoading(false);
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleStop = async () => {
    setStatus('Stopping awning...');
    setActiveButton('stop'); // Set this button as active
    setLoading(true);
    
    try {
      logOperation('Sending command to stop awning');
      const result = await AwningService.stopAwning();
      
      if (result.success) {
        logOperation('Awning stop command executed successfully');
        setStatus('Awning stopped');
      } else {
        logOperation(`Error executing stop command: ${result.error}`);
        setStatus(`Error: ${result.error}`);
        setActiveButton(null);
      }
    } catch (error) {
      logOperation(`Unexpected error: ${error.message}`);
      setStatus(`Error: ${error.message}`);
      setActiveButton(null);
    } finally {
      setLoading(false);
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View
          style={[
            isTablet ? styles.tabletContent : styles.modalContent,
            isTablet ? styles.tabletModalContent : styles.phoneModalContent,
          ]}
        >
          <Text
            style={[
              styles.modalText,
              isTablet ? styles.tabletModalText : styles.phoneModalText,
            ]}
          >
            Awning Control Settings
          </Text>
          
          <Image
            style={isTablet ? styles.tabletModalImage : styles.phoneModalImage}
            source={require("../assets/abpost61724photoroom-3.png")}
          />
          
          {/* Status indicator */}
          {status && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          )}

          {/* Awning Control Buttons */}
          <View style={styles.controlButtonsContainer}>
            <Pressable
              style={[
                styles.actionButton, 
                styles.extendButton,
                activeButton === 'extend' && styles.activeButton
              ]}
              onPress={handleExtend}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Extend</Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.actionButton, 
                styles.stopButton,
                activeButton === 'stop' && styles.activeButton
              ]}
              onPress={handleStop}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.actionButton, 
                styles.retractButton,
                activeButton === 'retract' && styles.activeButton
              ]}
              onPress={handleRetract}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Retract</Text>
            </Pressable>
          </View>
          
          {/* Operation Log */}
          <View style={styles.logContainer}>
            <Text style={styles.logTitle}>Operation Log:</Text>
            <ScrollView style={styles.logScrollView}>
              {operationLog.map((entry, index) => (
                <Text key={index} style={styles.logEntry}>{entry}</Text>
              ))}
              {operationLog.length === 0 && (
                <Text style={styles.emptyLogMessage}>No operations logged yet</Text>
              )}
            </ScrollView>
          </View>
          
          {/* Loading indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Sending command...</Text>
            </View>
          )}

          <View
            style={
              isTablet
                ? styles.tabletButtonContainer
                : styles.phoneButtonContainer
            }
          >
            <Button title="Close" onPress={onClose} color="gray" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  tabletContent: {
    paddingLeft: 120,
    paddingRight: 120,
    paddingBottom: 60,
    top: 30,
    backgroundColor: Color.colorGray_200,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalContent: {
    width: "90%",
    padding: 20,
    backgroundColor: Color.colorGray_200,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabletModalContent: {
    top: 30,
  },
  phoneModalContent: {
    height: "80%", 
  },
  phoneModalImage: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginBottom: 20,
  },
  tabletModalImage: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    top: 60,
  },
  modalText: {
    color: Color.white0,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 0,
  },
  tabletModalText: {
    color: "white",
    fontSize: 24,
    marginTop: 15,
  },
  phoneModalText: {
    color: "white",
    fontSize: 18,
    marginTop: 15,
  },
  statusContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 10,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
  },
  controlButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginVertical: 15,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: "transparent", // Default transparent border
  },
  extendButton: {
    backgroundColor: "#4CAF50", // Green
  },
  stopButton: {
    backgroundColor: "#FF9800", // Orange
  },
  retractButton: {
    backgroundColor: "#F44336", // Red
  },
  activeButton: {
    borderColor: "white", // White border to indicate active state
    opacity: 0.9, // Slightly dimmed to show active state
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  logContainer: {
    width: "100%",
    height: 150,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  logTitle: {
    color: "white",
    fontWeight: "bold",
    marginBottom: 5,
  },
  logScrollView: {
    flex: 1,
  },
  logEntry: {
    color: "white",
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 2,
  },
  emptyLogMessage: {
    color: "rgba(255, 255, 255, 0.5)",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 10,
    borderRadius: 20,
  },
  loadingText: {
    color: "white",
    marginTop: 10,
  },
  phoneButtonContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tabletButtonContainer: {
    width: "50%",
    marginTop: 20,
    left: 10,
  },
});

export default AwningControlModal;