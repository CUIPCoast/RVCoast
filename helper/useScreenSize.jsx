import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

const useScreenSize = () => {
  const [isTablet, setIsTablet] = useState(Dimensions.get("window").height <= 850);

  useEffect(() => {
    const onChange = ({ window }) => {
      setIsTablet(window.height);
    };

    const subscription = Dimensions.addEventListener("change", onChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  return isTablet;
};

export default useScreenSize;