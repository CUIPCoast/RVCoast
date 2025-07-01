import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import VerticalSlider from "react-native-vertical-slider-smartlife";
import Ionicons from "react-native-vector-icons/Ionicons";
import useScreenSize from "../helper/useScreenSize.jsx";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Displays a vertical slider + percentage for either the
 * fresh- or gray-water tank.  No on/off toggle.
 */
const TankHeaterControl = ({
  name,
  icon = "water",
  initialPercentage,
  trackColor,
}) => {
  const [pct, setPct] = useState(initialPercentage);
  const isTablet = useScreenSize();

  /* ------------ persistence (slider %) ------------ */
  useEffect(() => {
    (async () => {
      try {
        const key =
          name.toLowerCase().includes("gray") ? "greyWaterLevel" : "freshWaterLevel";
        const saved = await AsyncStorage.getItem(key);
        if (saved !== null) setPct(parseInt(saved, 10));
      } catch (e) {
        console.error(`Error loading ${name} level:`, e);
      }
    })();
  }, [name]);

  useEffect(() => {
    (async () => {
      try {
        const key =
          name.toLowerCase().includes("gray") ? "greyWaterLevel" : "freshWaterLevel";
        await AsyncStorage.setItem(key, pct.toString());
      } catch (e) {
        console.error(`Error saving ${name} level:`, e);
      }
    })();
  }, [pct, name]);

  /* ------------ UI ------------ */
  const slider = (
    <VerticalSlider
      value={pct}
      min={0}
      max={100}
      width={isTablet ? 60 : 50}
      height={isTablet ? 130 : 90}
      step={1}
      borderRadius={6}
      minimumTrackTintColor={trackColor.minimum}
      maximumTrackTintColor={trackColor.maximum}
      onChange={setPct}
      thumbStyle={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: "#FFF",
        backgroundColor: "#00C6FB",
      }}
    />
  );

  return isTablet ? (
    <View className="items-center">
      <Ionicons name={icon} size={34} color="#00C6FB" style={{ marginBottom: 4 }} />
      {slider}
      <Text className="text-white font-semibold mt-1" style={{ fontSize: 16 }}>
        {pct}%
      </Text>
      <Text className="text-white mt-1">{name}</Text>
    </View>
  ) : (
    <View className="items-center">
      <Ionicons name={icon} size={28} color="#00C6FB" style={{ marginBottom: 2 }} />
      {slider}
      <Text className="text-white font-semibold mt-1" style={{ fontSize: 14 }}>
        {pct}%
      </Text>
    </View>
  );
};

export default TankHeaterControl;
