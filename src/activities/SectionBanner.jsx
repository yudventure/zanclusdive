// Illustrated banner that opens each part of an activity page. Each activity
// has its own scenes and colors so diving, snorkeling and sea trip pages read
// as different places. Scenes are inline SVG on a 320×140 canvas.
const ink = "#0b4a5c";
const sand = "#f4b860";
const coral = "#ff8a65";
const sea1 = "#1f8f8a";
const sea2 = "#5fb7a8";
const ice = "#bdeefa";

const waves = (y = 112, color = ink) => (
  <>
    <path
      d={`M0 ${y}c26 0 26-8 53-8s27 8 53 8 27-8 53-8 27 8 54 8 26-8 53-8 27 8 54 8`}
      stroke={color}
      strokeOpacity=".22"
      strokeWidth="2"
      fill="none"
    />
    <path
      d={`M0 ${y + 14}c26 0 26-7 53-7s27 7 53 7 27-7 53-7 27 7 54 7 26-7 53-7 27 7 54 7`}
      stroke={color}
      strokeOpacity=".14"
      strokeWidth="2"
      fill="none"
    />
  </>
);
const bubbles = (
  <g fill="none" stroke={ink} strokeOpacity=".35" strokeWidth="1.6">
    <circle cx="42" cy="34" r="5" />
    <circle cx="56" cy="18" r="3" />
    <circle cx="292" cy="28" r="4" />
    <circle cx="280" cy="12" r="2.5" />
  </g>
);
const sun = (x, y, r = 16) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={sand} />
    <g stroke={sand} strokeWidth="2.5" strokeLinecap="round">
      <path
        d={`M${x} ${y - r - 8}v-5M${x} ${y + r + 8}v5M${x - r - 8} ${y}h-5M${x + r + 8} ${y}h5`}
      />
    </g>
  </g>
);
const fish = (x, y, color, flip = false) => (
  <g transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""}`}>
    <path d="M0 0c8-8 22-8 30 0-8 8-22 8-30 0z" fill={color} />
    <path d="M30 0l9-7v14z" fill={color} />
    <circle cx="8" cy="-1.5" r="1.6" fill="#fff" />
  </g>
);
const tag = (x, y, color = sand) => (
  <g transform={`translate(${x} ${y}) rotate(-12)`}>
    <path d="M0 8l8-8h44a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H8l-8-8z" fill={color} />
    <circle cx="10" cy="18" r="3.5" fill="#fff" />
    <text
      x="34"
      y="24"
      textAnchor="middle"
      fontSize="13"
      fontWeight="800"
      fill={ink}
    >
      Rp
    </text>
  </g>
);
const question = (x, y, fill = "#fff") => (
  <g>
    <path
      d={`M${x} ${y}h80a14 14 0 0 1 14 14v24a14 14 0 0 1-14 14h-48l-16 14v-14h-16a14 14 0 0 1-14-14V${y + 14}a14 14 0 0 1 14-14z`}
      fill={fill}
      stroke={ink}
      strokeWidth="2"
    />
    <text
      x={x + 40}
      y={y + 36}
      textAnchor="middle"
      fontSize="28"
      fontWeight="800"
      fill={ink}
    >
      ?
    </text>
  </g>
);
const diver = (x, y, angle = -8) => (
  <g transform={`translate(${x} ${y}) rotate(${angle})`}>
    <rect x="0" y="6" width="58" height="16" rx="8" fill={ink} />
    <rect x="8" y="0" width="30" height="9" rx="4.5" fill={sand} />
    <circle cx="66" cy="13" r="10" fill={ink} />
    <rect x="62" y="8" width="12" height="7" rx="3" fill={ice} />
    <path d="M0 10l-24-10 4 14zM0 18l-24 4 6 10z" fill={sea1} />
  </g>
);
const reef = (
  <path
    d="M70 128c8-22 18-30 30-30s16 14 26 14 14-22 30-22 18 22 28 22 12-10 22-10 16 16 20 26z"
    fill={sea2}
    opacity=".55"
  />
);
const islands = (
  <>
    <path d="M150 96c6-34 16-52 26-52s16 30 20 52z" fill={sea1} />
    <path d="M186 96c4-22 12-34 20-34s12 20 14 34z" fill={sea2} />
    <path d="M118 96c4-16 10-24 16-24s10 12 12 24z" fill={sea2} opacity=".8" />
  </>
);

const scenes = {
  diving: {
    about: (
      <>
        {waves()}
        {bubbles}
        {reef}
        {diver(132, 42)}
        {fish(232, 88, sand)}
        {fish(250, 104, coral, true)}
      </>
    ),
    prices: (
      <>
        {waves()}
        {bubbles}
        <rect x="104" y="36" width="34" height="80" rx="16" fill={ink} />
        <rect x="112" y="26" width="18" height="14" rx="4" fill={sand} />
        <rect x="104" y="64" width="34" height="8" fill={ice} opacity=".6" />
        {tag(168, 50)}
        {fish(250, 100, sea2, true)}
      </>
    ),
    itinerary: (
      <>
        {waves(18)}
        {/* Boat at the surface, descent line with depth marks, diver below */}
        <path d="M110 22h70l-10 14h-50z" fill={ink} />
        <path
          d="M150 36v78"
          stroke={ink}
          strokeWidth="2"
          strokeDasharray="4 5"
        />
        {[
          [56, "5 m"],
          [80, "12 m"],
          [104, "18 m"],
        ].map(([y, label]) => (
          <g key={label}>
            <path d={`M144 ${y}h12`} stroke={ink} strokeWidth="2" />
            <text x="164" y={y + 4} fontSize="11" fontWeight="700" fill={ink}>
              {label}
            </text>
          </g>
        ))}
        {diver(206, 92, 10)}
        {reef}
      </>
    ),
    prep: (
      <>
        {waves()}
        {bubbles}
        <rect x="92" y="34" width="34" height="80" rx="16" fill={sand} />
        <rect x="100" y="24" width="18" height="14" rx="4" fill={ink} />
        <g transform="translate(150 50)">
          <rect x="0" y="0" width="70" height="34" rx="15" fill={ink} />
          <rect x="7" y="7" width="25" height="20" rx="8" fill={ice} />
          <rect x="38" y="7" width="25" height="20" rx="8" fill={ice} />
        </g>
        {/* Dive computer */}
        <rect x="236" y="70" width="34" height="34" rx="9" fill={ink} />
        <rect x="242" y="76" width="22" height="16" rx="3" fill={sea2} />
        <path
          d="M238 104v8M268 104v8M238 70v-8M268 70v-8"
          stroke={ink}
          strokeWidth="4"
        />
      </>
    ),
    faq: (
      <>
        {waves()}
        {bubbles}
        {question(110, 26)}
        {/* Diver-down flag */}
        <path d="M244 114V36" stroke={ink} strokeWidth="3" />
        <rect x="244" y="36" width="44" height="30" fill="#e2463a" />
        <path d="M244 36l44 30" stroke="#fff" strokeWidth="6" />
      </>
    ),
  },
  snorkeling: {
    about: (
      <>
        {sun(258, 32)}
        {/* Snorkeler floating on the surface */}
        <path d="M0 74h320" stroke={sea1} strokeOpacity=".5" strokeWidth="2" />
        <rect
          x="104"
          y="72"
          width="70"
          height="16"
          rx="8"
          fill={ink}
          opacity=".35"
        />
        <circle cx="184" cy="72" r="12" fill={ink} />
        <rect x="178" y="70" width="14" height="8" rx="3" fill={ice} />
        <path
          d="M176 66V44a4 4 0 0 1 8 0"
          stroke={coral}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M104 76l-22-8 4 14z" fill={sea1} opacity=".6" />
        {fish(214, 104, sand)}
        {fish(120, 112, coral, true)}
        <path
          d="M60 128c10-14 20-18 30-18s14 10 22 10 12-12 24-12 14 12 22 20z"
          fill={sea2}
          opacity=".5"
        />
      </>
    ),
    prices: (
      <>
        {sun(270, 30, 13)}
        {waves(104, sea1)}
        <g transform="translate(96 46)">
          <rect x="0" y="0" width="64" height="30" rx="13" fill={sea1} />
          <rect x="6" y="6" width="22" height="18" rx="7" fill={ice} />
          <rect x="36" y="6" width="22" height="18" rx="7" fill={ice} />
          <path
            d="M66 14h8V-12a5 5 0 0 1 10 0"
            stroke={coral}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        {tag(196, 56)}
      </>
    ),
    itinerary: (
      <>
        {sun(286, 26, 11)}
        {/* Beach, boat and a buoy over the reef, linked at the surface */}
        <path d="M0 80c30-20 60-24 90-18v70H0z" fill="#f6dfb0" />
        <path d="M0 80h320" stroke={sea1} strokeOpacity=".35" strokeWidth="2" />
        <path
          d="M70 74c40-18 90-18 130-4s60 10 80 0"
          stroke={ink}
          strokeWidth="2.4"
          strokeDasharray="2 8"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M150 66h48l-8 12h-32z" fill={ink} />
        <path d="M168 66V50l16 12z" fill={sand} />
        <circle cx="274" cy="74" r="9" fill={coral} />
        <path d="M274 65v-10" stroke={ink} strokeWidth="2" />
        <path
          d="M230 128c8-14 16-18 24-18s12 10 20 10 10-10 20-10 10 10 14 18z"
          fill={sea2}
          opacity=".55"
        />
      </>
    ),
    prep: (
      <>
        {sun(276, 30, 12)}
        {waves(110, sea1)}
        {/* Life vest, sunscreen and fins */}
        <path
          d="M92 40h18l6 10h12l6-10h18v62a8 8 0 0 1-8 8H100a8 8 0 0 1-8-8z"
          fill={coral}
        />
        <path d="M100 62h52M100 82h52" stroke="#fff" strokeWidth="4" />
        <rect
          x="176"
          y="46"
          width="24"
          height="56"
          rx="8"
          fill="#fff"
          stroke={ink}
          strokeWidth="2"
        />
        <rect x="182" y="38" width="12" height="10" rx="3" fill={sand} />
        <text
          x="188"
          y="80"
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fill={ink}
        >
          SPF
        </text>
        <path d="M222 108l12-40c3-8 12-8 14 0l8 40z" fill={sea1} />
        <path d="M250 108l10-34c3-7 11-6 13 1l5 33z" fill={sea2} />
      </>
    ),
    faq: (
      <>
        {sun(286, 26, 11)}
        {waves(112, sea1)}
        {question(96, 24)}
        {/* Life ring */}
        <circle
          cx="246"
          cy="80"
          r="28"
          fill="none"
          stroke={coral}
          strokeWidth="14"
        />
        <circle
          cx="246"
          cy="80"
          r="28"
          fill="none"
          stroke="#fff"
          strokeWidth="14"
          strokeDasharray="14 30"
        />
      </>
    ),
  },
  trip: {
    about: (
      <>
        {sun(64, 34, 14)}
        {islands}
        <path d="M0 96h320" stroke={ink} strokeOpacity=".2" strokeWidth="2" />
        {waves(112)}
        {/* Speedboat */}
        <path
          d="M206 100h84l-14 14h-62z"
          fill="#fff"
          stroke={ink}
          strokeWidth="2"
        />
        <rect x="226" y="88" width="30" height="12" rx="3" fill={ink} />
        <path
          d="M200 112c-12 0-20-2-30-4"
          stroke={sea1}
          strokeWidth="2"
          fill="none"
        />
      </>
    ),
    prices: (
      <>
        {sun(270, 30, 13)}
        {waves(112)}
        <path d="M96 96h84l-14 16h-56z" fill={ink} />
        <rect
          x="116"
          y="80"
          width="40"
          height="16"
          rx="3"
          fill="#fff"
          stroke={ink}
          strokeWidth="2"
        />
        {tag(196, 56)}
      </>
    ),
    itinerary: (
      <>
        {/* Top-down map: harbour pin, islands and the boat route */}
        <path
          d="M20 112c40-10 70 6 100-2s50-10 80 0"
          stroke={ink}
          strokeOpacity=".15"
          strokeWidth="10"
          fill="none"
        />
        <path d="M150 70c6-14 24-16 32-6s2 22-12 22-24-4-20-16z" fill={sea2} />
        <path d="M222 44c8-10 24-8 28 2s-4 18-16 18-18-10-12-20z" fill={sea1} />
        <path
          d="M250 96c4-8 16-8 20 0s-2 14-10 14-12-6-10-14z"
          fill={sea2}
          opacity=".8"
        />
        <path
          d="M96 96C120 70 150 96 176 80s40-30 60-24 30 30 28 46"
          stroke={ink}
          strokeWidth="2.4"
          strokeDasharray="2 8"
          strokeLinecap="round"
          fill="none"
        />
        <g transform="translate(80 70)">
          <path
            d="M16 0a16 16 0 0 1 16 16c0 14-16 30-16 30S0 30 0 16A16 16 0 0 1 16 0z"
            fill={coral}
          />
          <circle cx="16" cy="16" r="6" fill="#fff" />
        </g>
      </>
    ),
    prep: (
      <>
        {sun(286, 26, 11)}
        {waves(116)}
        {/* Backpack, sun hat and camera */}
        <rect x="90" y="40" width="54" height="70" rx="16" fill={sea1} />
        <rect x="100" y="70" width="34" height="26" rx="6" fill={sea2} />
        <path
          d="M104 40v-6a13 13 0 0 1 26 0v6"
          stroke={ink}
          strokeWidth="4"
          fill="none"
        />
        <ellipse cx="196" cy="98" rx="34" ry="8" fill={sand} />
        <path d="M176 98c0-18 8-28 20-28s20 10 20 28z" fill={sand} />
        <path d="M176 92h40" stroke={coral} strokeWidth="4" />
        <rect x="236" y="62" width="46" height="34" rx="7" fill={ink} />
        <circle
          cx="259"
          cy="79"
          r="10"
          fill={ice}
          stroke="#fff"
          strokeWidth="3"
        />
        <rect x="244" y="56" width="14" height="8" rx="2" fill={ink} />
      </>
    ),
    faq: (
      <>
        {sun(286, 26, 11)}
        {waves(116)}
        {question(90, 24)}
        {/* Compass */}
        <circle
          cx="246"
          cy="80"
          r="28"
          fill="#fff"
          stroke={ink}
          strokeWidth="3"
        />
        <path d="M246 58l8 22-8 22-8-22z" fill={coral} />
        <path d="M246 80l8 0-8 22-8-22z" fill={ink} />
      </>
    ),
  },
  shared: {
    calendar: (
      <>
        {waves()}
        {bubbles}
        <rect
          x="120"
          y="26"
          width="110"
          height="92"
          rx="14"
          fill="#fff"
          stroke={ink}
          strokeWidth="2"
        />
        <rect x="120" y="26" width="110" height="28" rx="14" fill={ink} />
        <rect x="120" y="40" width="110" height="14" fill={ink} />
        <path
          d="M144 18v18M206 18v18"
          stroke={ink}
          strokeWidth="4"
          strokeLinecap="round"
        />
        {[0, 1, 2, 3].map((c) =>
          [0, 1].map((r) => (
            <rect
              key={c + "-" + r}
              x={134 + c * 22}
              y={66 + r * 22}
              width="14"
              height="12"
              rx="3"
              fill={c === 2 && r === 0 ? sand : ink}
              opacity={c === 2 && r === 0 ? 1 : 0.18}
            />
          )),
        )}
        {fish(250, 96, sea2)}
      </>
    ),
    season: (
      <>
        {waves()}
        {sun(200, 62, 26)}
        <path
          d="M96 66a14 14 0 0 1 26-6 11 11 0 0 1 16 10h-46a8 8 0 0 1 4-4z"
          fill="#fff"
          stroke={ink}
          strokeWidth="2"
        />
        <path
          d="M120 100c20-8 40 8 60 0s40-8 60 0 30 6 40 2"
          stroke={sea1}
          strokeWidth="3"
          fill="none"
        />
      </>
    ),
    spots: (
      <>
        {waves()}
        {bubbles}
        <path
          d="M90 112c10-30 40-46 70-46s54 20 64 46z"
          fill={sea2}
          opacity=".55"
        />
        <path d="M150 70c-4-18 4-30 16-34-6 10-6 20-2 32" fill={sea1} />
        <g transform="translate(228 30)">
          <path
            d="M16 0a16 16 0 0 1 16 16c0 14-16 32-16 32S0 30 0 16A16 16 0 0 1 16 0z"
            fill={coral}
          />
          <circle cx="16" cy="16" r="6" fill="#fff" />
        </g>
        {fish(84, 92, sand, true)}
      </>
    ),
    eco: (
      <>
        {waves()}
        {bubbles}
        <path
          d="M120 116V84M120 96l-12-14M120 90l14-16M108 82V66M134 74V60"
          stroke={coral}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M196 116V78"
          stroke={sea1}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M196 86c-18 0-26-12-26-24 16 0 26 8 26 24zM196 80c4-18 18-24 30-22-2 16-14 24-30 22z"
          fill={sea2}
        />
        <path
          d="M256 54c-6-12-26-8-22 8 2 8 22 20 22 20s20-12 22-20c4-16-16-20-22-8z"
          fill={sand}
        />
      </>
    ),
  },
};

// Banner background per activity and part.
export const bannerTones = {
  diving: {
    about: "#e3edf9",
    prices: "#e7ecfa",
    itinerary: "#e0edf5",
    prep: "#eceffa",
    faq: "#e5ebf7",
  },
  snorkeling: {
    about: "#dcf4ef",
    prices: "#fff3d6",
    itinerary: "#e0f6f1",
    prep: "#fff0dc",
    faq: "#e2f5f3",
  },
  trip: {
    about: "#fbecd9",
    prices: "#f3ebdc",
    itinerary: "#e8f1e1",
    prep: "#fbefe0",
    faq: "#f1ebe0",
  },
  shared: {
    calendar: "#e5f3f5",
    season: "#fbf1dc",
    spots: "#e8f5ea",
    eco: "#e9f6e3",
  },
};

export default function SectionBanner({
  theme = "shared",
  kind,
  eyebrow,
  title,
  intro,
  id,
}) {
  return (
    <div
      className={`section-banner section-banner-${theme} section-banner-${kind}`}
      style={{ "--banner-tone": bannerTones[theme]?.[kind] }}
    >
      <div className="section-banner-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        {intro && <p className="section-banner-intro">{intro}</p>}
      </div>
      <svg
        className="section-banner-art"
        viewBox="0 0 320 140"
        aria-hidden="true"
        focusable="false"
      >
        {scenes[theme]?.[kind]}
      </svg>
    </div>
  );
}
