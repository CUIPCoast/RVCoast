import { Dimensions, Platform, PixelRatio } from 'react-native';
import deviceDetection from './deviceDetection';

// Base dimensions - iPhone 14 Pro as the design reference (393 x 852)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

class ResponsiveUtils {
  constructor() {
    this.screenWidth = Dimensions.get('window').width;
    this.screenHeight = Dimensions.get('window').height;
    this.isTablet = deviceDetection.isTablet();

    // Calculate scale factors
    this.widthScale = this.screenWidth / BASE_WIDTH;
    this.heightScale = this.screenHeight / BASE_HEIGHT;

    // Use a balanced scale factor for better consistency
    this.scale = Math.min(this.widthScale, this.heightScale);

    console.log('Responsive Utils Initialized:', {
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      isTablet: this.isTablet,
      widthScale: this.widthScale.toFixed(2),
      heightScale: this.heightScale.toFixed(2),
      scale: this.scale.toFixed(2)
    });
  }

  /**
   * Scale width proportionally for mobile devices
   * For tablets, return the original size
   * @param {number} size - The size to scale
   * @returns {number} - Scaled size
   */
  wp(size) {
    if (this.isTablet) return size;

    const scaledSize = this.widthScale * size;
    return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
  }

  /**
   * Scale height proportionally for mobile devices
   * For tablets, return the original size
   * @param {number} size - The size to scale
   * @returns {number} - Scaled size
   */
  hp(size) {
    if (this.isTablet) return size;

    const scaledSize = this.heightScale * size;
    return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
  }

  /**
   * Scale font size proportionally for mobile devices
   * For tablets, return the original size
   * @param {number} size - The font size to scale
   * @returns {number} - Scaled font size
   */
  fs(size) {
    if (this.isTablet) return size;

    const scaledSize = this.scale * size;
    // Ensure minimum font size of 10 for readability
    return Math.max(10, Math.round(PixelRatio.roundToNearestPixel(scaledSize)));
  }

  /**
   * Scale spacing/padding/margin proportionally for mobile devices
   * For tablets, return the original size
   * @param {number} size - The spacing to scale
   * @returns {number} - Scaled spacing
   */
  spacing(size) {
    if (this.isTablet) return size;

    const scaledSize = this.scale * size;
    return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
  }

  /**
   * Moderate scale - uses a factor to control the scale amount
   * Useful for elements that shouldn't scale as aggressively
   * @param {number} size - The size to scale
   * @param {number} factor - Scale factor (0-1, default 0.5)
   * @returns {number} - Moderately scaled size
   */
  ms(size, factor = 0.5) {
    if (this.isTablet) return size;

    const scaledSize = size + (this.scale - 1) * size * factor;
    return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
  }

  /**
   * Get responsive border radius
   * @param {number} size - Border radius size
   * @returns {number} - Scaled border radius
   */
  br(size) {
    if (this.isTablet) return size;

    const scaledSize = this.scale * size;
    return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
  }

  /**
   * Get percentage-based width for mobile devices
   * @param {number} percentage - Percentage of screen width (0-100)
   * @returns {number} - Width in pixels
   */
  percentWidth(percentage) {
    return (this.screenWidth * percentage) / 100;
  }

  /**
   * Get percentage-based height for mobile devices
   * @param {number} percentage - Percentage of screen height (0-100)
   * @returns {number} - Height in pixels
   */
  percentHeight(percentage) {
    return (this.screenHeight * percentage) / 100;
  }

  /**
   * Get responsive icon size
   * @param {string} sizeCategory - 'small', 'medium', 'large', 'xlarge'
   * @returns {number} - Icon size in pixels
   */
  iconSize(sizeCategory = 'medium') {
    const sizes = {
      tiny: 16,
      small: 20,
      medium: 24,
      large: 32,
      xlarge: 48,
      xxlarge: 64
    };

    const baseSize = sizes[sizeCategory] || sizes.medium;
    return this.wp(baseSize);
  }

  /**
   * Get responsive button height
   * @param {string} sizeCategory - 'small', 'medium', 'large'
   * @returns {number} - Button height in pixels
   */
  buttonHeight(sizeCategory = 'medium') {
    const sizes = {
      small: 36,
      medium: 48,
      large: 56
    };

    const baseSize = sizes[sizeCategory] || sizes.medium;
    return this.hp(baseSize);
  }

  /**
   * Check if device is in portrait mode
   * @returns {boolean}
   */
  isPortrait() {
    return this.screenHeight > this.screenWidth;
  }

  /**
   * Check if device is in landscape mode
   * @returns {boolean}
   */
  isLandscape() {
    return this.screenWidth > this.screenHeight;
  }

  /**
   * Get device info
   * @returns {object} - Device information
   */
  getDeviceInfo() {
    return {
      width: this.screenWidth,
      height: this.screenHeight,
      isTablet: this.isTablet,
      platform: Platform.OS,
      scale: this.scale,
      widthScale: this.widthScale,
      heightScale: this.heightScale,
      isPortrait: this.isPortrait(),
      isLandscape: this.isLandscape()
    };
  }
}

// Create singleton instance
const responsiveUtils = new ResponsiveUtils();

// Export individual functions for convenience
export const wp = (size) => responsiveUtils.wp(size);
export const hp = (size) => responsiveUtils.hp(size);
export const fs = (size) => responsiveUtils.fs(size);
export const spacing = (size) => responsiveUtils.spacing(size);
export const ms = (size, factor) => responsiveUtils.ms(size, factor);
export const br = (size) => responsiveUtils.br(size);
export const percentWidth = (percentage) => responsiveUtils.percentWidth(percentage);
export const percentHeight = (percentage) => responsiveUtils.percentHeight(percentage);
export const iconSize = (sizeCategory) => responsiveUtils.iconSize(sizeCategory);
export const buttonHeight = (sizeCategory) => responsiveUtils.buttonHeight(sizeCategory);
export const isTablet = () => responsiveUtils.isTablet;
export const getDeviceInfo = () => responsiveUtils.getDeviceInfo();

export default responsiveUtils;
