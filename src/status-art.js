// Illustrations for the maintenance and error pages: an underwater scene
// seen through a porthole, with a Moorish idol (Zanclus cornutus, the fish
// Zanclus is named after) and props from diving. Plain SVG strings, so the
// same art serves the React pages and the standalone HTML pages.

// Moorish idol facing left, about 110 wide, centred on 0,0.
const fish = `
  <path d="M-6 -62C18 -104 70 -104 102 -64" stroke="#f4f1e6" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  <path d="M44 -6 62 -22Q69 0 62 22L44 6Z" fill="#1d2b33"/>
  <clipPath id="zs-fish"><path d="M-44 6C-42 -14-30-40-6-62 6-50 30-36 42-16L46-6V6L42 16C30 36 14 50 6 56-14 44-34 30-44 10Z"/></clipPath>
  <g clip-path="url(#zs-fish)">
    <rect x="-60" y="-70" width="120" height="140" fill="#f7f1dc"/>
    <rect x="-14" y="-70" width="20" height="140" fill="#f5c842" opacity=".55"/>
    <rect x="-32" y="-70" width="18" height="140" fill="#1d2b33"/>
    <rect x="6" y="-70" width="20" height="140" fill="#1d2b33"/>
    <rect x="26" y="-70" width="34" height="140" fill="#f5c842"/>
    <path d="M-60 40H60" stroke="#1d2b33" stroke-width="14"/>
  </g>
  <path d="M-44 4-60 9Q-63 11-60 13L-42 13Z" fill="#f7f1dc"/>
  <circle cx="-55" cy="10.5" r="3" fill="#f39c4a"/>
  <circle cx="-25" cy="-8" r="5.5" fill="#fff"/>
  <circle cx="-26" cy="-8" r="3" fill="#0b1e26"/>
  <path d="M-4 12q12 8 3 20" stroke="#1d2b33" stroke-width="2" fill="none" opacity=".45"/>`;

// A fish at x,y; positive scale faces left, negative faces right.
const mascot = (x, y, scale) =>
  `<g class="zs-bob"><g transform="translate(${x} ${y}) scale(${scale} ${Math.abs(scale)})">${fish}</g></g>`;

const bubbles = (list) =>
  `<g class="zs-rise" fill="none" stroke="#ffffff70" stroke-width="2">${list
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
    .join("")}</g>`;

const seabed = `
  <path d="M40 360C120 340 200 352 260 346 330 340 400 330 480 348V440H40Z" fill="#d9c99a"/>
  <path d="M40 378C140 366 240 376 330 368 400 362 450 366 480 372V440H40Z" fill="#cbb984"/>
  <path d="M110 352V314M110 332 94 316M110 324l16-20M94 316v-14M126 304v-12" stroke="#ff8a7a" stroke-width="7" stroke-linecap="round" fill="none"/>
  <ellipse cx="178" cy="354" rx="22" ry="11" fill="#f6a54b"/>
  <path d="M168 352q10-8 20 0M172 358q6-5 12 0" stroke="#d98a33" stroke-width="2" fill="none"/>
  <path d="M378 350c0-46 54-46 54 0Z" fill="#b48ad6" opacity=".9"/>
  <path d="M405 350v-38M405 330l-16-12M405 330l16-12" stroke="#8f66b3" stroke-width="2" fill="none"/>
  <path d="M444 352c-10-30 12-48 0-80M456 354c-6-22 10-34 2-58" stroke="#7cc08a" stroke-width="5" stroke-linecap="round" fill="none"/>`;

const surface = (y) => `
  <rect width="520" height="${y}" fill="#9fd3e0"/>
  <path d="M40 ${y}q20-8 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0V${y + 12}H40Z" fill="#1a7a8c" opacity=".6"/>`;

function porthole(scene, { dark = false } = {}) {
  return `<svg class="zs-svg" viewBox="0 0 520 440" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="zs-water" cx="50%" cy="15%" r="95%">
      <stop offset="0" stop-color="${dark ? "#0f5566" : "#1a7a8c"}"/>
      <stop offset=".55" stop-color="${dark ? "#073443" : "#0d4b5c"}"/>
      <stop offset="1" stop-color="#04202c"/>
    </radialGradient>
    <clipPath id="zs-port"><circle cx="260" cy="220" r="196"/></clipPath>
  </defs>
  <circle cx="260" cy="220" r="216" fill="#0b3442"/>
  <circle cx="260" cy="220" r="208" fill="none" stroke="#bef4a5" stroke-opacity=".35" stroke-width="2" stroke-dasharray="2 10"/>
  <g clip-path="url(#zs-port)">
    <rect width="520" height="440" fill="url(#zs-water)"/>
    <path d="M150 0h56l120 440h-80ZM262 0h30l96 440h-40Z" fill="#fff" opacity=".05"/>
    ${scene}
  </g>
  <circle cx="260" cy="220" r="196" fill="none" stroke="#0d6f73" stroke-width="12"/>
  <circle cx="260" cy="220" r="190" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
  <g fill="#8fd3cf" opacity=".7">${[0, 45, 90, 135, 180, 225, 270, 315]
    .map((a) => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${(260 + 196 * Math.cos(r)).toFixed(1)}" cy="${(220 + 196 * Math.sin(r)).toFixed(1)}" r="3.5"/>`;
    })
    .join("")}</g>
</svg>`;
}

// Tank, regulator, gauge, wrench and toolbox: the gear is being serviced.
const maintenance = porthole(`
  ${seabed}
  <rect x="140" y="320" width="74" height="36" rx="6" fill="#ff8a5c"/>
  <path d="M140 332h74M164 320v-8h26v8" stroke="#c9653c" stroke-width="3" fill="none"/>
  <rect x="282" y="236" width="44" height="114" rx="20" fill="#f5c842"/>
  <rect x="292" y="250" width="7" height="86" rx="3.5" fill="#fff" opacity=".45"/>
  <rect x="282" y="290" width="44" height="10" fill="#0d6f73"/>
  <rect x="296" y="220" width="16" height="18" fill="#9aa9ae"/>
  <rect x="288" y="207" width="32" height="15" rx="4" fill="#c4d0d4"/>
  <circle cx="304" cy="200" r="7" fill="#1d2b33"/>
  <path d="M320 214c40 0 54 30 52 50" stroke="#1d2b33" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="376" cy="288" r="25" fill="#0b3442" stroke="#bef4a5" stroke-width="3"/>
  <circle cx="376" cy="288" r="17" fill="none" stroke="#ffffff55" stroke-width="4" stroke-dasharray="1.5 5.6"/>
  <path d="M389 300a17 17 0 0 0 4-12" stroke="#ff9c8a" stroke-width="4" fill="none"/>
  <path d="M376 288l10-11" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  <g transform="rotate(-24 250 300)">
    <rect x="244" y="262" width="12" height="88" rx="6" fill="#c4d0d4"/>
    <circle cx="250" cy="256" r="16" fill="#c4d0d4"/>
    <rect x="244" y="236" width="12" height="18" fill="#0d4b5c"/>
  </g>
  <path d="M342 222l4-10 4 10 10 4-10 4-4 10-4-10-10-4ZM252 210l3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="#bef4a5"/>
  ${mascot(178, 214, -0.9)}
  ${bubbles([
    [214, 150, 6],
    [226, 118, 4],
    [208, 92, 3],
    [330, 170, 5],
    [342, 138, 3],
  ])}`);

// A torch beam finds the fish next to a torn map: the page drifted off.
const lost = porthole(
  `
  ${seabed}
  <path d="M430 30 196 330h150Z" fill="#fff" opacity=".1"/>
  <path d="M430 30 236 330h70Z" fill="#fff" opacity=".07"/>
  <path d="M120 336l78-14 6 10-8 8 10 6-4 12-76 10Z" fill="#f2e6c4"/>
  <path d="M132 350c14-8 26 4 42-6" stroke="#c9653c" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
  <path d="M176 336l8 8m0-8-8 8" stroke="#e5484d" stroke-width="3" stroke-linecap="round"/>
  ${mascot(270, 248, 0.95)}
  <circle cx="198" cy="168" r="28" fill="#ffffff1a" stroke="#ffffff99" stroke-width="2"/>
  <path d="M190 160a8 8 0 1 1 11 7c-2 1-3 3-3 5v2M198 182v.5" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>
  ${bubbles([
    [300, 170, 5],
    [312, 140, 3],
    [296, 116, 4],
  ])}`,
  { dark: true },
);

// A marked-off zone with a no-entry sign: the area is closed.
const closed = porthole(`
  ${seabed}
  <path d="M60 150C180 190 340 120 460 168" stroke="#f2e6c4" stroke-width="3" fill="none"/>
  ${[
    [110, 166],
    [180, 170],
    [250, 158],
    [320, 146],
    [390, 150],
  ]
    .map(
      ([x, y], i) =>
        `<ellipse cx="${x}" cy="${y}" rx="15" ry="11" fill="${i % 2 ? "#fff" : "#ff8a5c"}"/>`,
    )
    .join("")}
  <rect x="346" y="226" width="9" height="124" fill="#c4d0d4"/>
  <circle cx="350" cy="222" r="36" fill="#e5484d" stroke="#fff" stroke-width="5"/>
  <rect x="328" y="215" width="44" height="14" rx="3" fill="#fff"/>
  ${mascot(200, 262, -0.9)}
  ${bubbles([
    [236, 214, 5],
    [246, 190, 3],
  ])}`);

// A cracked gauge in the red and a tangled hose: something broke.
const broken = porthole(`
  ${seabed}
  <path d="M330 280c0 52-80 22-50-8 30-30 80 30 20 60-50 30-100-10-70-30" stroke="#1d2b33" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M330 280c0 52-80 22-50-8 30-30 80 30 20 60-50 30-100-10-70-30" stroke="#ffffff22" stroke-width="2" fill="none"/>
  <circle cx="330" cy="200" r="60" fill="#0b3442" stroke="#bef4a5" stroke-width="5"/>
  <circle cx="330" cy="200" r="46" fill="none" stroke="#ffffff55" stroke-width="6" stroke-dasharray="2 7.6"/>
  <path d="M362 232a46 46 0 0 0 14-32" stroke="#ff9c8a" stroke-width="7" fill="none"/>
  <path d="M330 200l34 26" stroke="#ff9c8a" stroke-width="4" stroke-linecap="round"/>
  <circle cx="330" cy="200" r="6" fill="#bef4a5"/>
  <path d="M296 160l18 20-10 8 22 22M352 150l-8 18 14 6" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>
  <path d="M396 346l6-4 7 4v8l-7 4-6-4ZM430 352l5-3 5 3v6l-5 3-5-3Z" fill="#9aa9ae"/>
  ${mascot(168, 214, -0.85)}
  ${bubbles([
    [214, 150, 5],
    [222, 124, 3],
    [380, 120, 4],
  ])}`);

// The anchor chain from the boat has snapped: the line to the server broke.
const snapped = porthole(`
  ${surface(78)}
  <path d="M236 70h130l-16 18H252Z" fill="#1d2b33"/>
  <rect x="270" y="50" width="50" height="22" rx="4" fill="#f2e6c4"/>
  ${seabed}
  <g fill="none" stroke="#c4d0d4" stroke-width="4">
    ${[96, 116, 136, 156, 176]
      .map(
        (y, i) => `<ellipse cx="300" cy="${y}" rx="${i % 2 ? 4 : 7}" ry="10"/>`,
      )
      .join("")}
    <path d="M294 192c0 8 12 8 12 0"/>
    <path d="M294 236c0-8 12-8 12 0"/>
    ${[250, 270, 290, 310]
      .map(
        (y, i) => `<ellipse cx="300" cy="${y}" rx="${i % 2 ? 4 : 7}" ry="10"/>`,
      )
      .join("")}
  </g>
  <path d="M300 320v28M282 330h36M268 336c0 14 14 22 32 22s32-8 32-22" stroke="#9aa9ae" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M286 204l-8-4M314 204l8-4M286 224l-8 4M314 224l8 4" stroke="#bef4a5" stroke-width="3" stroke-linecap="round"/>
  ${mascot(176, 236, -0.85)}
  ${bubbles([
    [212, 176, 5],
    [222, 150, 3],
  ])}`);

// A dive computer counting down while the fish waits: the server is slow.
const waiting = porthole(`
  ${seabed}
  <rect x="306" y="120" width="40" height="44" rx="8" fill="#1d2b33"/>
  <rect x="306" y="276" width="40" height="44" rx="8" fill="#1d2b33"/>
  <circle cx="326" cy="220" r="64" fill="#1d2b33"/>
  <circle cx="326" cy="220" r="58" fill="none" stroke="#bef4a5" stroke-width="5" stroke-dasharray="3 6.1"/>
  <circle cx="326" cy="220" r="44" fill="#0f5c6e"/>
  <circle cx="326" cy="220" r="32" fill="none" stroke="#ffffff33" stroke-width="6"/>
  <path d="M326 188a32 32 0 1 1-32 32" stroke="#bef4a5" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="312" cy="222" r="4" fill="#fff"/>
  <circle cx="326" cy="222" r="4" fill="#fff"/>
  <circle cx="340" cy="222" r="4" fill="#fff"/>
  ${mascot(166, 238, -0.85)}
  ${bubbles([
    [206, 180, 5],
    [214, 154, 4],
    [208, 130, 3],
  ])}`);

// A buoy whose signal is crossed out and a snapped cable: no connection.
const offline = porthole(`
  ${surface(158)}
  ${seabed}
  <path d="M300 166c0 34-10 60 4 96" stroke="#1d2b33" stroke-width="4" fill="none"/>
  <path d="M298 262l-6 8m10-8v10m4-10 6 8" stroke="#1d2b33" stroke-width="3" stroke-linecap="round"/>
  <path d="M276 144c0-22 48-22 48 0v14h-48Z" fill="#e5484d"/>
  <rect x="276" y="136" width="48" height="10" fill="#fff"/>
  <rect x="297" y="98" width="6" height="40" fill="#1d2b33"/>
  <path d="M286 94a20 20 0 0 1 28 0M278 86a32 32 0 0 1 44 0" stroke="#1d2b33" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M276 70l48 34" stroke="#e5484d" stroke-width="5" stroke-linecap="round"/>
  ${mascot(190, 286, -0.85)}
  ${bubbles([
    [228, 214, 5],
    [236, 190, 3],
    [226, 168, 4],
  ])}`);

export const statusArt = {
  maintenance,
  lost,
  closed,
  broken,
  snapped,
  waiting,
  offline,
};
