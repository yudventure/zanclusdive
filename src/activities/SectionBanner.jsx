// Illustrated banner that opens each part of an activity page. The scenes are
// drawn inline (no image requests) on a 320×140 canvas: sea lines, bubbles and
// one object that says what the part is about.
const ink = "#0b4a5c";
const sea = (
  <>
    <path
      d="M0 112c26 0 26-8 53-8s27 8 53 8 27-8 53-8 27 8 54 8 26-8 53-8 27 8 54 8"
      stroke={ink}
      strokeOpacity=".22"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M0 126c26 0 26-7 53-7s27 7 53 7 27-7 53-7 27 7 54 7 26-7 53-7 27 7 54 7"
      stroke={ink}
      strokeOpacity=".14"
      strokeWidth="2"
      fill="none"
    />
    <g fill="none" stroke={ink} strokeOpacity=".35" strokeWidth="1.6">
      <circle cx="42" cy="34" r="5" />
      <circle cx="56" cy="18" r="3" />
      <circle cx="292" cy="28" r="4" />
      <circle cx="280" cy="12" r="2.5" />
    </g>
  </>
);
const fish = (x, y, color, flip = false) => (
  <g transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""}`}>
    <path d="M0 0c8-8 22-8 30 0-8 8-22 8-30 0z" fill={color} />
    <path d="M30 0l9-7v14z" fill={color} />
    <circle cx="8" cy="-1.5" r="1.6" fill="#fff" />
  </g>
);

const scenes = {
  about: (
    <>
      {/* Diver gliding over a reef */}
      <path
        d="M70 128c8-22 18-30 30-30s16 14 26 14 14-22 30-22 18 22 28 22 12-10 22-10 16 16 20 26z"
        fill="#5fb7a8"
        opacity=".55"
      />
      <g transform="translate(132 42) rotate(-8)">
        <rect x="0" y="6" width="58" height="16" rx="8" fill={ink} />
        <rect x="8" y="0" width="30" height="9" rx="4.5" fill="#f4b860" />
        <circle cx="66" cy="13" r="10" fill={ink} />
        <rect x="62" y="8" width="12" height="7" rx="3" fill="#bdeefa" />
        <path d="M0 10l-24-10 4 14zM0 18l-24 4 6 10z" fill="#1f8f8a" />
      </g>
      {fish(232, 88, "#f4b860")}
      {fish(250, 104, "#ff8a65", true)}
      <circle cx="214" cy="36" r="3" fill="none" stroke={ink} />
      <circle cx="220" cy="24" r="2" fill="none" stroke={ink} />
    </>
  ),
  itinerary: (
    <>
      {/* Route with numbered buoys to a flag */}
      <path
        d="M60 104c40-40 70 10 110-20s60-40 100-8"
        stroke={ink}
        strokeWidth="2.4"
        strokeDasharray="2 8"
        strokeLinecap="round"
        fill="none"
      />
      {[
        [60, 104, "1"],
        [128, 86, "2"],
        [200, 64, "3"],
      ].map(([x, y, n]) => (
        <g key={n}>
          <circle
            cx={x}
            cy={y}
            r="13"
            fill="#fff"
            stroke={ink}
            strokeWidth="2"
          />
          <text
            x={x}
            y={y + 4.5}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill={ink}
          >
            {n}
          </text>
        </g>
      ))}
      <path d="M270 96V44" stroke={ink} strokeWidth="2.4" />
      <path d="M270 44h30l-8 10 8 10h-30z" fill="#f4b860" />
      <ellipse cx="270" cy="98" rx="16" ry="4" fill={ink} opacity=".2" />
    </>
  ),
  prep: (
    <>
      {/* Mask, fins and tank */}
      <rect x="92" y="34" width="34" height="80" rx="16" fill="#f4b860" />
      <rect x="100" y="24" width="18" height="14" rx="4" fill={ink} />
      <rect x="92" y="62" width="34" height="8" fill={ink} opacity=".25" />
      <g transform="translate(150 50)">
        <rect x="0" y="0" width="70" height="34" rx="15" fill={ink} />
        <rect x="7" y="7" width="25" height="20" rx="8" fill="#bdeefa" />
        <rect x="38" y="7" width="25" height="20" rx="8" fill="#bdeefa" />
        <path
          d="M-8 12h8M70 12h8"
          stroke={ink}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <path d="M232 112l14-46c3-8 13-8 15 0l10 46z" fill="#1f8f8a" />
      <path d="M262 112l10-40c3-8 12-7 14 1l6 39z" fill="#5fb7a8" />
    </>
  ),
  faq: (
    <>
      {/* Two speech bubbles */}
      <path
        d="M120 30h96a16 16 0 0 1 16 16v26a16 16 0 0 1-16 16h-60l-18 16v-16h-18a16 16 0 0 1-16-16V46a16 16 0 0 1 16-16z"
        fill="#fff"
        stroke={ink}
        strokeWidth="2"
      />
      <text
        x="168"
        y="70"
        textAnchor="middle"
        fontSize="30"
        fontWeight="800"
        fill={ink}
      >
        ?
      </text>
      <path
        d="M222 70h48a12 12 0 0 1 12 12v16a12 12 0 0 1-12 12h-6v12l-14-12h-28a12 12 0 0 1-12-12V82a12 12 0 0 1 12-12z"
        fill="#5fb7a8"
      />
      <circle cx="234" cy="90" r="3" fill="#fff" />
      <circle cx="246" cy="90" r="3" fill="#fff" />
      <circle cx="258" cy="90" r="3" fill="#fff" />
      {fish(70, 92, "#f4b860")}
    </>
  ),
  calendar: (
    <>
      {/* Calendar page with a marked day */}
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
      <path d="M120 54h110" stroke={ink} strokeWidth="2" />
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
            fill={c === 2 && r === 0 ? "#f4b860" : ink}
            opacity={c === 2 && r === 0 ? 1 : 0.18}
          />
        )),
      )}
      {fish(250, 96, "#5fb7a8")}
    </>
  ),
  season: (
    <>
      {/* Sun over calm water and a cloud */}
      <circle cx="200" cy="62" r="26" fill="#f4b860" />
      <g stroke="#f4b860" strokeWidth="3" strokeLinecap="round">
        <path d="M200 20v-8M200 112v-8M158 62h-8M250 62h-8M170 32l-6-6M236 98l-6-6M230 32l6-6M164 98l6-6" />
      </g>
      <path
        d="M96 66a14 14 0 0 1 26-6 11 11 0 0 1 16 10h-46a8 8 0 0 1 4-4z"
        fill="#fff"
        stroke={ink}
        strokeWidth="2"
      />
      <path
        d="M120 100c20-8 40 8 60 0s40-8 60 0 30 6 40 2"
        stroke="#1f8f8a"
        strokeWidth="3"
        fill="none"
      />
    </>
  ),
  spots: (
    <>
      {/* Island and map pin over the reef */}
      <path
        d="M90 112c10-30 40-46 70-46s54 20 64 46z"
        fill="#5fb7a8"
        opacity=".55"
      />
      <path d="M150 70c-4-18 4-30 16-34-6 10-6 20-2 32" fill="#1f8f8a" />
      <path d="M162 46c10-8 24-6 30 2-10-2-20 0-28 6" fill="#1f8f8a" />
      <g transform="translate(228 30)">
        <path
          d="M16 0a16 16 0 0 1 16 16c0 14-16 32-16 32S0 30 0 16A16 16 0 0 1 16 0z"
          fill="#ff8a65"
        />
        <circle cx="16" cy="16" r="6" fill="#fff" />
      </g>
      {fish(84, 92, "#f4b860", true)}
    </>
  ),
  eco: (
    <>
      {/* Coral, a seedling and a heart */}
      <path
        d="M120 116V84M120 96l-12-14M120 90l14-16M108 82V66M134 74V60"
        stroke="#ff8a65"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M196 116V78"
        stroke="#1f8f8a"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M196 86c-18 0-26-12-26-24 16 0 26 8 26 24zM196 80c4-18 18-24 30-22-2 16-14 24-30 22z"
        fill="#5fb7a8"
      />
      <path
        d="M256 54c-6-12-26-8-22 8 2 8 22 20 22 20s20-12 22-20c4-16-16-20-22-8z"
        fill="#f4b860"
      />
    </>
  ),
  more: (
    <>
      {/* Boat on the water */}
      <path d="M132 92h116l-18 22h-82z" fill={ink} />
      <rect
        x="160"
        y="70"
        width="46"
        height="22"
        rx="4"
        fill="#fff"
        stroke={ink}
        strokeWidth="2"
      />
      <path d="M190 70V40l26 26z" fill="#f4b860" />
      {fish(84, 104, "#5fb7a8")}
    </>
  ),
};

export const bannerTones = {
  about: "#e5f3f5",
  itinerary: "#e8f5ea",
  prep: "#f8efe0",
  faq: "#ecf0fa",
  calendar: "#e5f3f5",
  season: "#fbf1dc",
  spots: "#e8f5ea",
  eco: "#e9f6e3",
  more: "#e5f3f5",
};

export default function SectionBanner({
  kind,
  eyebrow,
  title,
  intro,
  id,
  level = 2,
}) {
  const Heading = `h${level}`;
  return (
    <div
      className={"section-banner section-banner-" + kind}
      style={{ "--banner-tone": bannerTones[kind] }}
    >
      <div className="section-banner-copy">
        <p className="eyebrow">{eyebrow}</p>
        <Heading id={id}>{title}</Heading>
        {intro && <p className="section-banner-intro">{intro}</p>}
      </div>
      <svg
        className="section-banner-art"
        viewBox="0 0 320 140"
        aria-hidden="true"
        focusable="false"
      >
        {sea}
        {scenes[kind]}
      </svg>
    </div>
  );
}
