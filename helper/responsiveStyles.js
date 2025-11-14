import { FontFamily, FontSize, Color, Border, Gap, Padding } from '../GlobalStyles';
import { wp, hp, fs, spacing, br } from './responsiveUtils';

/**
 * Responsive font sizes for mobile devices
 * Tablets will use the original FontSize values
 */
export const ResponsiveFontSize = {
  textXSM_size: fs(FontSize.textXSM_size), // 12
  textLMedium_size: fs(FontSize.textLMedium_size), // 18
  size_mid: fs(FontSize.size_mid), // 17
  size_13xl: fs(FontSize.size_13xl), // 32
  size_45xl: fs(FontSize.size_45xl), // 64
  size_19xl: fs(FontSize.size_19xl), // 38

  // Additional common font sizes
  size_xs: fs(10),
  size_sm: fs(12),
  size_base: fs(14),
  size_md: fs(16),
  size_lg: fs(18),
  size_xl: fs(20),
  size_2xl: fs(24),
  size_3xl: fs(28),
  size_4xl: fs(32),
  size_5xl: fs(36),
};

/**
 * Responsive border radii for mobile devices
 * Tablets will use the original Border values
 */
export const ResponsiveBorder = {
  br_13xl: br(Border.br_13xl), // 32
  br_81xl: br(Border.br_81xl), // 100
  br_5xl: br(Border.br_5xl), // 24
  br_base: br(Border.br_base), // 16
  br_xl: br(Border.br_xl), // 20
  br_6xs: br(Border.br_6xs), // 7

  // Additional common border radii
  br_xs: br(4),
  br_sm: br(6),
  br_md: br(8),
  br_lg: br(12),
  br_2xl: br(16),
  br_3xl: br(20),
  br_4xl: br(24),
  br_full: 9999, // For circular elements
};

/**
 * Responsive gaps for mobile devices
 * Tablets will use the original Gap values
 */
export const ResponsiveGap = {
  gap_sm: spacing(Gap.gap_sm), // 12
  gap_md: spacing(Gap.gap_md), // 73
  gap_lg: spacing(Gap.gap_lg), // 145

  // Additional common gaps
  gap_xs: spacing(4),
  gap_2xs: spacing(8),
  gap_base: spacing(16),
  gap_xl: spacing(20),
  gap_2xl: spacing(24),
  gap_3xl: spacing(32),
};

/**
 * Responsive padding for mobile devices
 * Tablets will use the original Padding values
 */
export const ResponsivePadding = {
  p_5xs: spacing(Padding.p_5xs), // 8

  // Additional common paddings
  p_xs: spacing(4),
  p_sm: spacing(8),
  p_base: spacing(12),
  p_md: spacing(16),
  p_lg: spacing(20),
  p_xl: spacing(24),
  p_2xl: spacing(32),
  p_3xl: spacing(40),
};

/**
 * Common responsive dimensions
 */
export const ResponsiveDimensions = {
  // Button heights
  buttonSmall: hp(36),
  buttonMedium: hp(48),
  buttonLarge: hp(56),

  // Icon sizes
  iconTiny: wp(16),
  iconSmall: wp(20),
  iconMedium: wp(24),
  iconLarge: wp(32),
  iconXLarge: wp(48),
  iconXXLarge: wp(64),

  // Common heights
  headerHeight: hp(60),
  tabBarHeight: hp(65),
  inputHeight: hp(48),
  cardHeight: hp(120),

  // Common widths
  cardWidth: wp(160),
  buttonWidth: wp(120),

  // Spacing
  screenPaddingHorizontal: wp(20),
  screenPaddingVertical: hp(20),
  sectionSpacing: hp(24),
};

/**
 * Responsive layout helpers
 */
export const ResponsiveLayout = {
  // Container styles
  container: {
    paddingHorizontal: ResponsivePadding.p_md,
    paddingVertical: ResponsivePadding.p_md,
  },

  // Card styles
  card: {
    borderRadius: ResponsiveBorder.br_base,
    padding: ResponsivePadding.p_md,
  },

  // Button styles
  button: {
    height: ResponsiveDimensions.buttonMedium,
    borderRadius: ResponsiveBorder.br_md,
    paddingHorizontal: ResponsivePadding.p_lg,
  },

  // Text styles
  heading1: {
    fontSize: ResponsiveFontSize.size_4xl,
    fontFamily: FontFamily.latoBold,
  },

  heading2: {
    fontSize: ResponsiveFontSize.size_3xl,
    fontFamily: FontFamily.latoBold,
  },

  heading3: {
    fontSize: ResponsiveFontSize.size_2xl,
    fontFamily: FontFamily.latoBold,
  },

  bodyLarge: {
    fontSize: ResponsiveFontSize.size_lg,
    fontFamily: FontFamily.latoRegular,
  },

  bodyMedium: {
    fontSize: ResponsiveFontSize.size_base,
    fontFamily: FontFamily.latoRegular,
  },

  bodySmall: {
    fontSize: ResponsiveFontSize.size_sm,
    fontFamily: FontFamily.latoRegular,
  },

  caption: {
    fontSize: ResponsiveFontSize.size_xs,
    fontFamily: FontFamily.latoLight,
  },
};

// Export everything for easy access
export default {
  FontSize: ResponsiveFontSize,
  Border: ResponsiveBorder,
  Gap: ResponsiveGap,
  Padding: ResponsivePadding,
  Dimensions: ResponsiveDimensions,
  Layout: ResponsiveLayout,
  // Re-export non-responsive values
  FontFamily,
  Color,
};
