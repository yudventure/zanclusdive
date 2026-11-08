import { dictionary } from "../i18n.js";

// Illustrated route: fly into Sorong, fast ferry across the Dampier Strait,
// then on to the store in Waisai. Waigeo sits top left and Sorong bottom
// right, as on a map; numbered badges match the steps beside it.
function RouteMap({ label, places }) {
  const [sorong, waisai, strait, waigeo] = places;
  return (
    <svg
      viewBox="0 0 1000 560"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id="travel-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4eaf0" />
          <stop offset="1" stopColor="#b5d7e2" />
        </linearGradient>
      </defs>
      <rect width="1000" height="560" fill="url(#travel-sea)" />
      <g stroke="#ffffffb0" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M84 318q12-8 24 0t24 0" />
        <path d="M406 470q12-8 24 0t24 0" />
        <path d="M744 332q12-8 24 0t24 0" />
        <path d="M640 150q12-8 24 0t24 0" />
        <path d="M480 246q12-8 24 0t24 0" />
        <path d="M140 520q12-8 24 0t24 0" />
      </g>
      <g fill="#e6f0dc" stroke="#c4d9b6" strokeWidth="2">
        <path d="M0 0h600c-15 40-45 70-95 84-55 16-85 56-133 78-46 21-82 14-120 34-40 22-82 10-126 26-42 16-84 10-126 22Z" />
        <path d="M1000 560H480c50-40 120-54 188-62s112-42 178-56c64-14 106-42 154-54Z" />
        <ellipse cx="150" cy="420" rx="90" ry="30" />
        <ellipse cx="300" cy="500" rx="60" ry="18" />
        <ellipse cx="720" cy="220" rx="30" ry="11" />
        <ellipse cx="790" cy="180" rx="16" ry="7" />
        <ellipse cx="866" cy="262" rx="22" ry="8" />
      </g>
      <g fill="#d3e6c5">
        <path d="M30 168c30-62 84-62 116 0Z" />
        <path d="M120 150c40-74 104-74 144 0Z" />
        <path d="M330 104c30-52 82-52 112 0Z" />
        <path d="M850 470c26-46 72-46 98 0Z" />
        <path d="M110 420c18-26 48-26 66 0Z" />
      </g>
      <g fill="#9ccb8b">
        <circle cx="200" cy="118" r="9" />
        <circle cx="214" cy="124" r="7" />
        <circle cx="404" cy="62" r="9" />
        <circle cx="420" cy="70" r="7" />
        <circle cx="486" cy="40" r="8" />
        <circle cx="80" cy="196" r="8" />
        <circle cx="952" cy="452" r="9" />
        <circle cx="968" cy="460" r="7" />
        <circle cx="770" cy="530" r="8" />
      </g>
      <g fill="#ffffff" stroke="#9fb7a6" strokeWidth="1.5">
        <rect x="190" y="168" width="14" height="10" rx="2" />
        <rect x="210" y="176" width="12" height="9" rx="2" />
        <rect x="228" y="168" width="14" height="10" rx="2" />
        <rect x="724" y="524" width="14" height="10" rx="2" />
        <rect x="744" y="516" width="12" height="9" rx="2" />
      </g>
      <g transform="rotate(-14 860 500)">
        <rect x="815" y="494" width="90" height="12" rx="3" fill="#c3d3bb" />
        <path
          d="M823 500h74"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="8 6"
        />
      </g>
      <path
        d="M940 20c-15 120-40 300-74 466"
        stroke="#0b344266"
        strokeWidth="2.5"
        strokeDasharray="3 10"
        strokeLinecap="round"
        fill="none"
      />
      <g
        stroke="#0b3442"
        strokeWidth="4"
        strokeDasharray="2 12"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M860 500c-50 6-110 4-156-4" />
        <path d="M700 494c-100-54-180-94-230-164-40-60-90-120-154-150" />
        <path d="M312 178c-20-12-40-22-60-26" />
      </g>
      <g fill="white" stroke="#0d6f73" strokeWidth="3">
        <circle cx="700" cy="494" r="6" />
        <circle cx="312" cy="178" r="6" />
        <circle cx="860" cy="500" r="7" fill="#0b3442" stroke="white" />
      </g>
      <g transform="translate(924 142) rotate(99) scale(1.5)" fill="#0b3442">
        <path d="M-22-2.5H14c6 0 10 1.5 10 2.5s-4 2.5-10 2.5H-22Z" />
        <path d="M2-2-8-20h6L12-2Zm0 4-10 18h6L12 2Z" />
        <path d="M-18-2l-6-8h4l8 8Zm0 4-6 8h4l8-8Z" />
      </g>
      <g transform="translate(566 418)">
        <path
          d="M36 6q12-6 24 0M40 14q12-6 24 0"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M-38-2h68l-6 14h-48Z" fill="#0b3442" />
        <path d="M-30 3h56" stroke="#bef4a5" strokeWidth="2.5" />
        <path
          d="M-14-16h28l4 14h-38Z"
          fill="white"
          stroke="#0b3442"
          strokeWidth="2"
        />
        <path
          d="M-8-11h6m6 0h6"
          stroke="#0d6f73"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <g className="travel-badge">
        <circle
          cx="900"
          cy="450"
          r="19"
          fill="#0b3442"
          stroke="#eaf2ed"
          strokeWidth="4"
        />
        <text x="900" y="457" textAnchor="middle">
          1
        </text>
      </g>
      <g className="travel-badge">
        <circle
          cx="566"
          cy="370"
          r="19"
          fill="#0b3442"
          stroke="#eaf2ed"
          strokeWidth="4"
        />
        <text x="566" y="377" textAnchor="middle">
          2
        </text>
      </g>
      <g className="travel-badge travel-pin">
        <path
          d="M252 152c-18-22-26-32-26-46a26 26 0 1 1 52 0c0 14-8 24-26 46Z"
          fill="#0d6f73"
          stroke="#bef4a5"
          strokeWidth="3"
        />
        <circle cx="252" cy="106" r="13" fill="white" />
        <text x="252" y="112" textAnchor="middle" className="travel-pin-text">
          3
        </text>
      </g>
      <text x="296" y="98" className="travel-label travel-label-start">
        {waisai.toUpperCase()}
      </text>
      <text x="880" y="546" textAnchor="middle" className="travel-label">
        {sorong.toUpperCase()}
      </text>
      <text x="300" y="322" textAnchor="middle" className="travel-label-sea">
        {strait}
      </text>
      <text x="60" y="44" className="travel-label-land travel-label-start">
        {waigeo}
      </text>
    </svg>
  );
}

function TipIcon({ name }) {
  const paths = {
    boat: "M3 15h18l-2.5 4h-13L3 15Zm4-1V9h8l2 5M10 9V6h3",
    card: "M3 7h18v10H3zM3 11h18M7 15h4",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// "How to get here", shown above the store details on the homepage.
export default function TravelRoute({ whatsapp, locale = "en" }) {
  const h = dictionary(locale).home;
  return (
    <section
      className="travel-section"
      id="getting-here"
      aria-labelledby="travel-title"
    >
      <div className="travel-heading" data-reveal>
        <div>
          <p className="eyebrow">{h.travelEyebrow}</p>
          <h2 id="travel-title">
            {h.travelTitle[0]}
            <br />
            {h.travelTitle[1]}
          </h2>
        </div>
        <p className="travel-intro">{h.travelIntro}</p>
      </div>
      <div className="travel-body">
        <figure className="travel-map" data-reveal>
          <RouteMap label={h.travelMap} places={h.travelPlaces} />
        </figure>
        <ol className="travel-steps">
          {h.travelSteps.map(([title, text, chip], index) => (
            <li
              key={title}
              data-reveal
              style={{ "--reveal-delay": `${index * 80}ms` }}
            >
              <span className="travel-step-number">{index + 1}</span>
              <div>
                <div className="travel-step-title">
                  <h3>{title}</h3>
                  <span className="travel-step-chip">{chip}</span>
                </div>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="travel-foot" data-reveal>
        <ul className="travel-tips">
          {h.travelTips.map((tip, index) => (
            <li key={tip}>
              <span className="travel-tip-icon">
                <TipIcon name={index ? "card" : "boat"} />
              </span>
              {tip}
            </li>
          ))}
        </ul>
        <div className="travel-help">
          <p>{h.travelNote}</p>
          <a
            className="contact-chat"
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(h.whatsappTravel)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {h.travelChat} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
