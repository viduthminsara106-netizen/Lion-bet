// High-definition embedded SVG Data URI assets for Lion Bet Official Logo & All Casino Game Covers.
// Embedded directly in the bundle so they load instantaneously on every device (PC, mobile, ais-dev, ais-pre)
// with zero broken links or external host dependencies.

function svgToDataUri(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

/**
 * Official Lion Bet Brand Emblem Logo (Golden Crowned Roaring Lion Shield)
 */
export const LION_BET_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <radialGradient id="lbBg" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="55%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="lbGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="35%" stop-color="#facc15"/>
      <stop offset="70%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
    <linearGradient id="lbGoldBright" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#fde047"/>
      <stop offset="70%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="lbCrimson" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="50%" stop-color="#991b1b"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </linearGradient>
    <linearGradient id="lbEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#065f46"/>
    </linearGradient>
    <filter id="lbGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#f59e0b" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Outer Rounded Casino Emblem Frame -->
  <rect width="240" height="240" rx="44" fill="url(#lbBg)"/>
  <rect x="6" y="6" width="228" height="228" rx="39" fill="none" stroke="url(#lbGold)" stroke-width="5"/>
  <rect x="13" y="13" width="214" height="214" rx="33" fill="none" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="1.5"/>

  <!-- Ambient Golden Aura -->
  <circle cx="120" cy="108" r="78" fill="#f59e0b" fill-opacity="0.14"/>

  <!-- Royal Shield Backdrop -->
  <path d="M120 26 L192 54 L182 142 C175 178 148 202 120 214 C92 202 65 178 58 142 L48 54 Z" fill="url(#lbCrimson)" stroke="url(#lbGold)" stroke-width="4.5" filter="url(#lbGlow)"/>
  <path d="M120 35 L182 59 L173 138 C167 169 144 190 120 201 C96 190 73 169 67 138 L58 59 Z" fill="none" stroke="#fef08a" stroke-opacity="0.4" stroke-width="1.5"/>

  <!-- Royal 5-Pointed Crown with Emerald & Ruby Gems -->
  <g transform="translate(0, -2)">
    <path d="M78 68 L68 38 L96 52 L120 26 L144 52 L172 38 L162 68 Z" fill="url(#lbGoldBright)" stroke="#78350f" stroke-width="2"/>
    <rect x="76" y="66" width="88" height="9" rx="4" fill="url(#lbGold)" stroke="#78350f" stroke-width="1.5"/>
    <circle cx="120" cy="24" r="4.5" fill="#fef08a"/>
    <circle cx="68" cy="36" r="3.5" fill="#fef08a"/>
    <circle cx="172" cy="36" r="3.5" fill="#fef08a"/>
    <circle cx="120" cy="54" r="4.5" fill="url(#lbEmerald)"/>
    <circle cx="96" cy="58" r="3.2" fill="#ef4444"/>
    <circle cx="144" cy="58" r="3.2" fill="#ef4444"/>
  </g>

  <!-- Majestic Golden Lion Mane & Fierce Face -->
  <g>
    <!-- Outer Mane Spikes -->
    <path d="M120 68 L148 73 L170 90 L176 116 L166 144 L148 164 L120 176 L92 164 L74 144 L64 116 L70 90 L92 73 Z" fill="url(#lbGold)" stroke="#78350f" stroke-width="2.5"/>
    <!-- Inner Mane Layers -->
    <path d="M120 75 L143 80 L158 96 L162 118 L152 140 L137 155 L120 164 L103 155 L88 140 L78 118 L82 96 L97 80 Z" fill="#b45309"/>
    <!-- Lion Head Faceplate -->
    <path d="M120 82 L144 90 L150 114 L142 138 L120 152 L98 138 L90 114 L96 90 Z" fill="url(#lbGoldBright)" stroke="#78350f" stroke-width="2"/>
    <!-- Fierce Brow & Glowing Emerald Eyes -->
    <path d="M95 102 L114 109 L112 115 L94 109 Z" fill="#451a03"/>
    <path d="M145 102 L126 109 L128 115 L146 109 Z" fill="#451a03"/>
    <polygon points="99,108 111,111 108,116 97,113" fill="#10b981"/>
    <polygon points="141,108 129,111 132,116 143,113" fill="#10b981"/>
    <circle cx="104" cy="112" r="1.8" fill="#ffffff"/>
    <circle cx="136" cy="112" r="1.8" fill="#ffffff"/>
    <!-- Nose & Muzzle -->
    <polygon points="112,122 128,122 120,132" fill="#78350f"/>
    <path d="M120 132 L108 141 M120 132 L132 141" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
    <!-- Roaring Fangs -->
    <polygon points="109,139 113,139 111,146" fill="#ffffff"/>
    <polygon points="131,139 127,139 129,146" fill="#ffffff"/>
  </g>

  <!-- Bottom Ribbon Banner with LION BET Typography -->
  <g transform="translate(0, 4)">
    <path d="M28 176 L212 176 L202 212 L38 212 Z" fill="#020617" stroke="url(#lbGold)" stroke-width="3.5"/>
    <text x="120" y="201" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="25" font-weight="900" fill="url(#lbGoldBright)" letter-spacing="2">LION BET</text>
  </g>
</svg>
`;

/**
 * Balloon Crash Game Card Cover Art (Exploding Red/Yellow/Blue Hot Air Balloon,
 * Red-and-White Striped Parachute Skydiver, Glowing Golden Circle & 3D BALLOON CRASH Typography)
 */
export const BALLOON_CRASH_COVER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520">
  <defs>
    <!-- Deep Navy-Black Outer Background -->
    <radialGradient id="bcOuterBg" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#0d1527"/>
      <stop offset="55%" stop-color="#060a14"/>
      <stop offset="100%" stop-color="#020409"/>
    </radialGradient>

    <!-- Bright Blue Sky Inside Golden Circle -->
    <linearGradient id="bcSkyBlue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0369a1"/>
      <stop offset="45%" stop-color="#0ea5e9"/>
      <stop offset="78%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#fde68a"/>
    </linearGradient>

    <!-- Glowing Golden Circle Ring -->
    <linearGradient id="bcGoldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="22%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="78%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </linearGradient>

    <!-- Balloon Vertical Stripes: Blue, Red, Yellow -->
    <linearGradient id="stripeBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="45%" stop-color="#2563eb"/>
      <stop offset="85%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>

    <linearGradient id="stripeRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b6b"/>
      <stop offset="40%" stop-color="#ef4444"/>
      <stop offset="80%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </linearGradient>

    <linearGradient id="stripeYellow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#fef08a"/>
      <stop offset="65%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>

    <!-- 3D BALLOON Gold Text Gradient -->
    <linearGradient id="balloonTextGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="20%" stop-color="#fef08a"/>
      <stop offset="55%" stop-color="#facc15"/>
      <stop offset="85%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>

    <!-- CRASH Red Brush Gradient -->
    <linearGradient id="crashTextRed" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff4d4d"/>
      <stop offset="50%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>

    <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#f59e0b" flood-opacity="0.75"/>
    </filter>

    <filter id="heavy3DShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#000000" flood-opacity="0.95"/>
    </filter>

    <clipPath id="innerSkyClip">
      <circle cx="200" cy="222" r="146"/>
    </clipPath>
  </defs>

  <!-- Deep Navy-Black Background -->
  <rect width="400" height="520" fill="url(#bcOuterBg)"/>

  <!-- Subtle Outer Golden Sparks -->
  <g fill="#fde047" opacity="0.55">
    <circle cx="38" cy="64" r="2"/>
    <circle cx="358" cy="70" r="2.2"/>
    <circle cx="30" cy="340" r="1.8"/>
    <circle cx="368" cy="330" r="2.2"/>
  </g>

  <!-- GLOWING GOLDEN CIRCLE RING -->
  <g filter="url(#ringGlow)">
    <circle cx="200" cy="222" r="156" fill="url(#bcGoldRing)"/>
    <circle cx="200" cy="222" r="149" fill="#090d16"/>
  </g>

  <!-- INSIDE GOLDEN CIRCLE: BLUE SKY & GOLDEN CLOUDS -->
  <g clip-path="url(#innerSkyClip)">
    <circle cx="200" cy="222" r="146" fill="url(#bcSkyBlue)"/>

    <!-- Warm Sunset Glow at Bottom of Circle -->
    <ellipse cx="200" cy="335" rx="140" ry="55" fill="#f59e0b" opacity="0.55"/>

    <!-- Fluffy Golden-White Clouds Inside Bottom Rim -->
    <g fill="#fde68a" opacity="0.9">
      <circle cx="90" cy="332" r="42"/>
      <circle cx="145" cy="342" r="48"/>
      <circle cx="215" cy="345" r="50"/>
      <circle cx="275" cy="335" r="44"/>
      <circle cx="325" cy="322" r="38"/>
    </g>
    <g fill="#ffffff" opacity="0.95">
      <circle cx="85" cy="340" r="34"/>
      <circle cx="138" cy="348" r="40"/>
      <circle cx="205" cy="350" r="42"/>
      <circle cx="268" cy="342" r="36"/>
      <circle cx="318" cy="332" r="30"/>
    </g>
  </g>

  <!-- Inner Golden Ring Rim Highlight -->
  <circle cx="200" cy="222" r="146" fill="none" stroke="url(#bcGoldRing)" stroke-width="4.5"/>

  <!-- EXPLOSION FIREBURST BEHIND & RIGHT OF BALLOON -->
  <g transform="translate(222, 146)">
    <!-- Dark Smoke Clouds -->
    <circle cx="-10" cy="-28" r="28" fill="#334155" opacity="0.85"/>
    <circle cx="24" cy="-22" r="24" fill="#475569" opacity="0.8"/>
    <circle cx="32" cy="12" r="22" fill="#334155" opacity="0.75"/>

    <!-- Outer Orange Jagged Blast -->
    <polygon
      points="0,-68 18,-28 58,-46 34,-8 72,14 28,22 48,58 8,34 -14,66 -20,26 -58,36 -30,4 -60,-22 -22,-22 -32,-58 -4,-30"
      fill="#f97316"
      stroke="#fde047"
      stroke-width="2"
    />
    <!-- Mid Yellow Blast -->
    <polygon
      points="0,-48 12,-20 42,-32 22,-4 50,10 20,16 32,40 5,22 -10,46 -14,18 -40,24 -20,2 -40,-16 -14,-16 -22,-40 -2,-20"
      fill="#facc15"
    />
    <!-- Core White-Hot Flash -->
    <polygon
      points="0,-28 8,-12 24,-18 13,-2 28,6 11,10 18,22 3,12 -6,26 -8,10 -24,14 -12,1 -24,-9 -8,-9 -12,-22 -1,-11"
      fill="#ffffff"
    />

    <!-- Flying Triangular Balloon Debris Shards (Red, Blue, Yellow) -->
    <polygon points="48,-52 68,-62 58,-38" fill="#ef4444" stroke="#7f1d1d" stroke-width="1"/>
    <polygon points="72,-12 92,-4 76,10" fill="#2563eb" stroke="#1e3a8a" stroke-width="1"/>
    <polygon points="34,-72 48,-88 52,-66" fill="#eab308" stroke="#713f12" stroke-width="1"/>
    <polygon points="62,28 82,38 66,48" fill="#ef4444"/>
    <polygon points="16,-78 28,-92 30,-74" fill="#2563eb"/>
    <circle cx="76" cy="-32" r="4" fill="#fef08a"/>
    <circle cx="58" cy="18" r="3.5" fill="#fde047"/>
  </g>

  <!-- GIANT 3D HOT AIR BALLOON (BREAKING OUT OF TOP-LEFT OF GOLDEN CIRCLE) -->
  <g transform="translate(148, 162)" filter="url(#heavy3DShadow)">
    <!-- Far-Left Royal Blue Gore -->
    <path d="M -86 -22 C -86 -82, -46 -118, 0 -118 C -36 -118, -66 -78, -66 -20 C -66 28, -42 66, -22 90 L -32 90 C -58 64, -86 26, -86 -22 Z" fill="url(#stripeBlue)"/>

    <!-- Mid-Left Crimson Red Gore -->
    <path d="M -66 -20 C -66 -78, -36 -118, 0 -118 C -18 -118, -34 -78, -34 -20 C -34 28, -22 66, -10 90 L -22 90 C -42 66, -66 28, -66 -20 Z" fill="url(#stripeRed)"/>

    <!-- Center Golden Yellow Gore -->
    <path d="M -34 -20 C -34 -78, -18 -118, 0 -118 C 18 -118, 34 -78, 34 -20 C 34 28, 22 66, 10 90 L -10 90 C -22 66, -34 28, -34 -20 Z" fill="url(#stripeYellow)"/>

    <!-- Mid-Right Crimson Red Gore (Torn/Exploding on Right) -->
    <path d="M 0 -118 C 18 -118, 34 -78, 34 -20 C 34 28, 22 66, 10 90 L 22 90 C 42 66, 66 28, 66 -20 C 66 -78, 36 -118, 0 -118 Z" fill="url(#stripeRed)"/>

    <!-- Far-Right Royal Blue Gore -->
    <path d="M 0 -118 C 36 -118, 66 -78, 66 -20 C 66 28, 42 66, 22 90 L 32 90 C 58 64, 86 26, 86 -22 C 86 -82, 46 -118, 0 -118 Z" fill="url(#stripeBlue)"/>

    <!-- Specular 3D Highlight on Upper Left of Balloon -->
    <ellipse cx="-36" cy="-52" rx="26" ry="38" fill="#ffffff" opacity="0.22" transform="rotate(-20 -36 -52)"/>

    <!-- Balloon Throat & Burner Collar -->
    <rect x="-28" y="86" width="56" height="9" rx="4" fill="#78350f" stroke="#fde047" stroke-width="1.5"/>

    <!-- Burner Flame -->
    <ellipse cx="0" cy="103" rx="11" ry="14" fill="#f97316"/>
    <ellipse cx="0" cy="104" rx="6" ry="9" fill="#fef08a"/>

    <!-- Suspension Ropes -->
    <line x1="-20" y1="95" x2="-15" y2="118" stroke="#cbd5e1" stroke-width="2"/>
    <line x1="20" y1="95" x2="15" y2="118" stroke="#cbd5e1" stroke-width="2"/>
    <line x1="-8" y1="95" x2="-6" y2="118" stroke="#cbd5e1" stroke-width="1.5"/>
    <line x1="8" y1="95" x2="6" y2="118" stroke="#cbd5e1" stroke-width="1.5"/>

    <!-- Woven Brown Wicker Basket -->
    <rect x="-22" y="116" width="44" height="32" rx="6" fill="#b45309" stroke="#451a03" stroke-width="2.5"/>
    <rect x="-24" y="114" width="48" height="7" rx="3" fill="#d97706" stroke="#451a03" stroke-width="1.5"/>
    <line x1="-20" y1="128" x2="20" y2="128" stroke="#78350f" stroke-width="2"/>
    <line x1="-20" y1="138" x2="20" y2="138" stroke="#78350f" stroke-width="2"/>
    <line x1="-8" y1="121" x2="-8" y2="148" stroke="#78350f" stroke-width="1.8"/>
    <line x1="8" y1="121" x2="8" y2="148" stroke="#78350f" stroke-width="1.8"/>
  </g>

  <!-- SKYDIVER IN BLACK HELMET & BLUE GOGGLES WITH RED/WHITE PARACHUTE (RIGHT) -->
  <g transform="translate(284, 210) rotate(8)" filter="url(#heavy3DShadow)">
    <!-- Red & White Striped Parachute Canopy -->
    <path
      d="M -48 18 C -48 -26, 48 -26, 48 18 C 36 11, 24 11, 15 18 C 6 11, -6 11, -15 18 C -24 11, -36 11, -48 18 Z"
      fill="#dc2626"
      stroke="#ffffff"
      stroke-width="2"
    />
    <!-- White Parachute Stripes -->
    <path d="M -30 16 C -28 -14, -12 -20, 0 -20 C -7 -20, -16 -12, -15 18 C -20 13, -25 13, -30 16 Z" fill="#f8fafc"/>
    <path d="M 30 16 C 28 -14, 12 -20, 0 -20 C 7 -20, 16 -12, 15 18 C 20 13, 25 13, 30 16 Z" fill="#f8fafc"/>
    <path d="M -8 17 C -5 -18, 5 -18, 8 17 C 3 13, -3 13, -8 17 Z" fill="#ef4444"/>

    <!-- Parachute Rigging Cord Lines -->
    <line x1="-42" y1="18" x2="-8" y2="62" stroke="#e2e8f0" stroke-width="1.6"/>
    <line x1="-15" y1="18" x2="-4" y2="62" stroke="#e2e8f0" stroke-width="1.5"/>
    <line x1="15" y1="18" x2="4" y2="62" stroke="#e2e8f0" stroke-width="1.5"/>
    <line x1="42" y1="18" x2="8" y2="62" stroke="#e2e8f0" stroke-width="1.6"/>

    <!-- Skydiver Figure -->
    <g transform="translate(0, 68)">
      <!-- Spread Arms (Red Sleeves & Black Gloves) -->
      <path d="M -20 -6 L -8 -2 L 8 -2 L 20 -6" fill="none" stroke="#dc2626" stroke-width="6" stroke-linecap="round"/>
      <circle cx="-21" cy="-6" r="3.5" fill="#0f172a"/>
      <circle cx="21" cy="-6" r="3.5" fill="#0f172a"/>
      <!-- Torso & Harness -->
      <rect x="-8" y="-4" width="16" height="18" rx="4" fill="#1e293b" stroke="#dc2626" stroke-width="1.5"/>
      <line x1="-6" y1="-4" x2="6" y2="12" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="6" y1="-4" x2="-6" y2="12" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Black Helmet & Bright Blue Goggles -->
      <circle cx="0" cy="-12" r="10" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <rect x="-7" y="-15" width="14" height="6" rx="3" fill="#38bdf8" stroke="#ffffff" stroke-width="1.2"/>
      <!-- Legs -->
      <path d="M -5 14 L -10 28 M 5 14 L 10 28" stroke="#0f172a" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M -10 28 L -13 31 M 10 28 L 13 31" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
    </g>
  </g>

  <!-- GIANT 3D "BALLOON CRASH" LOGO AT BOTTOM -->
  <g transform="translate(200, 384)" filter="url(#heavy3DShadow)">
    <!-- 3D Extrusion Base for BALLOON -->
    <text
      x="0"
      y="7"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="52"
      font-weight="900"
      fill="#1e1b4b"
      stroke="#000000"
      stroke-width="8"
      letter-spacing="1.5"
    >
      BALLOON
    </text>
    <text
      x="0"
      y="4"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="52"
      font-weight="900"
      fill="#78350f"
      stroke="#451a03"
      stroke-width="4"
      letter-spacing="1.5"
    >
      BALLOON
    </text>
    <!-- Main Golden Face for BALLOON -->
    <text
      x="0"
      y="0"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="52"
      font-weight="900"
      fill="url(#balloonTextGold)"
      stroke="#fef08a"
      stroke-width="1.2"
      letter-spacing="1.5"
    >
      BALLOON
    </text>

    <!-- Balloon Silhouette Cutout Inside the First 'O' of BALLOON -->
    <g transform="translate(45, -19)">
      <ellipse cx="0" cy="-2" rx="7.5" ry="9.5" fill="#1e1b4b"/>
      <rect x="-3" y="8.5" width="6" height="3.5" rx="1" fill="#1e1b4b"/>
    </g>

    <!-- Black Brush Splash Behind CRASH -->
    <path
      d="M -135 20 Q 0 12 135 20 L 126 68 Q 0 74 -126 68 Z"
      fill="#05070e"
      stroke="#1e293b"
      stroke-width="2"
    />

    <!-- Distressed Crimson Red "CRASH" Text -->
    <text
      x="0"
      y="61"
      text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif"
      font-size="54"
      font-weight="900"
      fill="#000000"
      letter-spacing="5"
    >
      CRASH
    </text>
    <text
      x="0"
      y="57"
      text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif"
      font-size="54"
      font-weight="900"
      fill="url(#crashTextRed)"
      stroke="#ffedd5"
      stroke-width="1"
      letter-spacing="5"
    >
      CRASH
    </text>
  </g>
</svg>
`;

/**
 * Full-Screen Balloon Crash Loading Arena Background (16:9 Aspect Ratio)
 */
export const BALLOON_CRASH_BG_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="bgSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#030712"/>
      <stop offset="40%" stop-color="#1e1b4b"/>
      <stop offset="75%" stop-color="#3b0764"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#e11d48" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#030712" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bgSky)"/>
  <circle cx="640" cy="360" r="520" fill="url(#bgGlow)"/>
  <g fill="#fef08a" opacity="0.65">
    <circle cx="180" cy="120" r="2.5"/>
    <circle cx="340" cy="80" r="2"/>
    <circle cx="520" cy="150" r="1.8"/>
    <circle cx="820" cy="95" r="2.5"/>
    <circle cx="1040" cy="140" r="2"/>
    <circle cx="1160" cy="240" r="2.2"/>
    <circle cx="120" cy="290" r="2"/>
  </g>
  <!-- Distant Floating Balloons -->
  <g transform="translate(240, 250) scale(0.85)" opacity="0.75">
    <circle cx="0" cy="0" r="58" fill="#e11d48" stroke="#f59e0b" stroke-width="3"/>
    <rect x="-14" y="68" width="28" height="20" rx="4" fill="#d97706"/>
  </g>
  <g transform="translate(1020, 220) scale(0.7)" opacity="0.7">
    <circle cx="0" cy="0" r="58" fill="#f59e0b" stroke="#fef08a" stroke-width="3"/>
    <rect x="-14" y="68" width="28" height="20" rx="4" fill="#b45309"/>
  </g>
  <!-- Horizon Clouds -->
  <path d="M0 580 Q 220 510 460 575 T 920 560 T 1280 580 L 1280 720 L 0 720 Z" fill="#090d16" opacity="0.88"/>
</svg>
`;

/**
 * Mines 5x5 Cover Artwork (Matching the uploaded MINES image:
 * Black Skull Bomb with Burning Fuse, Giant 3D Gold "MINES" Logo,
 * "Small Bets Big Wins", "FIND THE SAFE TILES" Sign,
 * 5x5 Royal-Blue Star & Golden Diamond Board, and Treasure Chest)
 */
export const LANKA_MINES_COVER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520">
  <defs>
    <!-- Deep Royal Blue & Warm Amber Underground Mine Background -->
    <radialGradient id="minesCaveBg" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="35%" stop-color="#1e3a8a"/>
      <stop offset="72%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#040814"/>
    </radialGradient>

    <radialGradient id="minesCenterGlow" cx="50%" cy="32%" r="45%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#040814" stop-opacity="0"/>
    </radialGradient>

    <!-- 3D Metallic Gold Gradient for "MINES" -->
    <linearGradient id="minesGold3D" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="18%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="82%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>

    <!-- Black Spherical Skull Bomb Gradient -->
    <radialGradient id="skullBombSphere" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="35%" stop-color="#1e293b"/>
      <stop offset="80%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>

    <!-- Royal Blue Unrevealed Star Tile Gradient -->
    <linearGradient id="blueStarTile" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="55%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>

    <!-- Golden Revealed Safe Tile Gradient -->
    <linearGradient id="goldSafeTile" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>

    <!-- Red Revealed Bomb Tile Gradient -->
    <linearGradient id="redBombTile" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="55%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>

    <filter id="minesDropShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.9"/>
    </filter>
  </defs>

  <!-- Cavern Base Background -->
  <rect width="400" height="520" fill="url(#minesCaveBg)"/>
  <circle cx="200" cy="175" r="185" fill="url(#minesCenterGlow)"/>

  <!-- Floating Golden Embers & Sparks -->
  <g fill="#fde047" opacity="0.75">
    <circle cx="32" cy="115" r="2.2"/>
    <circle cx="68" cy="160" r="1.6"/>
    <circle cx="352" cy="128" r="2.4"/>
    <circle cx="322" cy="175" r="1.8"/>
    <circle cx="48" cy="285" r="2"/>
    <circle cx="362" cy="260" r="2"/>
  </g>

  <!-- TOP-LEFT ANGLED CALLOUT: "Small Bets / Big Wins" -->
  <g transform="translate(18, 42) rotate(-10)" filter="url(#minesDropShadow)">
    <text x="0" y="0" font-family="Arial Black, Impact, sans-serif" font-style="italic" font-size="17" font-weight="900" fill="#ffffff" stroke="#0f172a" stroke-width="1">Small Bets</text>
    <text x="4" y="21" font-family="Arial Black, Impact, sans-serif" font-style="italic" font-size="20" font-weight="900" fill="#facc15" stroke="#78350f" stroke-width="1">Big Wins</text>
    <path d="M 2 26 Q 45 20 88 25" fill="none" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- TOP-RIGHT WOODEN SIGNPOST: "FIND THE SAFE TILES" -->
  <g transform="translate(278, 22) rotate(5)" filter="url(#minesDropShadow)">
    <!-- Hanging Chains -->
    <line x1="18" y1="-12" x2="18" y2="4" stroke="#94a3b8" stroke-width="2.5"/>
    <line x1="86" y1="-12" x2="86" y2="4" stroke="#94a3b8" stroke-width="2.5"/>
    <!-- Wooden Plank -->
    <rect x="0" y="2" width="104" height="40" rx="6" fill="#78350f" stroke="#d97706" stroke-width="2.5"/>
    <line x1="4" y1="14" x2="100" y2="14" stroke="#451a03" stroke-width="1"/>
    <line x1="4" y1="28" x2="100" y2="28" stroke="#451a03" stroke-width="1"/>
    <text x="52" y="18" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="11" font-weight="900" fill="#fef3c7" letter-spacing="1">FIND THE</text>
    <text x="52" y="34" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="12" font-weight="900" fill="#fde047" letter-spacing="1">SAFE TILES</text>
  </g>

  <!-- HERO CENTERPIECE: BLACK SKULL BOMB + BURNING FUSE + GIANT 3D "MINES" LOGO -->
  <g transform="translate(200, 108)" filter="url(#minesDropShadow)">
    <!-- Ornamental Gold & Neon Blue Shield Behind Bomb & Logo -->
    <path d="M -128 32 L -110 4 L 0 -14 L 110 4 L 128 32 L 116 86 L 0 102 L -116 86 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
    <path d="M -122 34 L -106 8 L 0 -8 L 106 8 L 122 34 L 110 82 L 0 96 L -110 82 Z" fill="#1e293b" stroke="url(#minesGold3D)" stroke-width="4"/>

    <!-- Golden Crest Cradle Under Bomb -->
    <path d="M -56 12 Q 0 32 56 12 L 44 -8 Q 0 8 -44 -8 Z" fill="url(#minesGold3D)" stroke="#451a03" stroke-width="2"/>

    <!-- Giant Black Spherical Bomb -->
    <circle cx="0" cy="-28" r="46" fill="url(#skullBombSphere)" stroke="#475569" stroke-width="2"/>
    <!-- Bomb Top Nozzle Cap -->
    <rect x="-12" y="-78" width="24" height="10" rx="3" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>

    <!-- Burning Rope Fuse & Bright Spark Burst -->
    <path d="M 0 -78 Q 28 -96 48 -72 Q 62 -56 76 -66" fill="none" stroke="#d97706" stroke-width="4.5" stroke-linecap="round"/>
    <g transform="translate(78, -67)">
      <polygon points="0,-18 5,-5 18,-10 8,0 18,10 5,5 0,18 -5,5 -18,10 -8,0 -18,-10 -5,-5" fill="#f97316"/>
      <polygon points="0,-11 3,-3 11,-6 5,0 11,6 3,3 0,11 -3,3 -11,6 -5,0 -11,-6 -3,-3" fill="#fef08a"/>
      <circle cx="0" cy="0" r="4.5" fill="#ffffff"/>
    </g>

    <!-- White Skull Emblem on Front of Bomb -->
    <g transform="translate(0, -28)">
      <!-- Skull Cranium -->
      <path d="M -18 -6 C -18 -20, 18 -20, 18 -6 C 18 2, 12 6, 10 10 L -10 10 C -12 6, -18 2, -18 -6 Z" fill="#f8fafc"/>
      <!-- Skull Jaw / Teeth -->
      <rect x="-8" y="8" width="16" height="8" rx="2" fill="#f8fafc"/>
      <line x1="-4" y1="9" x2="-4" y2="16" stroke="#090d16" stroke-width="2"/>
      <line x1="0" y1="9" x2="0" y2="16" stroke="#090d16" stroke-width="2"/>
      <line x1="4" y1="9" x2="4" y2="16" stroke="#090d16" stroke-width="2"/>
      <!-- Angry Eye Sockets -->
      <polygon points="-12,-6 -3,-3 -4,3 -13,1" fill="#090d16"/>
      <polygon points="12,-6 3,-3 4,3 13,1" fill="#090d16"/>
      <!-- Nasal Cavity -->
      <polygon points="0,-1 -3,5 3,5" fill="#090d16"/>
    </g>

    <!-- GIANT 3D GOLDEN "MINES" BLOCK LETTERS -->
    <text
      x="0"
      y="74"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="60"
      font-weight="900"
      fill="#451a03"
      stroke="#000000"
      stroke-width="8"
      letter-spacing="3"
    >
      MINES
    </text>
    <text
      x="0"
      y="69"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="60"
      font-weight="900"
      fill="url(#minesGold3D)"
      stroke="#fef08a"
      stroke-width="1.5"
      letter-spacing="3"
    >
      MINES
    </text>
  </g>

  <!-- 5x5 ROYAL-BLUE & GOLDEN DIAMOND / SKULL BOMB BOARD -->
  <g transform="translate(52, 212)" filter="url(#minesDropShadow)">
    <!-- Outer 3D Board Frame -->
    <rect x="-10" y="-10" width="316" height="222" rx="16" fill="#0a192f" stroke="#38bdf8" stroke-width="3"/>
    <rect x="-5" y="-5" width="306" height="212" rx="12" fill="#061024" stroke="#f59e0b" stroke-width="2"/>

    <!-- Row 1: [Star] [Diamond] [Star] [SkullBomb] [Star] -->
    <!-- (0,0) Blue Star -->
    <g transform="translate(0, 0)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <!-- (0,1) Golden Diamond -->
    <g transform="translate(60, 0)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
      <polygon points="27,5 35,15 27,31 19,15" fill="#ffffff" opacity="0.65"/>
    </g>
    <!-- (0,2) Blue Star -->
    <g transform="translate(120, 0)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <!-- (0,3) Skull Bomb -->
    <g transform="translate(180, 0)">
      <rect width="54" height="36" rx="7" fill="url(#redBombTile)" stroke="#fde047" stroke-width="1.8"/>
      <circle cx="27" cy="19" r="12" fill="#090d16" stroke="#f87171" stroke-width="1.2"/>
      <circle cx="24" cy="17" r="2" fill="#ffffff"/>
      <circle cx="30" cy="17" r="2" fill="#ffffff"/>
      <rect x="24" y="21" width="6" height="3" rx="1" fill="#ffffff"/>
      <circle cx="37" cy="8" r="3.5" fill="#fde047"/>
    </g>
    <!-- (0,4) Blue Star -->
    <g transform="translate(240, 0)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>

    <!-- Row 2: [Diamond] [Star] [Diamond] [Star] [Diamond] -->
    <g transform="translate(0, 42)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>
    <g transform="translate(60, 42)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <g transform="translate(120, 42)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>
    <g transform="translate(180, 42)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <g transform="translate(240, 42)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>

    <!-- Row 3: [Star] [SkullBomb] [Diamond] [Diamond] [Star] -->
    <g transform="translate(0, 84)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <g transform="translate(60, 84)">
      <rect width="54" height="36" rx="7" fill="url(#redBombTile)" stroke="#fde047" stroke-width="1.8"/>
      <circle cx="27" cy="19" r="12" fill="#090d16" stroke="#f87171" stroke-width="1.2"/>
      <circle cx="24" cy="17" r="2" fill="#ffffff"/>
      <circle cx="30" cy="17" r="2" fill="#ffffff"/>
      <rect x="24" y="21" width="6" height="3" rx="1" fill="#ffffff"/>
      <circle cx="37" cy="8" r="3.5" fill="#fde047"/>
    </g>
    <g transform="translate(120, 84)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>
    <g transform="translate(180, 84)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>
    <g transform="translate(240, 84)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>

    <!-- Row 4: [Star] [Diamond] [Star] [SkullBomb] [Diamond] -->
    <g transform="translate(0, 126)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <g transform="translate(60, 126)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>
    <g transform="translate(120, 126)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <g transform="translate(180, 126)">
      <rect width="54" height="36" rx="7" fill="url(#redBombTile)" stroke="#fde047" stroke-width="1.8"/>
      <circle cx="27" cy="19" r="12" fill="#090d16" stroke="#f87171" stroke-width="1.2"/>
      <circle cx="24" cy="17" r="2" fill="#ffffff"/>
      <circle cx="30" cy="17" r="2" fill="#ffffff"/>
      <rect x="24" y="21" width="6" height="3" rx="1" fill="#ffffff"/>
      <circle cx="37" cy="8" r="3.5" fill="#fde047"/>
    </g>
    <g transform="translate(240, 126)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>

    <!-- Row 5: [Diamond] [Star] [Diamond] [Star] [Star] -->
    <g transform="translate(0, 168)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>
    <g transform="translate(60, 168)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <g transform="translate(120, 168)">
      <rect width="54" height="36" rx="7" fill="url(#goldSafeTile)" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="27,5 41,15 27,31 13,15" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    </g>
    <g transform="translate(180, 168)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
    <g transform="translate(240, 168)">
      <rect width="54" height="36" rx="7" fill="url(#blueStarTile)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="27" y="25" text-anchor="middle" font-size="20" fill="#93c5fd">★</text>
    </g>
  </g>

  <!-- BOTTOM-LEFT OVERFLOWING GOLDEN DIAMOND TREASURE CHEST -->
  <g transform="translate(14, 382)" filter="url(#minesDropShadow)">
    <!-- Chest Base -->
    <rect x="0" y="26" width="96" height="48" rx="6" fill="#78350f" stroke="url(#minesGold3D)" stroke-width="3"/>
    <!-- Overflowing Golden Gems & Coins -->
    <circle cx="24" cy="22" r="10" fill="#facc15"/>
    <circle cx="46" cy="16" r="12" fill="#fef08a"/>
    <circle cx="68" cy="20" r="11" fill="#f59e0b"/>
    <polygon points="34,6 48,16 34,30 20,16" fill="#fef08a" stroke="#b45309" stroke-width="1.2"/>
    <polygon points="62,8 76,18 62,32 48,18" fill="#fde047" stroke="#b45309" stroke-width="1.2"/>
    <!-- Chest Lock Plate -->
    <rect x="40" y="38" width="16" height="20" rx="3" fill="url(#minesGold3D)" stroke="#451a03" stroke-width="1.5"/>
  </g>

  <!-- BOTTOM FEATURE STRIP (SAFE & FAIR PLAY • FAST WITHDRAWALS • BIG WINS AWAIT) -->
  <rect x="0" y="468" width="400" height="52" fill="#020617" fill-opacity="0.95"/>
  <line x1="0" y1="468" x2="400" y2="468" stroke="url(#minesGold3D)" stroke-width="2.5"/>
  <text x="200" y="490" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="13" font-weight="900" fill="#fde047" letter-spacing="1.5">SAFE &amp; FAIR PLAY • FAST WITHDRAWALS</text>
  <text x="200" y="508" text-anchor="middle" font-family="Arial, sans-serif" font-size="10.5" font-weight="800" fill="#38bdf8" letter-spacing="2">PLAY ANYWHERE ANYTIME • BIG WINS AWAIT</text>
</svg>
`;

/**
 * Custom Illustrated Covers for All Additional Casino Lobby Games
 */
const SPACE_ROCKET_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
  <defs>
    <linearGradient id="srBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#090420"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="srBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="60%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>
  <rect width="360" height="480" fill="url(#srBg)"/>
  <circle cx="180" cy="195" r="135" fill="#6366f1" fill-opacity="0.22"/>
  <g fill="#fef08a" opacity="0.8">
    <circle cx="60" cy="70" r="2.5"/><circle cx="300" cy="85" r="2"/><circle cx="75" cy="240" r="2"/><circle cx="290" cy="220" r="2.5"/>
  </g>
  <!-- Futuristic Rocket -->
  <g transform="translate(180, 195) rotate(-18)">
    <!-- Thruster Flame -->
    <polygon points="-22,82 22,82 0,158" fill="#f97316"/>
    <polygon points="-12,82 12,82 0,132" fill="#fef08a"/>
    <!-- Fins -->
    <polygon points="-34,42 -68,88 -26,78" fill="#e11d48" stroke="#fda4af" stroke-width="2"/>
    <polygon points="34,42 68,88 26,78" fill="#e11d48" stroke="#fda4af" stroke-width="2"/>
    <!-- Fuselage -->
    <path d="M0 -105 C42 -55, 42 35, 28 82 L-28 82 C-42 35, -42 -55, 0 -105 Z" fill="url(#srBody)" stroke="#818cf8" stroke-width="3"/>
    <!-- Nose Cone -->
    <path d="M0 -105 C18 -82, 26 -58, 29 -42 L-29 -42 C-26 -58, -18 -82, 0 -105 Z" fill="#e11d48"/>
    <!-- Window -->
    <circle cx="0" cy="-2" r="20" fill="#0ea5e9" stroke="#fde047" stroke-width="4"/>
    <circle cx="-6" cy="-8" r="6" fill="#e0f2fe"/>
  </g>
  <rect x="0" y="365" width="360" height="115" fill="#020617" fill-opacity="0.88"/>
  <text x="180" y="406" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="30" font-weight="900" fill="#818cf8" letter-spacing="1.5">SPACE ROCKET</text>
  <text x="180" y="434" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fde047" letter-spacing="2">COSMIC CRASH • 500x</text>
</svg>
`;

const LION_JET_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
  <defs>
    <linearGradient id="ljBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2a0815"/>
      <stop offset="55%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="360" height="480" fill="url(#ljBg)"/>
  <circle cx="180" cy="195" r="140" fill="#f43f5e" fill-opacity="0.22"/>
  <path d="M35 330 Q 160 280 315 110" fill="none" stroke="#fb7185" stroke-width="5" stroke-dasharray="10 6"/>
  <!-- Supersonic Jet -->
  <g transform="translate(185, 195) rotate(-32)">
    <polygon points="-16,75 16,75 0,145" fill="#f59e0b"/>
    <polygon points="-8,75 8,75 0,115" fill="#fef08a"/>
    <polygon points="0,-105 22,-20 92,35 22,55 14,82 -14,82 -22,55 -92,35 -22,-20" fill="#e11d48" stroke="#fde047" stroke-width="3"/>
    <polygon points="0,-70 10,-15 0,25 -10,-15" fill="#38bdf8" stroke="#fef08a" stroke-width="2"/>
  </g>
  <rect x="0" y="365" width="360" height="115" fill="#020617" fill-opacity="0.88"/>
  <text x="180" y="406" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="32" font-weight="900" fill="#fb7185" letter-spacing="2">LION JET X</text>
  <text x="180" y="434" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fde047" letter-spacing="2">SUPERSONIC CRASH • LKR</text>
</svg>
`;

const LION_PLINKO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
  <defs>
    <linearGradient id="lpBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2e1065"/>
      <stop offset="55%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="360" height="480" fill="url(#lpBg)"/>
  <circle cx="180" cy="195" r="145" fill="#f59e0b" fill-opacity="0.18"/>
  <!-- Plinko Peg Pyramid -->
  <g fill="#f8fafc" stroke="#94a3b8" stroke-width="1">
    <circle cx="180" cy="95" r="5"/>
    <circle cx="155" cy="130" r="5"/><circle cx="205" cy="130" r="5"/>
    <circle cx="130" cy="165" r="5"/><circle cx="180" cy="165" r="5"/><circle cx="230" cy="165" r="5"/>
    <circle cx="105" cy="200" r="5"/><circle cx="155" cy="200" r="5"/><circle cx="205" cy="200" r="5"/><circle cx="255" cy="200" r="5"/>
    <circle cx="80" cy="235" r="5"/><circle cx="130" cy="235" r="5"/><circle cx="180" cy="235" r="5"/><circle cx="230" cy="235" r="5"/><circle cx="280" cy="235" r="5"/>
    <circle cx="55" cy="270" r="5"/><circle cx="105" cy="270" r="5"/><circle cx="155" cy="270" r="5"/><circle cx="205" cy="270" r="5"/><circle cx="255" cy="270" r="5"/><circle cx="305" cy="270" r="5"/>
  </g>
  <!-- Falling Golden & Neon Balls -->
  <circle cx="168" cy="112" r="11" fill="#f59e0b" stroke="#fef08a" stroke-width="2.5"/>
  <circle cx="195" cy="182" r="12" fill="#ec4899" stroke="#fbcfe8" stroke-width="2.5"/>
  <circle cx="142" cy="218" r="12" fill="#10b981" stroke="#a7f3d0" stroke-width="2.5"/>
  <!-- Multiplier Buckets -->
  <g transform="translate(36, 298)">
    <rect x="0" y="0" width="52" height="30" rx="6" fill="#e11d48"/><text x="26" y="20" text-anchor="middle" font-family="monospace" font-size="12" font-weight="900" fill="#fff">100x</text>
    <rect x="58" y="0" width="52" height="30" rx="6" fill="#f59e0b"/><text x="84" y="20" text-anchor="middle" font-family="monospace" font-size="12" font-weight="900" fill="#000">15x</text>
    <rect x="116" y="0" width="52" height="30" rx="6" fill="#10b981"/><text x="142" y="20" text-anchor="middle" font-family="monospace" font-size="12" font-weight="900" fill="#000">2x</text>
    <rect x="174" y="0" width="52" height="30" rx="6" fill="#f59e0b"/><text x="200" y="20" text-anchor="middle" font-family="monospace" font-size="12" font-weight="900" fill="#000">15x</text>
    <rect x="232" y="0" width="52" height="30" rx="6" fill="#e11d48"/><text x="258" y="20" text-anchor="middle" font-family="monospace" font-size="12" font-weight="900" fill="#fff">100x</text>
  </g>
  <rect x="0" y="365" width="360" height="115" fill="#020617" fill-opacity="0.88"/>
  <text x="180" y="406" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="32" font-weight="900" fill="#fbbf24" letter-spacing="2">LION PLINKO</text>
  <text x="180" y="434" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#f472b6" letter-spacing="2">INSTANT DROP • 1000x</text>
</svg>
`;

const LION_MEGAWAYS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
  <defs>
    <linearGradient id="lmwBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b0764"/>
      <stop offset="55%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="360" height="480" fill="url(#lmwBg)"/>
  <circle cx="180" cy="190" r="145" fill="#a855f7" fill-opacity="0.24"/>
  <!-- Golden Slot Frame -->
  <rect x="34" y="88" width="292" height="215" rx="20" fill="#090d16" stroke="#facc15" stroke-width="5"/>
  <line x1="131" y1="88" x2="131" y2="303" stroke="#facc15" stroke-width="3"/>
  <line x1="229" y1="88" x2="229" y2="303" stroke="#facc15" stroke-width="3"/>
  <line x1="34" y1="160" x2="326" y2="160" stroke="#334155" stroke-width="2"/>
  <line x1="34" y1="232" x2="326" y2="232" stroke="#334155" stroke-width="2"/>
  <!-- Winning 777 & Crown Row -->
  <rect x="38" y="164" width="284" height="64" fill="#f59e0b" fill-opacity="0.22"/>
  <text x="82" y="212" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="44" font-weight="900" fill="#fde047">7</text>
  <text x="180" y="212" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="44" font-weight="900" fill="#fde047">7</text>
  <text x="278" y="212" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="44" font-weight="900" fill="#fde047">7</text>
  <!-- Top & Bottom Symbols -->
  <circle cx="82" cy="124" r="18" fill="#10b981" stroke="#a7f3d0" stroke-width="2"/>
  <circle cx="180" cy="124" r="18" fill="#e11d48" stroke="#fda4af" stroke-width="2"/>
  <circle cx="278" cy="124" r="18" fill="#f59e0b" stroke="#fef08a" stroke-width="2"/>
  <circle cx="82" cy="268" r="18" fill="#f59e0b" stroke="#fef08a" stroke-width="2"/>
  <circle cx="180" cy="268" r="18" fill="#10b981" stroke="#a7f3d0" stroke-width="2"/>
  <circle cx="278" cy="268" r="18" fill="#e11d48" stroke="#fda4af" stroke-width="2"/>
  <rect x="0" y="365" width="360" height="115" fill="#020617" fill-opacity="0.88"/>
  <text x="180" y="404" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="27" font-weight="900" fill="#fde047" letter-spacing="1.5">LION MEGAWAYS</text>
  <text x="180" y="434" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#c084fc" letter-spacing="2">6 REELS • 117,649 WAYS</text>
</svg>
`;

const COLOMBO_ROULETTE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
  <defs>
    <linearGradient id="crBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#083344"/>
      <stop offset="55%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="360" height="480" fill="url(#crBg)"/>
  <circle cx="180" cy="195" r="145" fill="#06b6d4" fill-opacity="0.2"/>
  <!-- Luxury Roulette Wheel -->
  <g transform="translate(180, 195)">
    <circle cx="0" cy="0" r="112" fill="#451a03" stroke="#facc15" stroke-width="6"/>
    <circle cx="0" cy="0" r="92" fill="#090d16" stroke="#f59e0b" stroke-width="3"/>
    <!-- Alternating Red/Black/Green Pockets -->
    <circle cx="0" cy="0" r="76" fill="none" stroke="#e11d48" stroke-width="24" stroke-dasharray="19.8 19.8"/>
    <circle cx="0" cy="0" r="76" fill="none" stroke="#0f172a" stroke-width="24" stroke-dasharray="19.8 19.8" stroke-dashoffset="19.8"/>
    <circle cx="0" cy="-76" r="12" fill="#10b981"/>
    <!-- Inner Gold Turret -->
    <circle cx="0" cy="0" r="56" fill="#064e3b" stroke="#facc15" stroke-width="4"/>
    <line x1="-42" y1="0" x2="42" y2="0" stroke="#fde047" stroke-width="5"/>
    <line x1="0" y1="-42" x2="0" y2="42" stroke="#fde047" stroke-width="5"/>
    <circle cx="0" cy="0" r="18" fill="#fde047" stroke="#78350f" stroke-width="3"/>
    <!-- Ivory Ball -->
    <circle cx="52" cy="-52" r="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  </g>
  <rect x="0" y="365" width="360" height="115" fill="#020617" fill-opacity="0.88"/>
  <text x="180" y="404" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="27" font-weight="900" fill="#38bdf8" letter-spacing="1.5">VIP ROULETTE</text>
  <text x="180" y="434" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fde047" letter-spacing="2">COLOMBO LIVE TABLE • LKR</text>
</svg>
`;

const WORLD_SPORTS_COVER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
  <defs>
    <linearGradient id="wsBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="55%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="360" height="480" fill="url(#wsBg)"/>
  <circle cx="180" cy="190" r="140" fill="#10b981" fill-opacity="0.25"/>
  <!-- Stadium Pitch Ring -->
  <ellipse cx="180" cy="240" rx="130" ry="62" fill="#047857" stroke="#6ee7b7" stroke-width="3"/>
  <ellipse cx="180" cy="240" rx="90" ry="40" fill="none" stroke="#a7f3d0" stroke-width="1.5" stroke-dasharray="6 4"/>
  <!-- Cricket Bat & Red Ball + Football -->
  <g transform="translate(125, 165)">
    <circle cx="0" cy="0" r="34" fill="#e11d48" stroke="#fef08a" stroke-width="3"/>
    <path d="M-24 -24 Q 0 0 24 24" fill="none" stroke="#fef08a" stroke-width="2.5" stroke-dasharray="4 3"/>
  </g>
  <g transform="translate(225, 185)">
    <circle cx="0" cy="0" r="38" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
    <polygon points="0,-16 15,-5 9,13 -9,13 -15,-5" fill="#0f172a"/>
  </g>
  <rect x="0" y="365" width="360" height="115" fill="#020617" fill-opacity="0.88"/>
  <text x="180" y="404" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="28" font-weight="900" fill="#34d399" letter-spacing="1.5">WORLD SPORTS</text>
  <text x="180" y="434" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fde047" letter-spacing="2">CRICKET • FOOTBALL • TENNIS</text>
</svg>
`;

export const LION_BET_LOGO_RAW_PATH = '/assets/aistudio/IMG-20261023-WA0018_03da72c5.jpg';
export const LION_BET_LOGO_URL = '/assets/aistudio/IMG-20261023-WA0018_03da72c5.jpg?v=lionbet2026';

if (typeof window !== 'undefined' && typeof fetch === 'function') {
  fetch(LION_BET_LOGO_RAW_PATH, { cache: 'reload' }).catch(() => {});
}

export const BALLOON_CRASH_LOGO_URL = svgToDataUri(BALLOON_CRASH_COVER_SVG);
export const BALLOON_CRASH_BG_URL = svgToDataUri(BALLOON_CRASH_BG_SVG);
export const LANKA_MINES_COVER_URL = svgToDataUri(LANKA_MINES_COVER_SVG);
export const WORLD_SPORTS_COVER_URL = svgToDataUri(WORLD_SPORTS_COVER_SVG);

export const COMING_SOON_GAME_COVERS: Record<string, string> = {
  space_rocket: svgToDataUri(SPACE_ROCKET_SVG),
  aviator_jet: svgToDataUri(LION_JET_SVG),
  plinko_gold: svgToDataUri(LION_PLINKO_SVG),
  lion_bonanza: svgToDataUri(LION_MEGAWAYS_SVG),
  royal_roulette: svgToDataUri(COLOMBO_ROULETTE_SVG),
};
