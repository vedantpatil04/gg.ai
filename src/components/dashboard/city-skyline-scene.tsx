/**
 * CitySkylineScene — Phase 2: Cinematic Hero
 *
 * Replaces the generic EcoIllustration with city-specific SVG skylines.
 * Each scene is a hand-authored SVG silhouette that matches the actual
 * city's landmarks — no external images, no random stock photos.
 *
 * City coverage:
 *   dubai      — Burj Khalifa, twisted towers, desert dunes
 *   newyork    — Manhattan skyline, Empire State, Brooklyn Bridge cables
 *   tokyo      — Tokyo Tower, pagoda profile, city grid
 *   belagavi   — Green hills, river, forest canopy, rain clouds
 *   bengaluru  — Tech-park cluster, UB City silhouette, gardens
 *   mumbai     — Marine Drive arc, sea skyline, high-rise density
 *   london     — The Shard, Gherkin, Thames curve, Big Ben spire
 *   singapore  — Marina Bay Sands trio, supertrees, waterfront
 *   delhi      — India Gate arch, Lotus temple dome, hazy horizon
 *   default    — Generic smart-city silhouette (wind turbine + solar)
 *
 * AQI tier tints the silhouette color:
 *   good       → clean teal-green
 *   moderate   → muted teal
 *   poor       → amber-brown
 *   hazardous  → deep crimson
 *
 * All SVGs use viewBox="0 0 400 220" with preserveAspectRatio="xMidYMax meet"
 * so they anchor to the bottom-right of the hero.
 */

import type { AQITier } from "@/lib/hero-scene";

// ─── Silhouette color by AQI tier ─────────────────────────────────────────────

function skylineColor(tier: AQITier): string {
  switch (tier) {
    case "good":      return "oklch(0.78 0.12 175 / 0.45)";
    case "moderate":  return "oklch(0.72 0.09 190 / 0.42)";
    case "poor":      return "oklch(0.60 0.12 55 / 0.48)";
    case "hazardous": return "oklch(0.45 0.14 25 / 0.55)";
  }
}

function skylineHighlight(tier: AQITier): string {
  switch (tier) {
    case "good":      return "oklch(0.88 0.14 175 / 0.20)";
    case "moderate":  return "oklch(0.82 0.10 190 / 0.18)";
    case "poor":      return "oklch(0.70 0.14 55 / 0.22)";
    case "hazardous": return "oklch(0.55 0.18 25 / 0.28)";
  }
}

// ─── Dubai ────────────────────────────────────────────────────────────────────

function DubaiSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Desert dune base */}
      <ellipse cx="200" cy="260" rx="260" ry="80" fill={fill} style={{ filter: "blur(12px)" }} />

      {/* Burj Khalifa — tapered spire */}
      <polygon points="184,20 190,20 196,220 178,220" fill={fill} />
      <polygon points="186,20 194,20 192,90 188,90" fill={hi} />
      {/* Burj top antenna */}
      <line x1="190" y1="10" x2="190" y2="22" stroke={fill} strokeWidth="2.5" />
      {/* Burj setbacks */}
      <rect x="176" y="100" width="28" height="8" rx="1" fill={fill} />
      <rect x="179" y="130" width="22" height="7" rx="1" fill={fill} />
      <rect x="182" y="158" width="16" height="6" rx="1" fill={fill} />

      {/* Burj Al Arab — sailfish shape */}
      <polygon points="60,80 80,80 86,220 54,220" fill={fill} />
      <path d="M60,80 Q50,150 54,220" fill={fill} />
      <path d="M60,80 Q90,140 86,220" fill={fill} />

      {/* Cayan Tower — twisted */}
      <rect x="230" y="95" width="22" height="125" rx="3" fill={fill} transform="rotate(-3 241 157)" />
      <rect x="232" y="97" width="8" height="120" rx="2" fill={hi} transform="rotate(-3 236 157)" />

      {/* Emirates Towers */}
      <polygon points="270,105 278,105 282,220 266,220" fill={fill} />
      <polygon points="290,120 297,120 300,220 287,220" fill={fill} />

      {/* Low-rise podiums */}
      <rect x="100" y="160" width="50" height="60" rx="2" fill={fill} />
      <rect x="155" y="175" width="22" height="45" rx="2" fill={fill} />
      <rect x="308" y="170" width="45" height="50" rx="2" fill={fill} />
      <rect x="355" y="185" width="35" height="35" rx="2" fill={fill} />

      {/* Sand dune foreground waves */}
      <path d="M0,220 Q50,200 120,215 Q180,225 260,210 Q330,200 400,218 L400,280 L0,280Z"
            fill={fill} style={{ filter: "blur(4px)" }} />
      <path d="M0,230 Q80,215 160,228 Q240,238 320,222 Q370,215 400,228 L400,280 L0,280Z"
            fill={hi} />
    </svg>
  );
}

// ─── New York ─────────────────────────────────────────────────────────────────

function NewYorkSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Hudson River reflection base */}
      <ellipse cx="200" cy="240" rx="240" ry="60" fill={fill} style={{ filter: "blur(10px)" }} />

      {/* Brooklyn Bridge cables (left side) */}
      <line x1="0" y1="145" x2="90" y2="145" stroke={fill} strokeWidth="2" />
      <line x1="30" y1="145" x2="50" y2="115" stroke={fill} strokeWidth="1.5" />
      <line x1="50" y1="115" x2="50" y2="220" stroke={fill} strokeWidth="3" />
      {[35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85].map((x, i) => (
        <line key={i} x1={x} y1="145" x2="50" y2="115" stroke={fill} strokeWidth="0.8" opacity="0.7" />
      ))}

      {/* Freedom Tower */}
      <polygon points="100,42 110,42 118,220 92,220" fill={fill} />
      <polygon points="104,42 106,42 104,80 106,80" fill={hi} />
      <line x1="105" y1="20" x2="105" y2="44" stroke={fill} strokeWidth="2" />

      {/* Empire State Building */}
      <rect x="140" y="90" width="24" height="130" rx="2" fill={fill} />
      <rect x="144" y="70" width="16" height="30" rx="1" fill={fill} />
      <rect x="147" y="55" width="10" height="20" rx="1" fill={fill} />
      <line x1="152" y1="42" x2="152" y2="56" stroke={fill} strokeWidth="2.5" />

      {/* Chrysler building hint */}
      <rect x="170" y="115" width="18" height="105" rx="2" fill={fill} />
      <polygon points="170,115 179,90 188,115" fill={hi} />
      {/* Chrysler spire arcs */}
      <path d="M172,115 Q179,100 186,115" fill="none" stroke={hi} strokeWidth="1" />
      <path d="M174,110 Q179,97 184,110" fill="none" stroke={hi} strokeWidth="0.8" />

      {/* Mid-rise cluster */}
      <rect x="192" y="135" width="20" height="85" rx="1" fill={fill} />
      <rect x="215" y="125" width="22" height="95" rx="1" fill={fill} />
      <rect x="240" y="140" width="18" height="80" rx="1" fill={fill} />
      <rect x="261" y="120" width="25" height="100" rx="1" fill={fill} />
      <rect x="289" y="145" width="20" height="75" rx="1" fill={fill} />
      <rect x="312" y="130" width="18" height="90" rx="1" fill={fill} />
      <rect x="333" y="155" width="22" height="65" rx="1" fill={fill} />
      <rect x="358" y="140" width="20" height="80" rx="1" fill={fill} />

      {/* Water foreground */}
      <path d="M0,220 Q100,212 200,218 Q300,224 400,215 L400,260 L0,260Z" fill={hi} />
    </svg>
  );
}

// ─── Tokyo ────────────────────────────────────────────────────────────────────

function TokyoSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Mount Fuji silhouette (far background) */}
      <polygon points="60,160 130,68 200,160" fill={hi} style={{ filter: "blur(3px)" }} />

      {/* Tokyo Tower */}
      <polygon points="194,40 200,40 210,220 184,220" fill={fill} />
      <polygon points="196,40 204,40 202,85 198,85" fill={hi} />
      {/* Tower observation decks */}
      <rect x="189" y="115" width="18" height="6" rx="1" fill={fill} />
      <rect x="191" y="145" width="14" height="5" rx="1" fill={fill} />
      {/* Tower lattice hints */}
      <line x1="194" y1="60" x2="200" y2="220" stroke={hi} strokeWidth="0.8" />
      <line x1="206" y1="60" x2="200" y2="220" stroke={hi} strokeWidth="0.8" />
      {/* Antenna */}
      <line x1="200" y1="20" x2="200" y2="42" stroke={fill} strokeWidth="2" />

      {/* Mori Tower (Roppongi Hills) */}
      <rect x="230" y="100" width="28" height="120" rx="3" fill={fill} />
      <rect x="233" y="97" width="10" height="30" rx="1" fill={hi} />

      {/* Sunshine 60 */}
      <rect x="140" y="110" width="24" height="110" rx="2" fill={fill} />

      {/* Pagoda silhouette (left) */}
      <rect x="45" y="155" width="30" height="65" rx="1" fill={fill} />
      <polygon points="45,155 60,140 75,155" fill={fill} />
      <polygon points="48,140 60,128 72,140" fill={fill} />
      <polygon points="51,128 60,118 69,128" fill={fill} />
      <line x1="60" y1="110" x2="60" y2="120" stroke={fill} strokeWidth="1.5" />

      {/* Dense mid-rise grid */}
      <rect x="270" y="145" width="16" height="75" rx="1" fill={fill} />
      <rect x="289" y="135" width="18" height="85" rx="1" fill={fill} />
      <rect x="310" y="150" width="16" height="70" rx="1" fill={fill} />
      <rect x="329" y="140" width="20" height="80" rx="1" fill={fill} />
      <rect x="352" y="155" width="18" height="65" rx="1" fill={fill} />

      {/* Low-rise street level */}
      <rect x="0" y="185" width="400" height="35" fill={hi} style={{ filter: "blur(2px)" }} />
    </svg>
  );
}

// ─── Belagavi ─────────────────────────────────────────────────────────────────

function BelagaviSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Layered hills — horizon */}
      <ellipse cx="320" cy="160" rx="180" ry="90" fill={hi} style={{ filter: "blur(8px)" }} />
      <ellipse cx="100" cy="175" rx="160" ry="80" fill={hi} style={{ filter: "blur(6px)" }} />

      {/* Far hills */}
      <path d="M0,160 Q80,100 160,130 Q220,105 280,135 Q340,108 400,140 L400,220 L0,220Z"
            fill={hi} style={{ filter: "blur(4px)" }} />

      {/* Mid hills — forest covered */}
      <path d="M0,175 Q60,140 130,160 Q190,148 250,165 Q310,150 370,168 Q390,172 400,175 L400,220 L0,220Z"
            fill={fill} />

      {/* Forest canopy — near hill (tree silhouettes) */}
      {[10, 28, 46, 62, 78, 95, 112, 128, 145, 162, 178, 195, 212, 228, 245, 262, 278, 295, 312, 328, 345, 362, 378].map((x, i) => {
        const h = 18 + (i % 4) * 6;
        const y = 178 + (i % 3) * 5;
        return (
          <ellipse key={i} cx={x} cy={y - h / 2} rx={12 + (i % 3) * 3} ry={h / 2} fill={fill} />
        );
      })}

      {/* River winding through valley */}
      <path d="M0,208 Q60,200 120,206 Q180,212 240,204 Q300,196 360,205 Q385,208 400,206"
            stroke={hi} strokeWidth="4" fill="none" style={{ filter: "blur(1px)" }} />

      {/* Fort Belgaum silhouette (center-left) */}
      <rect x="155" y="168" width="70" height="30" rx="2" fill={hi} />
      <rect x="148" y="162" width="12" height="18" rx="1" fill={hi} />
      <rect x="215" y="162" width="12" height="18" rx="1" fill={hi} />
      {/* Battlements */}
      {[150, 158, 164, 170].map((x, i) => (
        <rect key={i} x={x} y="158" width="5" height="6" rx="1" fill={hi} />
      ))}
      {[210, 216, 222].map((x, i) => (
        <rect key={i} x={x} y="158" width="5" height="6" rx="1" fill={hi} />
      ))}

      {/* Monsoon cloud bank (top) */}
      <ellipse cx="280" cy="65" rx="100" ry="40" fill={fill} style={{ filter: "blur(14px)", opacity: 0.6 }} />
      <ellipse cx="150" cy="80" rx="80" ry="30" fill={fill} style={{ filter: "blur(10px)", opacity: 0.5 }} />

      {/* Foreground land */}
      <path d="M0,215 Q100,210 200,215 Q300,218 400,213 L400,260 L0,260Z" fill={fill} />
    </svg>
  );
}

// ─── London ───────────────────────────────────────────────────────────────────

function LondonSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Thames reflection */}
      <ellipse cx="200" cy="245" rx="260" ry="55" fill={hi} style={{ filter: "blur(8px)" }} />

      {/* The Shard */}
      <polygon points="155,35 168,35 195,220 128,220" fill={fill} />
      <polygon points="158,35 165,35 180,100 143,100" fill={hi} />

      {/* Gherkin (30 St Mary Axe) */}
      <ellipse cx="240" cy="100" rx="16" ry="85" fill={fill} />
      <line x1="224" y1="100" x2="256" y2="100" stroke={hi} strokeWidth="0.8" />
      <line x1="224" y1="115" x2="256" y2="115" stroke={hi} strokeWidth="0.8" />
      <line x1="226" y1="130" x2="254" y2="130" stroke={hi} strokeWidth="0.8" />
      <line x1="230" y1="145" x2="250" y2="145" stroke={hi} strokeWidth="0.8" />

      {/* Walkie Talkie (20 Fenchurch) */}
      <path d="M270,220 L268,155 Q268,140 285,140 Q302,140 302,155 L300,220Z" fill={fill} />

      {/* BT Tower spire hint */}
      <rect x="95" y="115" width="14" height="105" rx="2" fill={fill} />
      <rect x="92" y="105" width="20" height="15" rx="2" fill={fill} />
      <line x1="102" y1="90" x2="102" y2="107" stroke={fill} strokeWidth="2" />

      {/* Big Ben clock tower */}
      <rect x="38" y="120" width="22" height="100" rx="1" fill={fill} />
      <rect x="35" y="110" width="28" height="14" rx="1" fill={fill} />
      <polygon points="35,110 49,88 63,110" fill={fill} />
      <line x1="49" y1="78" x2="49" y2="90" stroke={fill} strokeWidth="2.5" />

      {/* Mid-rise London cluster */}
      <rect x="316" y="145" width="20" height="75" rx="1" fill={fill} />
      <rect x="339" y="155" width="18" height="65" rx="1" fill={fill} />
      <rect x="360" y="162" width="22" height="58" rx="1" fill={fill} />
      <rect x="120" y="165" width="25" height="55" rx="1" fill={fill} />

      {/* Westminster Bridge hint */}
      <path d="M0,208 Q60,204 120,208 Q180,212 240,207 Q320,203 400,208"
            stroke={fill} strokeWidth="6" fill="none" />
      {/* Bridge arch openings */}
      <path d="M0,208 Q200,200 400,208" stroke={hi} strokeWidth="2" fill="none" />
    </svg>
  );
}

// ─── Singapore ────────────────────────────────────────────────────────────────

function SingaporeSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Marina Bay water reflection */}
      <ellipse cx="200" cy="250" rx="250" ry="60" fill={hi} style={{ filter: "blur(10px)" }} />

      {/* Marina Bay Sands — three towers + infinity pool roof */}
      <rect x="148" y="110" width="20" height="110" rx="2" fill={fill} />
      <rect x="178" y="115" width="20" height="105" rx="2" fill={fill} />
      <rect x="208" y="108" width="20" height="112" rx="2" fill={fill} />
      {/* Boat-shaped roof */}
      <path d="M140,110 Q188,90 236,108 L236,118 Q188,100 140,120Z" fill={fill} />
      <rect x="140" y="110" width="96" height="10" rx="1" fill={hi} />

      {/* Supertrees */}
      {[280, 300, 318].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={150 + i * 5} x2={x} y2="220" stroke={fill} strokeWidth="6" />
          <ellipse cx={x} cy={150 + i * 5} rx={22 - i * 2} ry={14 - i} fill={fill} />
          {/* Fronds */}
          {[-15, -8, 0, 8, 15].map((dx, j) => (
            <line key={j} x1={x} y1={150 + i * 5}
                  x2={x + dx} y2={140 + i * 5 - 12}
                  stroke={hi} strokeWidth="1.5" />
          ))}
        </g>
      ))}

      {/* One Raffles Place */}
      <rect x="72" y="95" width="26" height="125" rx="2" fill={fill} />
      <polygon points="72,95 85,72 98,95" fill={fill} />

      {/* Republic Plaza */}
      <rect x="104" y="115" width="22" height="105" rx="2" fill={fill} />
      <polygon points="104,115 115,96 126,115" fill={fill} />

      {/* Low-rise foreground */}
      <rect x="350" y="170" width="40" height="50" rx="2" fill={fill} />
      <rect x="0" y="180" width="60" height="40" rx="2" fill={fill} />

      {/* Bay water */}
      <path d="M0,215 Q100,208 200,214 Q300,220 400,212 L400,260 L0,260Z" fill={hi} />
    </svg>
  );
}

// ─── Mumbai ───────────────────────────────────────────────────────────────────

function MumbaiSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Arabian Sea glow */}
      <ellipse cx="200" cy="248" rx="260" ry="55" fill={hi} style={{ filter: "blur(8px)" }} />

      {/* Marine Drive arc (necklace of lights) */}
      <path d="M0,210 Q200,190 400,210" stroke={hi} strokeWidth="2" fill="none" />

      {/* Bandra-Kurla complex high-rises */}
      <rect x="30" y="120" width="22" height="100" rx="2" fill={fill} />
      <rect x="56" y="105" width="20" height="115" rx="2" fill={fill} />
      <rect x="80" y="115" width="22" height="105" rx="2" fill={fill} />
      <rect x="106" y="95" width="24" height="125" rx="2" fill={fill} />
      <rect x="134" y="110" width="20" height="110" rx="2" fill={fill} />

      {/* Antilia-like super-tower */}
      <rect x="165" y="72" width="32" height="148" rx="3" fill={fill} />
      {/* Irregular floor plates */}
      {[80, 95, 110, 125, 140, 155, 170].map((y, i) => (
        <rect key={i} x={162 + (i % 2) * 4} y={y} width={36 - (i % 2) * 8} height="4" rx="1" fill={hi} />
      ))}

      {/* World One hint */}
      <polygon points="208,60 220,60 228,220 200,220" fill={fill} />

      {/* Dense mid-rises */}
      <rect x="235" y="130" width="18" height="90" rx="1" fill={fill} />
      <rect x="256" y="118" width="20" height="102" rx="1" fill={fill} />
      <rect x="279" y="138" width="18" height="82" rx="1" fill={fill} />
      <rect x="300" y="125" width="22" height="95" rx="1" fill={fill} />
      <rect x="325" y="142" width="18" height="78" rx="1" fill={fill} />
      <rect x="346" y="130" width="20" height="90" rx="1" fill={fill} />
      <rect x="368" y="148" width="22" height="72" rx="1" fill={fill} />

      {/* Gateway of India arch hint */}
      <rect x="20" y="182" width="28" height="38" rx="2" fill={hi} />
      <path d="M20,182 Q34,165 48,182" fill={hi} />

      {/* Sea foreground */}
      <path d="M0,218 Q100,212 200,217 Q300,222 400,216 L400,260 L0,260Z" fill={hi} />
    </svg>
  );
}

// ─── Delhi ────────────────────────────────────────────────────────────────────

function DelhiSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Hazardous haze base */}
      <ellipse cx="200" cy="200" rx="260" ry="70" fill={hi} style={{ filter: "blur(16px)", opacity: 0.7 }} />

      {/* India Gate arch */}
      <rect x="170" y="160" width="60" height="60" rx="2" fill={hi} />
      <path d="M162,160 Q200,118 238,160" fill={fill} />
      <rect x="162" y="155" width="76" height="10" rx="1" fill={fill} />
      <rect x="175" y="145" width="50" height="12" rx="1" fill={hi} />

      {/* Lotus Temple dome silhouette */}
      <ellipse cx="310" cy="165" rx="45" ry="35" fill={fill} style={{ filter: "blur(2px)" }} />
      {[-30, -15, 0, 15, 30].map((dx, i) => (
        <ellipse key={i} cx={310 + dx} cy={160} rx={10} ry={25} fill={fill} />
      ))}

      {/* Qutub Minar */}
      <polygon points="60,90 70,90 76,220 54,220" fill={fill} />
      <rect x="55" y="125" width="20" height="5" rx="1" fill={hi} />
      <rect x="56" y="155" width="18" height="5" rx="1" fill={hi} />
      <rect x="57" y="182" width="16" height="5" rx="1" fill={hi} />

      {/* Akshardham dome */}
      <rect x="100" y="170" width="50" height="50" rx="2" fill={hi} />
      <ellipse cx="125" cy="168" rx="30" ry="18" fill={fill} />
      <ellipse cx="125" cy="162" rx="16" ry="10" fill={hi} />

      {/* Modern Delhi high-rises */}
      <rect x="235" y="125" width="20" height="95" rx="2" fill={fill} />
      <rect x="258" y="110" width="22" height="110" rx="2" fill={fill} />
      <rect x="283" y="130" width="20" height="90" rx="2" fill={fill} />
      <rect x="355" y="145" width="22" height="75" rx="2" fill={fill} />
      <rect x="380" y="155" width="18" height="65" rx="2" fill={fill} />

      {/* Haze layer */}
      <rect x="0" y="0" width="400" height="80" fill={hi} style={{ filter: "blur(20px)", opacity: 0.4 }} />
    </svg>
  );
}

// ─── Bengaluru ────────────────────────────────────────────────────────────────

function BengaluruSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      {/* Garden backdrop — green hills */}
      <ellipse cx="320" cy="175" rx="140" ry="60" fill={hi} style={{ filter: "blur(8px)" }} />

      {/* UB City tower cluster */}
      <rect x="140" y="95" width="28" height="125" rx="3" fill={fill} />
      <rect x="143" y="88" width="10" height="20" rx="1" fill={hi} />
      <rect x="172" y="110" width="24" height="110" rx="2" fill={fill} />
      <rect x="200" y="125" width="20" height="95" rx="2" fill={fill} />

      {/* Prestige towers */}
      <rect x="225" y="105" width="22" height="115" rx="2" fill={fill} />
      <rect x="251" y="118" width="20" height="102" rx="2" fill={fill} />

      {/* Vidhana Soudha dome hint (government building) */}
      <rect x="55" y="158" width="70" height="62" rx="2" fill={hi} />
      <ellipse cx="90" cy="156" rx="32" ry="16" fill={fill} />
      <ellipse cx="90" cy="148" rx="18" ry="10" fill={hi} />
      <line x1="90" y1="130" x2="90" y2="150" stroke={fill} strokeWidth="2.5" />
      {/* Pillars */}
      {[62, 72, 82, 92, 102, 112].map((x, i) => (
        <rect key={i} x={x} y="165" width="5" height="35" rx="1" fill={fill} />
      ))}

      {/* Tech park campus (right) — glass boxes */}
      <rect x="290" y="145" width="30" height="75" rx="3" fill={fill} />
      <rect x="290" y="145" width="30" height="75" rx="3" stroke={hi} strokeWidth="1" fill="none" />
      {[150, 158, 166, 174, 182, 190].map((y, i) => (
        <line key={i} x1="290" y1={y} x2="320" y2={y} stroke={hi} strokeWidth="0.6" />
      ))}
      <rect x="323" y="155" width="26" height="65" rx="3" fill={fill} />
      <rect x="352" y="162" width="28" height="58" rx="3" fill={fill} />

      {/* Tree boulevard */}
      {[0, 20, 40, 60, 80, 100].map((x, i) => (
        <ellipse key={i} cx={x} cy={205} rx={12} ry={18} fill={fill} />
      ))}

      {/* Ground */}
      <rect x="0" y="215" width="400" height="15" fill={hi} />
    </svg>
  );
}

// ─── Default (generic smart city) ─────────────────────────────────────────────

function DefaultSkyline({ fill, hi }: { fill: string; hi: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none">
      <ellipse cx="200" cy="240" rx="220" ry="60" fill={fill} style={{ filter: "blur(10px)" }} />

      {/* Buildings */}
      <rect x="20" y="130" width="28" height="90" rx="2" fill={fill} />
      <rect x="52" y="100" width="22" height="120" rx="2" fill={fill} />
      <rect x="78" y="115" width="18" height="105" rx="2" fill={fill} />
      <rect x="100" y="85" width="30" height="135" rx="2" fill={fill} />
      <rect x="134" y="105" width="20" height="115" rx="2" fill={fill} />
      <rect x="158" y="120" width="24" height="100" rx="2" fill={fill} />

      {/* Wind turbine */}
      <line x1="250" y1="220" x2="250" y2="95" stroke={fill} strokeWidth="3.5" />
      <ellipse cx="250" cy="95" rx="5" ry="40" fill={fill} />
      <ellipse cx="250" cy="95" rx="5" ry="40" fill={fill} transform="rotate(120 250 95)" />
      <ellipse cx="250" cy="95" rx="5" ry="40" fill={fill} transform="rotate(240 250 95)" />

      {/* Solar array */}
      <rect x="285" y="160" width="50" height="22" rx="2" fill={fill} transform="skewY(-6)" />
      <rect x="288" y="155" width="2" height="48" rx="1" fill={fill} />
      <rect x="330" y="155" width="2" height="48" rx="1" fill={fill} />

      {/* Trees */}
      <ellipse cx="340" cy="188" rx="18" ry="26" fill={fill} />
      <ellipse cx="365" cy="194" rx="14" ry="20" fill={fill} />
      <ellipse cx="388" cy="190" rx="12" ry="18" fill={fill} />

      {/* Ground */}
      <path d="M0,215 Q200,208 400,215 L400,260 L0,260Z" fill={hi} />
    </svg>
  );
}

import type React from "react";

// ─── City router ──────────────────────────────────────────────────────────────

const CITY_MAP: Record<string, (props: { fill: string; hi: string }) => React.ReactElement> = {
  dubai:     DubaiSkyline,
  newyork:   NewYorkSkyline,
  tokyo:     TokyoSkyline,
  belagavi:  BelagaviSkyline,
  bengaluru: BengaluruSkyline,
  mumbai:    MumbaiSkyline,
  london:    LondonSkyline,
  singapore: SingaporeSkyline,
  delhi:     DelhiSkyline,
};

export interface CitySkylineSceneProps {
  cityId: string;
  aqiTier: AQITier;
}

export function CitySkylineScene({ cityId, aqiTier }: CitySkylineSceneProps) {
  const fill = skylineColor(aqiTier);
  const hi   = skylineHighlight(aqiTier);

  const Skyline = CITY_MAP[cityId] ?? DefaultSkyline;

  return (
    <div
      aria-hidden
      className="hidden md:block absolute right-0 bottom-0 h-full w-[52%] pointer-events-none"
    >
      <Skyline fill={fill} hi={hi} />
    </div>
  );
}
