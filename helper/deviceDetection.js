import { Dimensions, Platform } from 'react-native';

// Static device detection that doesn't change during runtime
class DeviceDetection {
  constructor() {
    this.deviceType = this.detectDeviceType();
  }

  detectDeviceType() {
    const screenData = Dimensions.get('screen');
    const { width, height } = screenData;
    const shortDimension = Math.min(width, height);
    const longDimension = Math.max(width, height);
    const aspectRatio = longDimension / shortDimension;
    const diagonalInches = Math.sqrt(width * width + height * height) / this.getPixelDensity();

    console.log('Device Detection:', {
      width,
      height,
      shortDimension,
      longDimension,
      aspectRatio: aspectRatio.toFixed(2),
      diagonalInches: diagonalInches.toFixed(1) + '"',
      platform: Platform.OS
    });

    // More comprehensive tablet detection
    if (Platform.OS === 'ios') {
      // iOS tablets (iPad)
      // iPad mini: 768x1024, iPad: 1024x1366, iPad Pro: 1024x1366 and up
      return shortDimension >= 768 || diagonalInches >= 7.0;
    } else if (Platform.OS === 'android') {
      // Android tablets
      // Most 7" tablets have shortDimension >= 600px
      // 10" tablets have shortDimension >= 800px
      return (shortDimension >= 600 && aspectRatio <= 2.0) || diagonalInches >= 7.0;
    }

    // Fallback for other platforms
    return shortDimension >= 600 && aspectRatio <= 2.0;
  }

  getPixelDensity() {
    // Rough pixel density estimates for different platforms
    if (Platform.OS === 'ios') {
      return 163; // iOS default PPI
    } else if (Platform.OS === 'android') {
      return 160; // Android mdpi baseline
    }
    return 160; // Default fallback
  }

  isTablet() {
    return this.deviceType;
  }

  isMobile() {
    return !this.deviceType;
  }

  getDeviceInfo() {
    return {
      isTablet: this.deviceType,
      isMobile: !this.deviceType,
      platform: Platform.OS,
      dimensions: Dimensions.get('screen')
    };
  }
}

// Create singleton instance
const deviceDetection = new DeviceDetection();

export default deviceDetection;