import { useEffect } from "react";
import deviceDetection from "./deviceDetection";

const useScreenSize = () => {
  useEffect(() => {
    // Log device info on first load for debugging
    const deviceInfo = deviceDetection.getDeviceInfo();
    console.log('Device Info:', deviceInfo);
  }, []);

  // Return the static device type that won't change during runtime
  return deviceDetection.isTablet();
};

export default useScreenSize;