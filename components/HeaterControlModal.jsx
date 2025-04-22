import React, { useState } from "react";
import { StyleSheet, View, Text, Modal, Button, TouchableOpacity } from "react-native";
import { Color } from "../GlobalStyles";

const HeaterControlModal = ({ isVisible, onClose }) => {
  const [mode, setMode] = useState(null); 
  const [activeId, setActiveId] = useState(null); 

  const handleModeToggle = (selectedMode) => {
    if (mode === selectedMode) {
      setMode(null);
      setActiveId(null); 
    } else {
      setMode(selectedMode);
      setActiveId("low");
    }
  };

  const handlePress = (id) => {
    setActiveId(id);  
    
  };

  const items = [
    { id: "Auto", name: "Auto" },
    { id: "low", name: "Low" },
    { id: "med", name: "Med" },
    { id: "high", name: "High" },
    
  ];

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Toe Kick Settings</Text>
          <Text style={styles.currentTemp}>Current temperature: 75°F</Text>

          {/* Cooling/Heating Toggle */}
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "Cooling" && styles.coolingActive,
              ]}
              onPress={() => handleModeToggle("Cooling")}
            >
              <Text style={mode === "Cooling" ? styles.activeText : styles.inactiveText}>
                Cooling
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "Heating" && styles.heatingActive,
              ]}
              onPress={() => handleModeToggle("Heating")}
            >
              <Text style={mode === "Heating" ? styles.activeText : styles.inactiveText}>
                Toe Kick
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toeKickContainer}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.toeKickButton,
                  activeId === item.id && mode && (mode === "Cooling" ? styles.cooling : styles.heating),
                ]}
                onPress={() => handlePress(item.id)}
              >
                <Text style={activeId === item.id ? styles.activeText : styles.inactiveText}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Close Button */}
          <View style={styles.buttonContainer}>
            <Button title="Close" onPress={onClose} color="#f194ff" />
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
  modalContent: {
    width: "90%",
    padding: 20,
    backgroundColor: Color.colorGray_200,
    borderRadius: 20,
    alignItems: "center",
  },
  modalTitle: {
    color: Color.white0,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  currentTemp: {
    color: Color.white0,
    fontSize: 16,
    marginBottom: 20,
  },
  modeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    width: "80%",
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "white",
  },
  coolingActive: {
    backgroundColor: "#4CAF50", // Green for Cooling
  },
  heatingActive: {
    backgroundColor: "#FF6B6B", // Red for Heating
  },
  toeKickContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  toeKickButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "white",
  },
  cooling: {
    backgroundColor: "#4FC3F7", // Blue for Cooling Toe Kick
  },
  heating: {
    backgroundColor: "#FF7043", // Orange for Heating Toe Kick
  },
  activeText: {
    color: "white",
    fontWeight: "bold",
  },
  inactiveText: {
    color: "black",
  },
  buttonContainer: {
    marginTop: 20,
    width: "100%",
  },
});

export default HeaterControlModal;
