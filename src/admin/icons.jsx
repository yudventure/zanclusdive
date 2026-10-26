// Line icons for the admin shell, drawn on a 24px grid with a 1.7 stroke.
const paths = {
  overview: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  reservations: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  customers:
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5",
  events:
    "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M12 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z",
  media: "M4 5h16v14H4zM4 16l4.5-4.5 4 4 2.5-2.5L20 18M15.5 9.5h.01",
  website: "M5 6V4h14v2M12 4v16M9 20h6",
  experiences: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z",
  activities:
    "M3 9c2 0 2-1.5 4.5-1.5S9.5 9 12 9s2.5-1.5 4.5-1.5S19 9 21 9M3 15c2 0 2-1.5 4.5-1.5S9.5 15 12 15s2.5-1.5 4.5-1.5S19 15 21 15",
  prices: "M3 12V4h8l9 9-8 8zM7.5 8h.01",
  shop: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  contact:
    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z",
  courses: "M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6",
  service:
    "M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2zM18 4l2 2",
  about: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  legal: "M7 3h7l5 5v13H7zM14 3v5h5M10 12h6M10 16h6",
  developer: "M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14",
  payments: "M3 7h18v11H3zM3 11h18M7 15h4",
  agents:
    "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5 6-5s6 2 6 5M14 15.5c.6-.3 1.3-.5 2-.5 3.3 0 6 2 6 5",
  settings: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4",
  chevron: "M6 9l6 6 6-6",
  arrow: "M7 17L17 7M9 7h8v8",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  menu: "M4 7h16M4 12h16M4 17h16",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  check: "M5 12.5l4.5 4.5L19 7",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  security: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2",
  users:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 10.5a3 3 0 1 0 0-6M17 14.5c2.5.5 4 2.5 4 5.5",
  hrd: "M3 6h18v13H3zM7 15c0-1.7 1.3-3 3-3s3 1.3 3 3M10 11a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM15.5 10h3M15.5 13h3",
  finance: "M4 20h16M6 16v-5M10 16V7M14 16v-4M18 16V5",
  gudang: "M3 20V9l9-5 9 5v11zM3 20h18M9 20v-6h6v6M12 10h.01",
  social:
    "M4 10v4a1 1 0 0 0 1 1h3l7 4V5L8 9H5a1 1 0 0 0-1 1zM18 9.5a3.5 3.5 0 0 1 0 5M9 15v4",
  employees:
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5M17 8h4M19 6v4",
  attendance: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4",
  payroll: "M3 7h18v10H3zM3 11h18M7 14h3M12 4v3M12 17v3",
  cashbook: "M4 5h16v14H4zM4 9h16M8 13h4M8 16h8",
  seo: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20M8 10.5h5M10.5 8v5",
  reports: "M4 20h16M6 16v-5M10 16V7M14 16v-4M18 16V5M4 4l5 3 4-2 7 3",
  stock: "M3 9l9-5 9 5-9 5zM3 9v8l9 5 9-5V9M12 14v8",
  movements: "M4 8h12l-3-3M20 16H8l3 3M4 8v8M20 8v8",
};

export function AdminIcon({ name, size = 19, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}
