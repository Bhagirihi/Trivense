import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

const BalloonIllustration = ({
  width = 200,
  height = 200,
  color = "#FFFFFF",
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      {/* Hot Air Balloon */}
      <Path
        d="M100 20C65 20 40 45 40 80C40 115 70 140 100 160C130 140 160 115 160 80C160 45 135 20 100 20Z"
        fill={color}
        opacity={0.9}
      />
      {/* Basket */}
      <Path d="M85 160H115V180H85V160Z" fill={color} opacity={0.9} />
      {/* Clouds */}
      <Circle cx="40" cy="100" r="15" fill={color} opacity={0.5} />
      <Circle cx="160" cy="110" r="20" fill={color} opacity={0.5} />
      <Circle cx="25" cy="120" r="10" fill={color} opacity={0.5} />
      <Circle cx="175" cy="90" r="12" fill={color} opacity={0.5} />
    </Svg>
  );
};

export default BalloonIllustration;
