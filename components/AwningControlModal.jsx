import React from "react";
import { StyleSheet, View, Text, Modal,Pressable, Button, Image } from "react-native";
import { Color } from "../GlobalStyles";
import useScreenSize from "../helper/useScreenSize";
import LatchLight from "../components/LatchLight";
// import ToggleSwitch from "./ToggleSwitch";

const AwningControlModal = ({ isVisible, onClose }) => {
  const isTablet = useScreenSize();

  var logo =   <Image
  // style={styles.modalImage}
    className="h-44 w-52"
    source={require("../assets/abpost61724photoroom-3.png")}
  />

  // If the screen is a tablet, render nothing (null) to hide the tab navigator
  // if (isTablet) {
  //   return (
  //     <View className="">
  //       <View className="flex-row justify-between">
  //         <Text className="text-white ">Awning</Text>
  //         {/* <Text className="px-20 text-brown">e</Text> */}
  //         <ToggleSwitch className="text-center" />
  //       </View>

  //       <View className="pt-4 items-center">{logo}</View>
  //     </View>);
  // }


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
            styles.modalText, // Common styles for all devices
            isTablet ? styles.tabletModalText : styles.phoneModalText, // Device-specific styles
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
            <LatchLight name="Awning" style={styles.latchLightSpacing} />
            <LatchLight name="Awning Light" style={styles.latchLightSpacing} />
          </View>

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
    
    closeButton: {
      backgroundColor: "red", // White background
      paddingVertical: 10, // Padding for better touch area
      paddingHorizontal: 20, // Padding for better touch area
      borderRadius: 5, // Rounded corners
      alignItems: "center", // Center the text
      justifyContent: "center", // Center the text
      shadowColor: "#000", // Optional: Add a shadow
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2, // Shadow for Android
    },
    closeButtonText: {
      color: "white", // Black text
      fontSize: 16, // Font size
      fontWeight: "bold", // Bold text
    },
    
    
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
    height: "70%", // Smaller height for phone screens
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
    bottom: 40,
  },
  modalText: {
    color: Color.white0,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 0,
    top: 210,
  },
  
  tabletModalText: {
    color: "white", // Example: Blue text for tablets
    fontSize: 24, // Larger font for tablets
  },
  phoneModalText: {
    color: "white", // Example: Green text for phones
    fontSize: 18, // Smaller font for phones
    top:0
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
  phoneButtonContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tabletButtonContainer: {
    top: 20,
    width: 60,
    height: 60,
    
  },
});

export default AwningControlModal;
