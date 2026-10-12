import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Switch, Alert, Platform } from "react-native";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Color, FontFamily } from "../GlobalStyles";
import { getLightIcon } from "../helper/rvControl/lightHelpers";
import lightScheduler from '../Service/LightSchedulerService';

const ACCENT = Color.colorSandybrown;
const MUTED = '#9E9696';
const SURFACE = '#1B1B1B';
const TRACK = '#2A2626';

// Light groups - matching LightScreenTablet organization
const ROOMS = [
  {
    id: 'kitchen',
    name: 'Kitchen & Living',
    icon: 'sofa-outline',
    lights: ['kitchen_lights', 'dinette_lights', 'under_cab_lights', 'strip_lights', 'awning_lights', 'porch_lights', 'hitch_lights'],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: 'bed-outline',
    lights: ['bed_ovhd_light', 'left_reading_lights', 'right_reading_lights', 'vibe_light'],
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: 'shower',
    lights: ['bath_light', 'vanity_light', 'shower_lights'],
  },
];

const lightDisplayNames = {
  'kitchen_lights': 'Kitchen Light',
  'bath_light': 'Bathroom Light',
  'bed_ovhd_light': 'Bed Light',
  'vibe_light': 'Accent Light',
  'vanity_light': 'Vanity Light',
  'awning_lights': 'Awning Lights',
  'shower_lights': 'Shower Light',
  'under_cab_lights': 'Cabinet Light',
  'hitch_lights': 'Hitch Light',
  'porch_lights': 'Porch Light',
  'left_reading_lights': 'Left Reading Light',
  'right_reading_lights': 'Right Reading Light',
  'dinette_lights': 'Dining Light',
  'strip_lights': 'Strip Light',
  'wardrobe_lights': 'Wardrobe Light'
};

const formatTime = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// Milliseconds until the next occurrence of the given time of day, and whether that is tomorrow
const untilNext = (time) => {
  const now = new Date();
  const target = new Date();
  target.setHours(time.getHours(), time.getMinutes(), 0, 0);
  let diff = target.getTime() - now.getTime();
  const isTomorrow = diff < 0;
  if (isTomorrow) diff += 24 * 60 * 60 * 1000;
  return { diff, isTomorrow };
};

const describeWait = (time) => {
  const { diff, isTomorrow } = untilNext(time);
  const totalMinutes = Math.round(diff / 60000);
  if (totalMinutes < 1) return 'Runs in less than a minute';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours} h`);
  if (minutes) parts.push(`${minutes} min`);
  return `Runs ${isTomorrow ? 'tomorrow, ' : ''}in ${parts.join(' ')}`;
};

/**
 * Modal for scheduling lights in the RV system
 * Pick lights (one by one or a whole room), a time, on/off and whether it repeats daily.
 * Existing schedules are listed at the top and can be paused or deleted.
 *
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const ScheduleLightsModal = ({ isVisible, onClose }) => {
  const insets = useSafeAreaInsets();

  // State management
  const [selectedLights, setSelectedLights] = useState([]);
  const [scheduleAction, setScheduleAction] = useState('on'); // 'on' or 'off'
  const [scheduleTime, setScheduleTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [schedules, setSchedules] = useState([]);

  const refreshSchedules = () => setSchedules([...lightScheduler.getSchedules()]);

  useEffect(() => {
    if (isVisible) refreshSchedules();
  }, [isVisible]);

  // Toggle individual light selection
  const toggleLightSelection = (lightId) => {
    setSelectedLights(prev =>
      prev.includes(lightId) ? prev.filter(id => id !== lightId) : [...prev, lightId]
    );
  };

  // Select or clear a whole room
  const toggleRoom = (room) => {
    const allSelected = room.lights.every(id => selectedLights.includes(id));
    setSelectedLights(prev =>
      allSelected
        ? prev.filter(id => !room.lights.includes(id))
        : [...new Set([...prev, ...room.lights])]
    );
  };

  // Handle time change
  const onTimeChange = (event, selectedDate) => {
    const currentDate = selectedDate || scheduleTime;
    setShowTimePicker(Platform.OS === 'ios');
    setScheduleTime(currentDate);
  };

  // Handle schedule creation
  const handleCreateSchedule = async () => {
    const lightsToSchedule = selectedLights;

    if (lightsToSchedule.length === 0) {
      Alert.alert('No lights selected', 'Pick at least one light to schedule.');
      return;
    }

    try {
      // Create schedule using LightSchedulerService
      const result = await lightScheduler.createSchedule({
        lights: lightsToSchedule,
        action: scheduleAction,
        time: scheduleTime,
        isRepeating: isRepeating
      });

      if (result.success) {
        console.log('✅ Schedule created successfully:', result.schedule);

        const count = lightsToSchedule.length;
        Alert.alert(
          'Schedule created',
          `${count} light${count !== 1 ? 's' : ''} will turn ${scheduleAction} at ${formatTime(scheduleTime)}` +
          `${isRepeating ? ' every day' : ''}.\n\n${describeWait(scheduleTime)}.`,
          [{ text: 'OK', style: 'default' }]
        );

        // Reset and close
        resetForm();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to create schedule');
      }
    } catch (error) {
      console.error('❌ Failed to create schedule:', error);
      Alert.alert(
        'Schedule not created',
        `${error.message}. Check the RV connection and try again.`,
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  };

  const handleToggleSchedule = async (scheduleId) => {
    await lightScheduler.toggleSchedule(scheduleId);
    refreshSchedules();
  };

  const handleDeleteSchedule = (schedule) => {
    Alert.alert(
      'Delete schedule?',
      `Lights will no longer turn ${schedule.action} at ${formatTime(new Date(schedule.time))}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await lightScheduler.deleteSchedule(schedule.id);
            refreshSchedules();
          },
        },
      ]
    );
  };

  // Reset form
  const resetForm = () => {
    setSelectedLights([]);
    setScheduleAction('on');
    setScheduleTime(new Date());
    setIsRepeating(false);
    setShowTimePicker(false);
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedCount = selectedLights.length;
  const createLabel = selectedCount === 0
    ? 'Pick lights to schedule'
    : `Turn ${selectedCount} light${selectedCount !== 1 ? 's' : ''} ${scheduleAction} at ${formatTime(scheduleTime)}`;

  // ——— Existing schedules ———
  const renderSchedules = () => {
    if (schedules.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your schedules</Text>
        {schedules.map((schedule) => {
          const time = new Date(schedule.time);
          const names = schedule.lights.map((id) => lightDisplayNames[id] || id);
          const lightsText = names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;

          return (
            <View key={schedule.id} style={[styles.scheduleRow, !schedule.enabled && styles.scheduleRowPaused]}>
              <View style={[styles.scheduleIcon, schedule.action === 'on' ? styles.scheduleIconOn : styles.scheduleIconOff]}>
                <MaterialCommunityIcons
                  name={schedule.action === 'on' ? 'lightbulb-on-outline' : 'lightbulb-off-outline'}
                  size={20}
                  color={schedule.action === 'on' ? '#1B1B1B' : MUTED}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleTime}>
                  {formatTime(time)}
                  <Text style={styles.scheduleMeta}>
                    {`  Turn ${schedule.action}, ${schedule.isRepeating ? 'daily' : 'once'}`}
                  </Text>
                </Text>
                <Text style={styles.scheduleLights} numberOfLines={1}>{lightsText}</Text>
              </View>
              <Switch
                value={schedule.enabled}
                onValueChange={() => handleToggleSchedule(schedule.id)}
                trackColor={{ false: TRACK, true: ACCENT }}
                thumbColor="#FFFFFF"
                accessibilityLabel={`${schedule.enabled ? 'Pause' : 'Resume'} schedule at ${formatTime(time)}`}
              />
              <TouchableOpacity
                onPress={() => handleDeleteSchedule(schedule)}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel={`Delete schedule at ${formatTime(time)}`}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  // ——— Light picker grouped by room ———
  const renderRoom = (room) => {
    const roomSelected = room.lights.filter((id) => selectedLights.includes(id)).length;
    const allSelected = roomSelected === room.lights.length;

    return (
      <View key={room.id} style={styles.room}>
        <View style={styles.roomHeader}>
          <MaterialCommunityIcons name={room.icon} size={18} color={roomSelected ? ACCENT : MUTED} />
          <Text style={styles.roomName}>{room.name}</Text>
          {roomSelected > 0 && <Text style={styles.roomCount}>{roomSelected} picked</Text>}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => toggleRoom(room)}
            style={[styles.roomToggle, allSelected && styles.roomToggleActive]}
            accessibilityRole="button"
            accessibilityLabel={`${allSelected ? 'Clear' : 'Select all'} ${room.name} lights`}
          >
            <Text style={[styles.roomToggleText, allSelected && styles.roomToggleTextActive]}>
              {allSelected ? 'Clear' : 'Select all'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.lightGrid}>
          {room.lights.map((lightId) => {
            const isSelected = selectedLights.includes(lightId);
            return (
              <TouchableOpacity
                key={lightId}
                style={[styles.lightChip, isSelected && styles.lightChipSelected]}
                onPress={() => toggleLightSelection(lightId)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={lightDisplayNames[lightId] || lightId}
              >
                <View style={[styles.lightIcon, isSelected && styles.lightIconSelected]}>
                  <MaterialCommunityIcons
                    name={getLightIcon(lightId)}
                    size={18}
                    color={isSelected ? '#1B1B1B' : MUTED}
                  />
                </View>
                <Text style={[styles.lightName, isSelected && styles.lightNameSelected]} numberOfLines={2}>
                  {lightDisplayNames[lightId] || lightId}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={ACCENT} style={styles.lightCheck} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close schedule lights"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="calendar-clock" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Schedule Lights</Text>
              <Text style={styles.subtitle}>
                {selectedCount === 0 ? 'Choose a time and the lights to switch' : `${selectedCount} light${selectedCount !== 1 ? 's' : ''} picked`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {renderSchedules()}

            {/* When */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>When</Text>
              <View style={styles.whenCard}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Time ${formatTime(scheduleTime)}, tap to change`}
                >
                  <Text style={styles.timeValue}>{formatTime(scheduleTime)}</Text>
                  <View style={styles.timeEdit}>
                    <MaterialCommunityIcons name="pencil-outline" size={14} color={ACCENT} />
                    <Text style={styles.timeEditText}>Change</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.timeHint}>{describeWait(scheduleTime)}</Text>

                {showTimePicker && (
                  <DateTimePicker
                    value={scheduleTime}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                    themeVariant="dark"
                  />
                )}

                <View style={styles.segmented}>
                  {[
                    { value: 'on', label: 'Turn on', icon: 'lightbulb-on-outline' },
                    { value: 'off', label: 'Turn off', icon: 'lightbulb-off-outline' },
                  ].map((option) => {
                    const active = scheduleAction === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.segment, active && styles.segmentActive]}
                        onPress={() => setScheduleAction(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <MaterialCommunityIcons name={option.icon} size={18} color={active ? '#1B1B1B' : MUTED} />
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.repeatRow}>
                  <MaterialCommunityIcons name="repeat" size={18} color={isRepeating ? ACCENT : MUTED} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.repeatLabel}>Repeat every day</Text>
                    <Text style={styles.repeatHint}>{isRepeating ? 'Runs daily until you delete it' : 'Runs once'}</Text>
                  </View>
                  <Switch
                    value={isRepeating}
                    onValueChange={setIsRepeating}
                    trackColor={{ false: TRACK, true: ACCENT }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* Which lights */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Lights</Text>
                {selectedCount > 0 && (
                  <TouchableOpacity onPress={() => setSelectedLights([])} accessibilityRole="button">
                    <Text style={styles.clearText}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>
              {ROOMS.map(renderRoom)}
            </View>
          </ScrollView>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.createButton, selectedCount === 0 && styles.createButtonDisabled]}
            onPress={handleCreateSchedule}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: selectedCount === 0 }}
          >
            <MaterialCommunityIcons name="calendar-check" size={20} color={selectedCount === 0 ? MUTED : '#1B1B1B'} />
            <Text style={[styles.createButtonText, selectedCount === 0 && styles.createButtonTextDisabled]} numberOfLines={1}>
              {createLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: '#211D1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.15)',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FontFamily.latoBold,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  closeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Shrinks to fit so the create button stays visible under a long list
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    paddingBottom: 8,
  },
  section: {
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
    marginBottom: 10,
  },
  clearText: {
    color: ACCENT,
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
  },

  // Existing schedules
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 6,
    marginBottom: 8,
  },
  scheduleRowPaused: {
    opacity: 0.55,
  },
  scheduleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scheduleIconOn: {
    backgroundColor: ACCENT,
  },
  scheduleIconOff: {
    backgroundColor: TRACK,
  },
  scheduleTime: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
  },
  scheduleMeta: {
    color: MUTED,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
  },
  scheduleLights: {
    color: MUTED,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginTop: 2,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },

  // When
  whenCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.18)',
    padding: 16,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeValue: {
    color: '#FFFFFF',
    fontSize: 44,
    fontFamily: FontFamily.latoLight,
    letterSpacing: 0.5,
  },
  timeEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 178, 103, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeEditText: {
    color: ACCENT,
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
    marginLeft: 4,
  },
  timeHint: {
    color: MUTED,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginBottom: 14,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: TRACK,
    borderRadius: 14,
    padding: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 11,
  },
  segmentActive: {
    backgroundColor: ACCENT,
  },
  segmentText: {
    color: MUTED,
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
    marginLeft: 6,
  },
  segmentTextActive: {
    color: '#1B1B1B',
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  repeatLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
  },
  repeatHint: {
    color: MUTED,
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    marginTop: 1,
  },

  // Lights
  room: {
    marginBottom: 14,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    marginLeft: 8,
  },
  roomCount: {
    color: ACCENT,
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    marginLeft: 8,
  },
  roomToggle: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 178, 103, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roomToggleActive: {
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
  },
  roomToggleText: {
    color: ACCENT,
    fontSize: 13,
    fontFamily: FontFamily.latoBold,
  },
  roomToggleTextActive: {
    color: ACCENT,
  },
  lightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  lightChip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 28,
    minHeight: 56,
  },
  lightChipSelected: {
    backgroundColor: 'rgba(255, 178, 103, 0.12)',
    borderColor: 'rgba(255, 178, 103, 0.6)',
  },
  lightIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TRACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  lightIconSelected: {
    backgroundColor: ACCENT,
  },
  lightName: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
  },
  lightNameSelected: {
    color: '#FFFFFF',
    fontFamily: FontFamily.latoBold,
  },
  lightCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // Create
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonDisabled: {
    backgroundColor: TRACK,
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    color: '#1B1B1B',
    marginLeft: 10,
  },
  createButtonTextDisabled: {
    color: MUTED,
  },
});

export default ScheduleLightsModal;
