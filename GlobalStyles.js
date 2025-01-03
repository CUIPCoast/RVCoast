/* fonts */
export const FontFamily = {
    manropeRegular: "Manrope-Regular",
    manropeMedium: "Manrope-Medium",
    manropeSemiBold: "Manrope-SemiBold",
    manropeBold: "Manrope-Bold",
  };
  /* font sizes */
  export const FontSize = {
    textXSM_size: 12,
    textLMedium_size: 18,
    size_mid: 17,
    size_13xl: 32,
    size_45xl: 64,
    size_19xl: 38,
  };
  /* Colors */
  export const Color = {
    colorGray_100: "#282424",
    colorGray_200: "#211d1d",
    miscellaneousAlertMenuActionSheetSeparators: "rgba(128, 128, 128, 0.55)",
    white0: "#fff",
    colorWhitesmoke_100: "#f8f8f8",
    colorDarkslategray_100: "#464646",
    colorDarkslategray_200: "#393535",
    colorDarkslategray_300: "#242b2f",
    colorSilver: "#bdbdbd",
    colorSandybrown: "#ffb267",
    colorCrimson: "#e5386d",
    colorDarkgray: "#adadad",
    colorsGreen: "#34c759",
  };
  /* Gaps */
  export const Gap = {
    gap_sm: 12,
    gap_md: 73,
    gap_lg: 145,
  };
  /* Paddings */
  export const Padding = {
    p_5xs: 8,
  };
  /* border radiuses */
  export const Border = {
    br_13xl: 32,
    br_81xl: 100,
    br_5xl: 24,
    br_base: 16,
    br_xl: 20,
    br_6xs: 7,
  };


  
  export let isDarkMode = true; // Variable to store the status of the Settings switch
  
  export const toggleTheme = () => {
    isDarkMode = !isDarkMode;
  };
  