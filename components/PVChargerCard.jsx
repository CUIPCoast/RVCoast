import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

/**
 * PVChargerCard – shows the current PV charger power output with a branded orange card
 * and a decorative sun icon in the bottom‑right corner.
 *
 * Props
 *  power          string   formatted power value, e.g. "120W"
 *  imageSource    ImageSrc local image for the SmartSolar unit photo
 *  sunIcon        ImageSrc (optional) custom sun icon, defaults to built‑in asset
 *  cardOffset     {top,left} fine‑tune position of the orange card
 *  imageOffset    {top,left} fine‑tune position of the background photo
 */
const PVChargerCard = ({
  power,
  imageSource,
  sunIcon = require('../assets/sun.png'),
  cardOffset = { top: 0, left: 0 },
  imageOffset = { top: 0, left: 0 },
}) => (
  <View style={styles.frame}>
    {/* — back layer : SmartSolar photo — */}
    <Image source={imageSource} style={[styles.photo, imageOffset]} />

    {/* — front layer : orange card — */}
    <View style={[styles.orangeCard, cardOffset]}>
      <View style={styles.orangeCardHeader}>
        <Text style={styles.orangeCardHeaderText}>PV Charger</Text>
      </View>

      <Text style={styles.cardValue}>{power}</Text>

      {/* decorative sun icon */}
      <Image source={sunIcon} style={styles.sunIcon} />
    </View>
  </View>
);

export default PVChargerCard;

/* ————— local styles ————— */
const styles = StyleSheet.create({
  frame: {
    width: 180,
    height: 140,
    marginHorizontal: 8,
    position: 'relative',
  },
  photo: {
    position: 'absolute',
    width: '110%', // a touch wider so edges never peek through
    height: '110%',
    resizeMode: 'contain',
  },
  orangeCard: {
    position: 'absolute',
    zIndex: 2, // sits on top of the photo
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
    width: 180,
    height: 140,
    backgroundColor: '#F57C00',
  },
  orangeCardHeader: {
    backgroundColor: '#E86100',
    width: '100%',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,
  },
  orangeCardHeaderText: {
    color: '#F7E7CE',
    fontSize: 18,
    fontWeight: '700',
  },
  cardValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 28, // clears the header strip
  },
  sunIcon: {
    position: 'absolute',
    width: 32,
    height: 32,
    bottom: 10,
    right: 10,
    resizeMode: 'contain',
    opacity: 0.9,
  },
});
