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
    <!-- Deep Obsidian & Fiery Arena Background -->
    <radialGradient id="bcCardBg" cx="50%" cy="44%" r="72%">
      <stop offset="0%" stop-color="#2a0f1d"/>
      <stop offset="45%" stop-color="#0f071e"/>
      <stop offset="80%" stop-color="#06040d"/>
      <stop offset="100%" stop-color="#020205"/>
    </radialGradient>

    <!-- Inner Circle Sky Gradient -->
    <radialGradient id="bcCircleSky" cx="55%" cy="38%" r="65%">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="35%" stop-color="#2e1065"/>
      <stop offset="75%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>

    <!-- Ambient Fiery Explosion Glow -->
    <radialGradient id="bcBlastGlow" cx="58%" cy="36%" r="48%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
      <stop offset="28%" stop-color="#f97316" stop-opacity="0.75"/>
      <stop offset="60%" stop-color="#dc2626" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>

    <!-- 3D Metallic Gold Ring Gradient -->
    <linearGradient id="bcGoldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="20%" stop-color="#fde047"/>
      <stop offset="45%" stop-color="#f59e0b"/>
      <stop offset="70%" stop-color="#b45309"/>
      <stop offset="88%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>

    <linearGradient id="bcGoldBevel" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#78350f"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </linearGradient>

    <!-- Balloon Gore Gradients: Red, Yellow, Blue -->
    <linearGradient id="goreRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b6b"/>
      <stop offset="40%" stop-color="#ef4444"/>
      <stop offset="80%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </linearGradient>

    <linearGradient id="goreYellow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#fef08a"/>
      <stop offset="65%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>

    <linearGradient id="goreBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#93c5fd"/>
      <stop offset="35%" stop-color="#3b82f6"/>
      <stop offset="75%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#172554"/>
    </linearGradient>

    <!-- 3D Typography Gradients -->
    <linearGradient id="titleGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="22%" stop-color="#fef08a"/>
      <stop offset="55%" stop-color="#f59e0b"/>
      <stop offset="85%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>

    <linearGradient id="titleCrashGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff1f2"/>
      <stop offset="25%" stop-color="#fda4af"/>
      <stop offset="55%" stop-color="#ef4444"/>
      <stop offset="85%" stop-color="#991b1b"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </linearGradient>

    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#f59e0b" flood-opacity="0.55"/>
    </filter>

    <filter id="textShadow3D" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="2" flood-color="#000000" flood-opacity="0.9"/>
    </filter>

    <clipPath id="circleArenaClip">
      <circle cx="200" cy="230" r="144"/>
    </clipPath>
  </defs>

  <!-- Card Base Fill -->
  <rect width="400" height="520" fill="url(#bcCardBg)"/>

  <!-- Background Sparkles & Embers -->
  <g fill="#fde047" opacity="0.65">
    <circle cx="42" cy="72" r="2"/>
    <circle cx="76" cy="48" r="1.5"/>
    <circle cx="336" cy="58" r="2.2"/>
    <circle cx="362" cy="108" r="1.6"/>
    <circle cx="34" cy="335" r="2"/>
    <circle cx="364" cy="328" r="2.4"/>
    <circle cx="58" cy="390" r="1.5"/>
    <circle cx="344" cy="392" r="1.8"/>
  </g>

  <!-- Outer Golden Aura -->
  <circle cx="200" cy="230" r="168" fill="url(#bcBlastGlow)" opacity="0.55"/>

  <!-- GLOWING GOLDEN CIRCULAR CASINO EMBLEM FRAME -->
  <g filter="url(#goldGlow)">
    <circle cx="200" cy="230" r="156" fill="url(#bcGoldRing)"/>
    <circle cx="200" cy="230" r="150" fill="none" stroke="#451a03" stroke-width="2.5"/>
    <circle cx="200" cy="230" r="146" fill="url(#bcGoldBevel)"/>
  </g>

  <!-- Inner Circular Arena -->
  <g clip-path="url(#circleArenaClip)">
    <circle cx="200" cy="230" r="144" fill="url(#bcCircleSky)"/>
    <circle cx="225" cy="185" r="135" fill="url(#bcBlastGlow)"/>

    <!-- Dramatic Sunburst Rays Behind Explosion -->
    <g transform="translate(228, 172)" opacity="0.28" fill="#fef08a">
      <polygon points="0,0 -180,-90 -150,-120"/>
      <polygon points="0,0 -60,-180 -20,-180"/>
      <polygon points="0,0 50,-180 90,-165"/>
      <polygon points="0,0 165,-95 180,-55"/>
      <polygon points="0,0 180,25 165,65"/>
      <polygon points="0,0 -180,30 -170,-15"/>
    </g>

    <!-- Rising Crash Multiplier Curve -->
    <path d="M 62 320 Q 152 295 235 162" fill="none" stroke="#fde047" stroke-width="4" stroke-dasharray="7 5" opacity="0.7"/>

    <!-- Distant Secondary Parachute (Left) -->
    <g transform="translate(72, 212) rotate(-12) scale(0.72)">
      <path d="M 0 24 C 8 -4, 44 -4, 52 24 Z" fill="#ef4444" stroke="#fef2f2" stroke-width="1.5"/>
      <path d="M 14 24 C 18 2, 34 2, 38 24 Z" fill="#ffffff"/>
      <line x1="8" y1="24" x2="23" y2="46" stroke="#e2e8f0" stroke-width="1.5"/>
      <line x1="44" y1="24" x2="29" y2="46" stroke="#e2e8f0" stroke-width="1.5"/>
      <circle cx="26" cy="49" r="4.5" fill="#fde047"/>
      <path d="M 22 54 L 30 54 L 28 66 L 24 66 Z" fill="#f8fafc"/>
    </g>

    <!-- HERO EXPLODING RED / YELLOW / BLUE HOT AIR BALLOON -->
    <g transform="translate(166, 198) rotate(-6)">
      <ellipse cx="0" cy="-12" rx="76" ry="86" fill="#ef4444" opacity="0.25"/>

      <!-- Leftmost Blue Gore -->
      <path d="M -72 -18 C -72 -68, -38 -98, 0 -98 C -30 -98, -56 -64, -56 -16 C -56 24, -36 56, -18 76 L -26 76 C -48 54, -72 22, -72 -18 Z" fill="url(#goreBlue)" stroke="#fde047" stroke-width="1.2"/>

      <!-- Left Yellow Gore -->
      <path d="M -56 -16 C -56 -64, -30 -98, 0 -98 C -16 -98, -32 -64, -32 -16 C -32 24, -20 56, -10 76 L -18 76 C -36 56, -56 24, -56 -16 Z" fill="url(#goreYellow)" stroke="#fde047" stroke-width="1.2"/>

      <!-- Center-Left Crimson Red Gore -->
      <path d="M -32 -16 C -32 -64, -16 -98, 0 -98 C 0 -98, 0 24, 0 76 L -10 76 C -20 56, -32 24, -32 -16 Z" fill="url(#goreRed)" stroke="#fde047" stroke-width="1.2"/>

      <!-- Center-Right Golden Yellow Gore -->
      <path d="M 0 -98 C 16 -98, 32 -64, 32 -16 C 32 24, 20 56, 10 76 L 0 76 C 0 24, 0 -98, 0 -98 Z" fill="url(#goreYellow)" stroke="#fde047" stroke-width="1.2"/>

      <!-- Right Royal Blue Gore -->
      <path d="M 0 -98 C 30 -98, 56 -64, 56 -16 C 56 24, 36 56, 18 76 L 10 76 C 20 56, 32 24, 32 -16 C 32 -64, 16 -98, 0 -98 Z" fill="url(#goreBlue)" stroke="#fde047" stroke-width="1.2"/>

      <!-- Rightmost Crimson Red Gore -->
      <path d="M 0 -98 C 38 -98, 72 -68, 72 -18 C 72 22, 48 54, 26 76 L 18 76 C 36 56, 56 24, 56 -16 C 56 -64, 30 -98, 0 -98 Z" fill="url(#goreRed)" stroke="#fde047" stroke-width="1.2"/>

      <!-- Decorative Equator Belt -->
      <path d="M -71 -16 Q 0 6 71 -16" fill="none" stroke="url(#bcGoldRing)" stroke-width="11"/>
      <path d="M -71 -16 Q 0 6 71 -16" fill="none" stroke="#b91c1c" stroke-width="5" stroke-dasharray="10 10"/>

      <!-- Balloon Neck Collar -->
      <rect x="-26" y="73" width="52" height="8" rx="4" fill="url(#bcGoldRing)" stroke="#451a03" stroke-width="1.5"/>

      <!-- Roaring Burner Fire -->
      <ellipse cx="0" cy="89" rx="13" ry="16" fill="#f97316"/>
      <ellipse cx="0" cy="90" rx="8" ry="11" fill="#fef08a"/>
      <ellipse cx="0" cy="91" rx="4" ry="6" fill="#ffffff"/>

      <!-- Rigging Lines -->
      <line x1="-18" y1="81" x2="-14" y2="106" stroke="#fde047" stroke-width="2"/>
      <line x1="18" y1="81" x2="14" y2="106" stroke="#fde047" stroke-width="2"/>
      <line x1="-9" y1="81" x2="-7" y2="106" stroke="#fde047" stroke-width="1.5"/>
      <line x1="9" y1="81" x2="7" y2="106" stroke="#fde047" stroke-width="1.5"/>

      <!-- 3D Golden-Brown Wicker Basket -->
      <rect x="-20" y="105" width="40" height="28" rx="5" fill="url(#bcGoldRing)" stroke="#451a03" stroke-width="2.5"/>
      <line x1="-20" y1="114" x2="20" y2="114" stroke="#78350f" stroke-width="2"/>
      <line x1="-20" y1="123" x2="20" y2="123" stroke="#78350f" stroke-width="2"/>
      <line x1="-8" y1="105" x2="-8" y2="133" stroke="#78350f" stroke-width="1.5"/>
      <line x1="8" y1="105" x2="8" y2="133" stroke="#78350f" stroke-width="1.5"/>

      <!-- DRAMATIC EXPLOSION / CRASH BLAST ON UPPER-RIGHT OF BALLOON -->
      <g transform="translate(46, -48)">
        <polygon
          points="0,-54 14,-22 48,-36 26,-6 58,12 22,18 38,48 6,28 -12,56 -16,22 -50,32 -26,4 -52,-18 -18,-18 -26,-48 -2,-24"
          fill="#ef4444"
          stroke="#fde047"
          stroke-width="2"
        />
        <polygon
          points="0,-40 10,-16 36,-26 18,-4 42,10 16,14 26,34 4,20 -8,40 -12,16 -36,22 -18,2 -36,-14 -12,-14 -18,-34 -2,-18"
          fill="#f97316"
        />
        <polygon
          points="0,-24 7,-10 22,-15 11,-2 25,6 10,9 15,20 3,12 -5,24 -7,10 -22,13 -11,1 -22,-8 -7,-8 -11,-20 -1,-10"
          fill="#fef08a"
        />
        <circle cx="0" cy="0" r="9" fill="#ffffff"/>

        <!-- Flying Shards & Sparks -->
        <polygon points="44,-44 58,-52 52,-36" fill="#ef4444"/>
        <polygon points="62,-8 78,-4 66,6" fill="#3b82f6"/>
        <polygon points="32,-60 42,-72 46,-56" fill="#facc15"/>
        <circle cx="64" cy="-26" r="4" fill="#fef08a"/>
        <circle cx="52" cy="32" r="3.5" fill="#fb923c"/>
        <circle cx="18" cy="-58" r="3" fill="#fef08a"/>
        <circle cx="-36" cy="-42" r="3.5" fill="#fde047"/>
      </g>
    </g>

    <!-- FOREGROUND SKYDIVER WITH RED-AND-WHITE STRIPED PARACHUTE -->
    <g transform="translate(274, 212) rotate(10)">
      <ellipse cx="0" cy="14" rx="46" ry="28" fill="#ef4444" opacity="0.25"/>

      <!-- Main Parachute Dome (Red Base) -->
      <path
        d="M -42 22 C -42 -18, 42 -18, 42 22 C 32 16, 22 16, 14 22 C 6 16, -6 16, -14 22 C -22 16, -32 16, -42 22 Z"
        fill="#ef4444"
        stroke="#ffffff"
        stroke-width="2"
      />
      <!-- White Striped Panels -->
      <path
        d="M -26 20 C -24 -10, -10 -14, 0 -14 C -6 -14, -14 -8, -14 22 C -18 18, -22 18, -26 20 Z"
        fill="#ffffff"
      />
      <path
        d="M 26 20 C 24 -10, 10 -14, 0 -14 C 6 -14, 14 -8, 14 22 C 18 18, 22 18, 26 20 Z"
        fill="#ffffff"
      />
      <!-- Center Red Rib Highlight -->
      <path
        d="M -7 20 C -5 -12, 5 -12, 7 20 C 3 17, -3 17, -7 20 Z"
        fill="#dc2626"
      />

      <!-- Parachute Suspension Lines -->
      <line x1="-38" y1="22" x2="-6" y2="62" stroke="#f1f5f9" stroke-width="1.6"/>
      <line x1="-14" y1="22" x2="-3" y2="62" stroke="#f1f5f9" stroke-width="1.5"/>
      <line x1="14" y1="22" x2="3" y2="62" stroke="#f1f5f9" stroke-width="1.5"/>
      <line x1="38" y1="22" x2="6" y2="62" stroke="#f1f5f9" stroke-width="1.6"/>

      <!-- Skydiver Character -->
      <g transform="translate(0, 66)">
        <circle cx="0" cy="-6" r="7.5" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
        <path d="M -5 -8 Q 0 -4 5 -8" fill="none" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
        <path d="M -14 -2 L -6 -1 L -5 12 L 5 12 L 6 -1 L 14 -2" fill="none" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="-5.5" y="-1" width="11" height="13" rx="3" fill="#1e293b" stroke="#fde047" stroke-width="1.2"/>
        <path d="M -3 12 L -8 24 M 3 12 L 8 24" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
      </g>
    </g>

    <!-- Bottom Rim Clouds Inside Circle -->
    <g fill="#090d16" opacity="0.88">
      <circle cx="95" cy="360" r="42"/>
      <circle cx="155" cy="368" r="46"/>
      <circle cx="245" cy="368" r="46"/>
      <circle cx="305" cy="360" r="42"/>
    </g>
  </g>

  <!-- Inner Golden Ring Highlight Overlay -->
  <circle cx="200" cy="230" r="144" fill="none" stroke="url(#bcGoldRing)" stroke-width="5"/>
  <circle cx="200" cy="230" r="139" fill="none" stroke="#fef08a" stroke-opacity="0.45" stroke-width="1.5"/>

  <!-- 3D METALLIC "BALLOON CRASH" TYPOGRAPHY EMBLEM BANNER -->
  <g transform="translate(200, 382)" filter="url(#textShadow3D)">
    <path
      d="M -166 -38 L 166 -38 L 152 62 L -152 62 Z"
      fill="#090414"
      fill-opacity="0.92"
      stroke="url(#bcGoldRing)"
      stroke-width="3.5"
    />
    <path
      d="M -158 -32 L 158 -32 L 146 56 L -146 56 Z"
      fill="none"
      stroke="#fde047"
      stroke-opacity="0.35"
      stroke-width="1.2"
    />

    <!-- "BALLOON" 3D Extruded Gold Text -->
    <text
      x="0"
      y="3"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="44"
      font-weight="900"
      fill="#451a03"
      letter-spacing="2"
    >
      BALLOON
    </text>
    <text
      x="0"
      y="0"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="44"
      font-weight="900"
      fill="url(#titleGoldGrad)"
      stroke="#78350f"
      stroke-width="1.5"
      letter-spacing="2"
    >
      BALLOON
    </text>

    <!-- "CRASH" 3D Extruded Crimson & Gold Text -->
    <text
      x="0"
      y="49"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="48"
      font-weight="900"
      fill="#2a0404"
      letter-spacing="4"
    >
      CRASH
    </text>
    <text
      x="0"
      y="45"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="48"
      font-weight="900"
      fill="url(#titleCrashGrad)"
      stroke="#fde047"
      stroke-width="1.8"
      letter-spacing="4"
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
 * Lanka Mines 5x5 Vault Cover Artwork (3:4 Aspect Ratio)
 */
export const LANKA_MINES_COVER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
  <defs>
    <linearGradient id="lmBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="lmGemTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d1fae5"/>
      <stop offset="50%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="lmGemBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="55%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
    <radialGradient id="lmBomb" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="55%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="lmGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>

  <rect width="360" height="480" fill="url(#lmBg)"/>
  <circle cx="180" cy="200" r="160" fill="#10b981" fill-opacity="0.16"/>
  <circle cx="240" cy="240" r="110" fill="#f43f5e" fill-opacity="0.14"/>

  <!-- 5x5 Vault Grid Matrix -->
  <g transform="translate(35, 78)" opacity="0.9">
    <rect x="0" y="0" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="59" y="0" width="52" height="44" rx="9" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
    <rect x="118" y="0" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="177" y="0" width="52" height="44" rx="9" fill="#4c0519" stroke="#fb7185" stroke-width="2"/>
    <rect x="236" y="0" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>

    <rect x="0" y="52" width="52" height="44" rx="9" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
    <rect x="59" y="52" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="118" y="52" width="52" height="44" rx="9" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
    <rect x="177" y="52" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="236" y="52" width="52" height="44" rx="9" fill="#064e3b" stroke="#34d399" stroke-width="2"/>

    <rect x="0" y="104" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="59" y="104" width="52" height="44" rx="9" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
    <rect x="118" y="104" width="52" height="44" rx="9" fill="#4c0519" stroke="#fb7185" stroke-width="2"/>
    <rect x="177" y="104" width="52" height="44" rx="9" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
    <rect x="236" y="104" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>

    <rect x="0" y="156" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="59" y="156" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="118" y="156" width="52" height="44" rx="9" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
    <rect x="177" y="156" width="52" height="44" rx="9" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <rect x="236" y="156" width="52" height="44" rx="9" fill="#4c0519" stroke="#fb7185" stroke-width="2"/>
  </g>

  <!-- Giant 3D Faceted Emerald Diamond -->
  <g transform="translate(45, 130)">
    <circle cx="82" cy="84" r="68" fill="#10b981" fill-opacity="0.25"/>
    <polygon points="44,18 120,18 154,58 82,150 10,58" fill="url(#lmGemBody)" stroke="#d1fae5" stroke-width="3.5"/>
    <polygon points="44,18 120,18 104,58 60,58" fill="url(#lmGemTop)"/>
    <polygon points="10,58 44,18 60,58" fill="#a7f3d0" fill-opacity="0.85"/>
    <polygon points="154,58 120,18 104,58" fill="#059669" fill-opacity="0.9"/>
    <polygon points="60,58 104,58 82,150" fill="#34d399" fill-opacity="0.7"/>
    <circle cx="35" cy="28" r="4.5" fill="#ffffff"/>
  </g>

  <!-- Giant Spiked Naval Mine -->
  <g transform="translate(182, 172)">
    <circle cx="70" cy="70" r="56" fill="#f43f5e" fill-opacity="0.28"/>
    <line x1="70" y1="10" x2="70" y2="130" stroke="#f43f5e" stroke-width="8" stroke-linecap="round"/>
    <line x1="10" y1="70" x2="130" y2="70" stroke="#f43f5e" stroke-width="8" stroke-linecap="round"/>
    <line x1="26" y1="26" x2="114" y2="114" stroke="#fb7185" stroke-width="7" stroke-linecap="round"/>
    <line x1="114" y1="26" x2="26" y2="114" stroke="#fb7185" stroke-width="7" stroke-linecap="round"/>
    <circle cx="70" cy="70" r="42" fill="url(#lmBomb)" stroke="#fb7185" stroke-width="3.5"/>
    <ellipse cx="55" cy="54" rx="12" ry="7" fill="#94a3b8" fill-opacity="0.5" transform="rotate(-25 55 54)"/>
    <circle cx="70" cy="70" r="14" fill="#ef4444"/>
    <circle cx="70" cy="70" r="6" fill="#fef08a"/>
  </g>

  <!-- Title Banner -->
  <rect x="0" y="362" width="360" height="118" fill="#020617" fill-opacity="0.85"/>
  <text x="180" y="404" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="33" font-weight="900" fill="url(#lmGold)" letter-spacing="2">LANKA MINES</text>
  <text x="180" y="432" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#34d399" letter-spacing="2.5">5x5 EMERALD VAULT • MIN Rs. 10</text>
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
