import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import VictronPowerCard from './VictronPowerCard';

/**
 * PVChargerCard – current PV charger output as an amber panel, with the SmartSolar
 * unit photo layered behind it.
 *
 * Props
 *  power          number   watts
 *  state          string   charger state, e.g. "charging"
 *  imageSource    ImageSrc local image for the SmartSolar unit photo
 *  cardOffset     {top,left} fine‑tune position of the amber card
 *  imageOffset    {top,left} fine‑tune position of the background photo
 */
const PVChargerCard = React.memo(({
  power,
  state,
  imageSource,
  cardOffset = { top: 0, left: 0 },
  imageOffset = { top: 0, left: 0 },
}) => {
  const watts = parseFloat(power);
  const hasValue = Number.isFinite(watts);
  const producing = hasValue && watts > 1;

  return (
    <View style={styles.frame}>
      {/* — back layer : SmartSolar photo — */}
      <Image
        source={imageSource}
        style={[styles.photo, imageOffset]}
        fadeDuration={0}
      />

      {/* — front layer : amber card — */}
      <VictronPowerCard
        compact
        title="PV Charger"
        icon="solar-power"
        value={hasValue ? `${Math.round(watts)}` : '--'}
        unit={hasValue ? 'W' : null}
        subtitle={producing ? 'Producing' : state ? `${state.charAt(0).toUpperCase()}${state.slice(1)}` : 'No sun right now'}
        colors={producing ? ['#FFB300', '#E65100'] : ['#9A6A12', '#5A2E06']}
        glow="#FFBF00"
        style={[styles.card, cardOffset]}
      />
    </View>
  );
});

export default PVChargerCard;

/* ————— local styles ————— */
const styles = StyleSheet.create({
  frame: {
    width: 180,
    height: 150,
    marginHorizontal: 8,
    position: 'relative',
  },
  photo: {
    position: 'absolute',
    width: '110%', // a touch wider so edges never peek through
    height: '110%',
    resizeMode: 'contain',
  },
  card: {
    marginHorizontal: 8,
    width: 180,
    height: 140,
  },
});
