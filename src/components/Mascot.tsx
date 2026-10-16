import React from "react";

export type MascotPose = "typing" | "welcome" | "clipboard" | "analyst" | "calibrating";

interface MascotProps {
  pose?: MascotPose;
  className?: string;
  size?: number;
}

/**
 * ParkinTrace Mascot: "Tracey"
 * A friendly, cute neural-cadence companion that makes motor health
 * feel warm, accessible, and comfortable.
 */
export function Mascot({ pose = "typing", className = "", size }: MascotProps) {
  const sizeStyle = size ? { width: size, height: "auto" } : undefined;

  switch (pose) {
    case "welcome":
      return (
        <svg
          viewBox="0 0 200 180"
          className={`select-none ${className}`}
          style={sizeStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Cute mascot companion waving hello"
          role="img"
        >
          {/* Soft ambient shadow */}
          <ellipse cx="100" cy="168" rx="55" ry="8" fill="#183c35" fillOpacity="0.08" />

          {/* Cute Body */}
          <path
            d="M68 165 C62 120 70 85 100 85 C130 85 138 120 132 165 Z"
            fill="#FCFAF6"
            stroke="#183c35"
            strokeWidth="2.5"
          />

          {/* Little belly warmth patch */}
          <ellipse cx="100" cy="135" rx="20" ry="16" fill="#E4EDE4" fillOpacity="0.7" />

          {/* Head */}
          <circle cx="100" cy="65" r="38" fill="#FCFAF6" stroke="#183c35" strokeWidth="2.5" />

          {/* Soft round ears */}
          <circle cx="70" cy="38" r="11" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="70" cy="38" r="6" fill="#f4dbdb" />
          <circle cx="130" cy="38" r="11" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="130" cy="38" r="6" fill="#f4dbdb" />

          {/* Cute round glasses */}
          <circle cx="88" cy="64" r="13" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <circle cx="112" cy="64" r="13" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <line x1="101" y1="64" x2="99" y2="64" stroke="#183c35" strokeWidth="2" />

          {/* Big happy sparkling eyes */}
          <circle cx="89" cy="64" r="4" fill="#183c35" />
          <circle cx="91" cy="62.5" r="1.5" fill="#ffffff" />
          <circle cx="111" cy="64" r="4" fill="#183c35" />
          <circle cx="113" cy="62.5" r="1.5" fill="#ffffff" />

          {/* Rosy blushing cheeks */}
          <ellipse cx="78" cy="72" rx="4.5" ry="2.5" fill="#f7b7b7" />
          <ellipse cx="122" cy="72" rx="4.5" ry="2.5" fill="#f7b7b7" />

          {/* Cheerful warm smile */}
          <path d="M96 73 Q100 78 104 73" stroke="#183c35" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Left paw resting gently */}
          <path d="M72 115 C66 128 72 142 80 144" stroke="#183c35" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="80" cy="144" r="4" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />

          {/* Right arm actively waving hello! */}
          <path d="M128 112 C142 100 156 80 150 65" stroke="#183c35" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="150" cy="65" r="5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />
          {/* Friendly wave motion breeze */}
          <path d="M158 55 Q164 59 158 64" stroke="#0e7c66" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M164 62 Q170 66 164 71" stroke="#0e7c66" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Security badge ribbon */}
          <g transform="translate(100, 118)">
            <circle cx="0" cy="0" r="8" fill="#002620" />
            <path d="M-3 0 L-1 2 L3 -2" stroke="#caead7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        </svg>
      );

    case "clipboard":
      return (
        <svg
          viewBox="0 0 200 180"
          className={`select-none ${className}`}
          style={sizeStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Cute mascot companion reviewing research consent"
          role="img"
        >
          {/* Shadow */}
          <ellipse cx="100" cy="168" rx="55" ry="8" fill="#183c35" fillOpacity="0.08" />

          {/* Body */}
          <path
            d="M68 165 C62 120 70 85 100 85 C130 85 138 120 132 165 Z"
            fill="#FCFAF6"
            stroke="#183c35"
            strokeWidth="2.5"
          />

          {/* Head with tilted thoughtful curiosity */}
          <circle cx="100" cy="62" r="38" fill="#FCFAF6" stroke="#183c35" strokeWidth="2.5" />

          {/* Round ears */}
          <circle cx="70" cy="35" r="11" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="70" cy="35" r="6" fill="#f4dbdb" />
          <circle cx="130" cy="35" r="11" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="130" cy="35" r="6" fill="#f4dbdb" />

          {/* Glasses */}
          <circle cx="88" cy="62" r="13" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <circle cx="112" cy="62" r="13" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <line x1="101" y1="62" x2="99" y2="62" stroke="#183c35" strokeWidth="2" />

          {/* Warm caring eyes looking toward clipboard */}
          <circle cx="89" cy="63" r="4" fill="#183c35" />
          <circle cx="91" cy="61.5" r="1.5" fill="#ffffff" />
          <circle cx="111" cy="63" r="4" fill="#183c35" />
          <circle cx="113" cy="61.5" r="1.5" fill="#ffffff" />

          {/* Soft rosy cheeks */}
          <ellipse cx="78" cy="70" rx="4.5" ry="2.5" fill="#f7b7b7" />
          <ellipse cx="122" cy="70" rx="4.5" ry="2.5" fill="#f7b7b7" />

          {/* Reassuring gentle smile */}
          <path d="M96 71 Q100 76 104 71" stroke="#183c35" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Clipboard held carefully in front */}
          <rect x="74" y="98" width="52" height="66" rx="4" fill="#ffffff" stroke="#183c35" strokeWidth="2" />
          {/* Clipboard gold clip */}
          <rect x="88" y="93" width="24" height="8" rx="2" fill="#e0c38d" stroke="#183c35" strokeWidth="1.5" />
          {/* Checked items on consent sheet */}
          <line x1="84" y1="112" x2="116" y2="112" stroke="#0e7c66" strokeWidth="2" strokeLinecap="round" />
          <line x1="84" y1="122" x2="112" y2="122" stroke="#183c35" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="84" y1="132" x2="114" y2="132" stroke="#183c35" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="84" y1="142" x2="104" y2="142" stroke="#183c35" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          {/* Green checkmark */}
          <circle cx="114" cy="148" r="6" fill="#caead7" />
          <path d="M112 148 L113.5 150 L116.5 146" stroke="#0e7c66" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Arms holding the clipboard */}
          <path d="M68 120 Q70 135 76 138" stroke="#183c35" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="76" cy="138" r="4.5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />
          <path d="M132 120 Q130 135 124 138" stroke="#183c35" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="124" cy="138" r="4.5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />
        </svg>
      );

    case "analyst":
      return (
        <svg
          viewBox="0 0 200 180"
          className={`select-none ${className}`}
          style={sizeStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Cute mascot companion reviewing clinical motor charts"
          role="img"
        >
          {/* Shadow */}
          <ellipse cx="100" cy="168" rx="55" ry="8" fill="#183c35" fillOpacity="0.08" />

          {/* Body in clinical vest / coat */}
          <path
            d="M68 165 C62 120 70 85 100 85 C130 85 138 120 132 165 Z"
            fill="#ffffff"
            stroke="#183c35"
            strokeWidth="2.5"
          />
          {/* Stethoscope neck curve */}
          <path d="M84 92 C82 118 118 118 116 92" stroke="#0e7c66" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="100" cy="122" r="5" fill="#e0c38d" stroke="#183c35" strokeWidth="1.5" />

          {/* Head */}
          <circle cx="100" cy="62" r="38" fill="#FCFAF6" stroke="#183c35" strokeWidth="2.5" />

          {/* Ears */}
          <circle cx="70" cy="35" r="11" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="70" cy="35" r="6" fill="#f4dbdb" />
          <circle cx="130" cy="35" r="11" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="130" cy="35" r="6" fill="#f4dbdb" />

          {/* Glasses */}
          <circle cx="88" cy="62" r="13" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <circle cx="112" cy="62" r="13" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <line x1="101" y1="62" x2="99" y2="62" stroke="#183c35" strokeWidth="2" />

          {/* Confident, friendly eyes */}
          <circle cx="89" cy="62" r="4" fill="#183c35" />
          <circle cx="91" cy="60.5" r="1.5" fill="#ffffff" />
          <circle cx="111" cy="62" r="4" fill="#183c35" />
          <circle cx="113" cy="60.5" r="1.5" fill="#ffffff" />

          {/* Rosy cheeks */}
          <ellipse cx="78" cy="70" rx="4.5" ry="2.5" fill="#f7b7b7" />
          <ellipse cx="122" cy="70" rx="4.5" ry="2.5" fill="#f7b7b7" />

          {/* Gentle proud smile */}
          <path d="M96 71 Q100 76 104 71" stroke="#183c35" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Holding rhythm monitor tablet */}
          <rect x="76" y="132" width="48" height="32" rx="4" fill="#002620" stroke="#183c35" strokeWidth="2" />
          {/* Healthy pulse waveform on tablet */}
          <path
            d="M82 148 L90 148 L93 140 L97 154 L101 144 L104 148 L118 148"
            stroke="#5cdbb5"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Paws on tablet */}
          <circle cx="76" cy="148" r="4.5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />
          <circle cx="124" cy="148" r="4.5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />
        </svg>
      );

    case "calibrating":
      return (
        <svg
          viewBox="0 0 200 180"
          className={`select-none ${className}`}
          style={sizeStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Cute mascot companion inspecting motor stability"
          role="img"
        >
          {/* Shadow */}
          <ellipse cx="100" cy="168" rx="55" ry="8" fill="#183c35" fillOpacity="0.08" />

          {/* Body */}
          <path
            d="M68 165 C62 120 70 85 100 85 C130 85 138 120 132 165 Z"
            fill="#FCFAF6"
            stroke="#183c35"
            strokeWidth="2.5"
          />

          {/* Head */}
          <circle cx="100" cy="62" r="38" fill="#FCFAF6" stroke="#183c35" strokeWidth="2.5" />

          {/* Ears */}
          <circle cx="70" cy="35" r="11" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="70" cy="35" r="6" fill="#f4dbdb" />
          <circle cx="130" cy="35" r="11" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="130" cy="35" r="6" fill="#f4dbdb" />

          {/* Glasses */}
          <circle cx="88" cy="62" r="13" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <circle cx="112" cy="62" r="13" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <line x1="101" y1="62" x2="99" y2="62" stroke="#183c35" strokeWidth="2" />

          {/* Focused, warm eyes */}
          <circle cx="89" cy="62" r="4" fill="#183c35" />
          <circle cx="91" cy="60.5" r="1.5" fill="#ffffff" />
          <circle cx="111" cy="62" r="4" fill="#183c35" />
          <circle cx="113" cy="60.5" r="1.5" fill="#ffffff" />

          {/* Rosy cheeks */}
          <ellipse cx="78" cy="70" rx="4.5" ry="2.5" fill="#f7b7b7" />
          <ellipse cx="122" cy="70" rx="4.5" ry="2.5" fill="#f7b7b7" />

          {/* Soft smile */}
          <path d="M96 71 Q100 76 104 71" stroke="#183c35" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Holding stopwatch / timer badge */}
          <circle cx="100" cy="130" r="18" fill="#ffffff" stroke="#183c35" strokeWidth="2" />
          <rect x="97" y="108" width="6" height="5" rx="1" fill="#183c35" />
          <circle cx="100" cy="130" r="14" fill="#caead7" fillOpacity="0.4" />
          <path d="M100 130 L100 120" stroke="#0e7c66" strokeWidth="2" strokeLinecap="round" />
          <path d="M100 130 L107 130" stroke="#0e7c66" strokeWidth="1.8" strokeLinecap="round" />

          {/* Paws holding the stopwatch */}
          <circle cx="82" cy="132" r="4.5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />
          <circle cx="118" cy="132" r="4.5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />
        </svg>
      );

    case "typing":
    default:
      return (
        <svg
          viewBox="0 0 320 220"
          className={`select-none ${className}`}
          style={sizeStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Cute mascot companion typing on a laptop"
          role="img"
        >
          {/* Desk surface */}
          <line x1="20" y1="195" x2="300" y2="195" stroke="#183c35" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="45" y1="195" x2="40" y2="215" stroke="#183c35" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
          <line x1="275" y1="195" x2="280" y2="215" stroke="#183c35" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />

          {/* Cozy warm mug on desk with steam */}
          <rect x="42" y="168" width="16" height="26" rx="4" fill="#caead7" stroke="#183c35" strokeWidth="2" />
          <path d="M58 175 C64 175, 64 187, 58 187" stroke="#183c35" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M47 160 Q50 156 52 160 Q54 164 56 160" stroke="#0e7c66" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" fill="none" />

          {/* Cute potted mini plant on desk */}
          <polygon points="266,195 284,195 281,180 269,180" fill="#e0c38d" stroke="#183c35" strokeWidth="1.5" />
          <path d="M275 180 Q270 170 268 173 Q272 178 275 180" fill="#caead7" stroke="#0e7c66" strokeWidth="1.2" />
          <path d="M275 180 Q280 168 282 172 Q278 177 275 180" fill="#caead7" stroke="#0e7c66" strokeWidth="1.2" />

          {/* Mascot Body */}
          <path
            d="M125 195 C118 150 124 106 160 106 C196 106 202 150 195 195 Z"
            fill="#FCFAF6"
            stroke="#183c35"
            strokeWidth="2.5"
          />

          {/* Mascot Head */}
          <circle cx="160" cy="80" r="42" fill="#FCFAF6" stroke="#183c35" strokeWidth="2.5" />

          {/* Cute round ears */}
          <circle cx="127" cy="48" r="12" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="127" cy="48" r="7" fill="#f4dbdb" />
          <circle cx="193" cy="48" r="12" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <circle cx="193" cy="48" r="7" fill="#f4dbdb" />

          {/* Cute spectacles */}
          <circle cx="147" cy="79" r="14" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <circle cx="173" cy="79" r="14" fill="#E4EDE4" fillOpacity="0.45" stroke="#183c35" strokeWidth="2" />
          <line x1="161" y1="79" x2="159" y2="79" stroke="#183c35" strokeWidth="2" />
          <line x1="133" y1="77" x2="123" y2="75" stroke="#183c35" strokeWidth="2" />
          <line x1="187" y1="77" x2="197" y2="75" stroke="#183c35" strokeWidth="2" />

          {/* Big bright friendly eyes */}
          <circle cx="148" cy="79" r="4" fill="#183c35" />
          <circle cx="150" cy="77" r="1.6" fill="#ffffff" />
          <circle cx="172" cy="79" r="4" fill="#183c35" />
          <circle cx="174" cy="77" r="1.6" fill="#ffffff" />

          {/* Gentle happy smile */}
          <path d="M156 91 Q160 96 164 91" stroke="#183c35" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Rosy blush cheeks */}
          <ellipse cx="135" cy="87" rx="5" ry="3" fill="#f7b7b7" />
          <ellipse cx="185" cy="87" rx="5" ry="3" fill="#f7b7b7" />

          {/* Laptop Base */}
          <path d="M110 192 L210 192 L202 181 L118 181 Z" fill="#E4EDE4" stroke="#183c35" strokeWidth="2" />
          <rect x="150" y="184" width="20" height="5" rx="1" fill="#FCFAF6" stroke="#183c35" strokeWidth="1" />

          {/* Laptop Screen */}
          <path d="M122 181 L132 120 L188 120 L198 181 Z" fill="#ffffff" stroke="#183c35" strokeWidth="2" />
          <path d="M136 128 L184 128 L180 173 L140 173 Z" fill="#002620" />
          {/* Keystroke rhythm waveform on screen */}
          <path
            d="M144 151 Q148 141, 152 151 T160 151 T168 151 T176 151"
            stroke="#5cdbb5"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Arms & paws actively typing with rhythmic motion */}
          <path d="M134 136 C128 156, 136 175, 146 179" stroke="#183c35" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="146" cy="179" r="5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />

          <path d="M186 136 C192 156, 184 175, 174 179" stroke="#183c35" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="174" cy="179" r="5" fill="#FCFAF6" stroke="#183c35" strokeWidth="2" />

          {/* Rhythm tap markers */}
          <path d="M126 169 Q121 165 116 169" stroke="#0e7c66" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M194 169 Q199 165 204 169" stroke="#0e7c66" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Sub-second micro-interval badge */}
          <g opacity="0.95">
            <rect x="206" y="66" width="50" height="24" rx="12" fill="#002620" stroke="#0e7c66" strokeWidth="1" />
            <text x="215" y="82" fontFamily="system-ui, sans-serif" fontSize="10.5" fontWeight="bold" fill="#caead7">
              ⚡ 76ms
            </text>
          </g>
        </svg>
      );
  }
}
