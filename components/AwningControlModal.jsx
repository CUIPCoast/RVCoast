import React, { useState } from "react";
import { StyleSheet, View, Text, Modal, Pressable, Button, Image, ActivityIndicator, Alert } from "react-native";
import { Color } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize";
import LatchLight from "../components/LatchLight";

const AwningControlModal = ({ isVisible, onClose }) => {
  const isTablet = useScreenSize();
  const [loading, setLoading] = useState(false);

  // Function to send command to API
  const sendCommand = async (command) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        console.log(`Command ${command} executed successfully`);
      } else {
        Alert.alert('Error', data.message || 'Failed to execute command');
      }
    } catch (error) {
      console.error('Error sending command:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Handler functions for each awning action
  const handleExtend = () => sendCommand('awning_extend');
  const handleRetract = () => sendCommand('awning_retract');
  const handleStop = () => sendCommand('awning_stop'); // You'll need to add this to your server.js commands

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
          
          <View
            style={
              isTablet ? styles.tabletLatchContainer : styles.phoneLatchContainer
            }
          >
            
          </View>

          {/* Awning Control Buttons */}
          <View style={styles.controlButtonsContainer}>
            <Pressable
              style={[styles.actionButton, styles.extendButton]}
              onPress={handleExtend}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Extend</Text>
            </Pressable>
            
            <Pressable
              style={[styles.actionButton, styles.stopButton]}
              onPress={handleStop}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </Pressable>
            
            <Pressable
              style={[styles.actionButton, styles.retractButton]}
              onPress={handleRetract}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Retract</Text>
            </Pressable>
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
    height: "80%", // Increased height for additional controls
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
  phoneLatchContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  tabletLatchContainer: {
    alignItems: "center",
    width: 170,
    height: 110,
  },
  latchLightSpacing: {
    marginBottom: 5,
  },
  controlButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "60%",
    marginVertical: 5,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    marginHorizontal: 5,
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
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
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
    left:10,
  },
});

export default AwningControlModal;