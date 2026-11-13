import React from "react";
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from "react-native-svg";

/**
 * Settlement SVG icon kit — Kinetic Financial Neo-System.
 * Source: trivense_asset_bundle_specification.md (paths verbatim where given).
 * react-native-svg is installed (15.12.1). Gradient IDs are unique per
 * component so multiple icons on one screen never collide.
 */

export function UpiLightningIcon({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L4.5 13.5H11.5L10 22L19.5 10.5H12.5L13 2Z"
        fill="url(#kinetic-upi-grad)"
        stroke="#EA580C"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Defs>
        <LinearGradient
          id="kinetic-upi-grad"
          x1="4.5"
          y1="2"
          x2="19.5"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor="#FB923C" />
          <Stop offset="100%" stopColor="#EA580C" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

export function WhatsAppNudgeIcon({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12C2 13.818 2.485 15.522 3.329 17L2 22L7.153 20.697C8.618 21.523 10.267 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM8 10C8 9.448 8.448 9 9 9H15C15.552 9 16 9.448 16 10C16 10.552 15.552 11 15 11H9C8.448 11 8 10.552 8 10ZM8 14C8 13.448 8.448 13 9 13H13C13.552 13 14 13.448 14 14C14 14.552 13.552 15 13 15H9C8.448 15 8 14.552 8 14Z"
        fill="url(#kinetic-wa-grad)"
      />
      <Defs>
        <LinearGradient
          id="kinetic-wa-grad"
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor="#25D366" />
          <Stop offset="100%" stopColor="#128C7E" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

/** Greedy AI sparkle — 3-tier sparkle fill (#0284C7 / #38BDF8). */
export function AiSparkleIcon({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"
        fill="#38BDF8"
      />
      <Path
        d="M18.5 15.5L19.6 18.4L22.5 19.5L19.6 20.6L18.5 23.5L17.4 20.6L14.5 19.5L17.4 18.4L18.5 15.5Z"
        fill="#0284C7"
      />
    </Svg>
  );
}

/** Double checkmark — "Mark Received as Cash" (#16A34A, 2.5px rounded stroke). */
export function CashDoubleCheckIcon({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1.5 12.5L5.5 16.5L10.5 11"
        stroke="#16A34A"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 12.5L12.5 16.5L21.5 7.5"
        stroke="#16A34A"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** OCR receipt scanner — navy corners + coral scan dash. */
export function OcrScannerIcon({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 8V5.5C3 4.1 4.1 3 5.5 3H8"
        stroke="#003D66"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M16 3H18.5C19.9 3 21 4.1 21 5.5V8"
        stroke="#003D66"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M21 16V18.5C21 19.9 19.9 21 18.5 21H16"
        stroke="#003D66"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M8 21H5.5C4.1 21 3 19.9 3 18.5V16"
        stroke="#003D66"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Rect x="5" y="11" width="14" height="2" rx="1" fill="#F97316" />
    </Svg>
  );
}
