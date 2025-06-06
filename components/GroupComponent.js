import React, { useState, useEffect } from "react";
import { Text, StyleSheet, View, Image, Switch } from "react-native";

import { Color, FontFamily, FontSize, Border, isDarkMode} from "../GlobalStyles";
import ToggleSwitch from "./ToggleSwitch";

const GroupComponent = () => {
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = React.useState(false);
  const [isOn, setIsOn] = useState(false);

  
  
  return (
    <View style={styles.accountSettingsParent}>
      {/* <Text style={styles.accountSettings}>Account Settings</Text> */}
      <View style={[styles.editProfileParent, styles.parentLayout]}>
        <Text style={[styles.editProfile, styles.addUserTypo]}>
          Edit profile
        </Text>
        <Image
          style={styles.groupChild}
          contentFit="cover"
          source={require("../assets/group-14.png")}
        />
      </View>
      <View style={[styles.changePasswordParent, styles.parentLayout]}>
        <Text style={[styles.changePassword, styles.addUserTypo]}>
          Change password
        </Text>
        <Image
          style={styles.groupChild}
          contentFit="cover"
          source={require("../assets/group-14.png")}
        />
      </View>
      <View style={styles.pushNotificationsParent}>
        <Text style={[styles.pushNotifications, styles.addUserTypo]}>Push notifications</Text>
        <View className="items-end mt-2 ">
        <ToggleSwitch isOn={isOn} setIsOn={setIsOn} />
        </View>
      </View>

      {/* <View style={styles.darkModeWrapper}>
        <Text style={[styles.darkMode, styles.addUserTypo]}>Dark mode</Text>
        <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "center", height: 24 }}>
        <Switch
            trackColor={{ false: "white", true: "#008ABC" }}
            thumbColor={darkModeEnabled ? "white" : "white"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleToggle}
            value={darkModeEnabled}
          />
        </View>
      </View> */}



      <View style={[styles.addUserParent, styles.parentLayout]}>
        <Text style={[styles.addUser, styles.addUserPosition]}>Add User</Text>
        <Image
          style={styles.groupChild}
          contentFit="cover"
          source={require("../assets/group-19.png")}
        />
      </View>
      
    </View>
  );
};

const styles = StyleSheet.create({
  parentLayout: {
    height: 24,
    left: 0,
    width: 329,
    position: "absolute",
  },
  addUserTypo: {
    color: isDarkMode ? Color.white0 : Color.colorDarkslategray_200,

    textAlign: "left",
    fontFamily: FontFamily.manropeRegular,
    fontSize: FontSize.textLMedium_size,
    left: 0,
  },
  rectangleLayout: {
    width: 56,
    left: 273,
    height: 29,
    position: "absolute",
  },
  groupInnerLayout: {
    borderRadius: Border.br_xl,
    width: 56,
    height: 29,
    left: 0,
    top: 0,
    position: "absolute",
  },
  addUserPosition: {
    top: 3,
    position: "absolute",
  },
  accountSettings: {
    color: "black",
    textAlign: "left",
    fontFamily: FontFamily.manropeRegular,
    fontSize: FontSize.textLMedium_size,
    left: 0,
    top: 0,
    position: "absolute",
  },
  editProfile: {
    top: 1,
    position: "absolute",
  },
  groupChild: {
    height: "100%",
    width: "7.29%",
    top: "0%",
    right: "0%",
    bottom: "0%",
    left: "92.71%",
    maxWidth: "100%",
    overflow: "hidden",
    maxHeight: "100%",
    position: "absolute",
  },
  editProfileParent: {
    top: 52,
  },
  changePassword: {
    top: 0,
    position: "absolute",
  },
  changePasswordParent: {
    top: 108,
  },
  pushNotifications: {
    top: 4,
    position: "absolute",
  },
  groupInner: {
    backgroundColor: Color.colorCrimson,
  },
  ellipseIcon: {
    left: 30,
    width: 22,
    height: 22,
  },
  rectangleParent: {
    top: 0,
  },
  pushNotificationsParent: {
    top: 220,
    height: 29,
    left: 0,
    width: 329,
    position: "absolute",
  },
  darkModeWrapper: {
    top: 285,
    width: 329,
    height: 29,
    left: 0,
    position: "absolute",
  },
  rectangleView: {
    backgroundColor: Color.colorSandybrown,
  },
  rectangleGroup: {
    top: 281,
  },
  addUser: {
    color:  isDarkMode ?  Color.white0 : Color.colorDarkslategray_200,
    
    textAlign: "left",
    fontFamily: FontFamily.manropeRegular,
    fontSize: FontSize.textLMedium_size,
    left: 0,
  },
  addUserParent: {
    top: 164,
  },
  accountSettingsParent: {
    top: 90,
    left: 31,
    height: 310,
    width: 329,
    position: "absolute",
  },
});

export default GroupComponent;
