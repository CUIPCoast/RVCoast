// ScheduleLightsModal.js
import React, { useState } from "react";
import { View, Text, Button, StyleSheet, Image } from "react-native";
import Modal from "react-native-modal";
import DateTimePicker from "@react-native-community/datetimepicker";

// Helper function to get the current month and year
const getCurrentMonthYear = () => {
  const date = new Date();
  const options = { month: "long", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

const ScheduleLightsModal = ({ isVisible, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Handler for date change
  const onDateChange = (event, date) => {
    if (date) setSelectedDate(date);
  };

  return (
    <Modal
      isVisible={isVisible}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        {/* Swipe down indicator image */}
        <Image
          source={require("../assets/swipe.jpg")}
          style={styles.swipeDownImage}
        />

        <Text style={styles.modalText}>Schedule Lights</Text>

        {/* Subtext with 70% opacity */}
        <Text style={styles.subText}>Set schedule room light</Text>

        {/* Divider line */}
        <View style={styles.divider} />

        {/* Current month and year */}
        <Text style={styles.dateText}>{getCurrentMonthYear()}</Text>

        {/* Instruction text */}
        <Text style={styles.instructionText}>Select the Desired Date</Text>

        {/* Left-aligned Date picker */}
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        </View>


      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    height: "60%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 10,
    alignItems: "flex-start",
  },
  swipeDownImage: {
    width: 40,
    height: 25,
    alignSelf: "center",
    marginBottom: 10,
    borderRadius: 2,
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "left",
    width: "100%",
  },
  subText: {
    fontSize: 16,
    color: "black",
    opacity: 0.7,
    marginBottom: 10,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: "black",
    opacity: 0.7,
    marginBottom: 20,
  },
  datePickerContainer: {
    alignItems: "flex-start", // Aligns DateTimePicker to the left
    width: "100%",
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 10,
  },
});

export default ScheduleLightsModal;