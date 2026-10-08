export default function ContactIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      {name === "whatsapp" && (
        <>
          <path
            d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.5-4.7A8.5 8.5 0 1 1 20.5 11.6Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.3 7.5c-.6.3-.8 1.1-.5 2 .8 2.3 2.5 4 4.8 4.9.9.3 1.7.1 2-.5l.6-1.1-2-1-.8.9a6.2 6.2 0 0 1-2.8-2.8l.9-.8-1-2-1.2.4Z"
            fill="currentColor"
          />
        </>
      )}
      {name === "email" && (
        <>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="m4 7 8 6 8-6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {name === "location" && (
        <>
          <path
            d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle
            cx="12"
            cy="10"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </>
      )}
      {name === "instagram" && (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </>
      )}
      {name === "facebook" && (
        <path
          d="M14.5 22v-9h3l.5-3.5h-3.5V7.3c0-1 .4-1.7 1.8-1.7h1.9V2.4c-.9-.2-1.9-.3-2.9-.3-2.9 0-4.8 1.7-4.8 4.9v2.5H7.2V13h3.3v9Z"
          fill="currentColor"
        />
      )}
      {name === "tiktok" && (
        <path
          d="M15.2 2c.3 2.5 1.8 4 4.8 4.2v3.2a8.2 8.2 0 0 1-4.8-1.5v7.6a6.3 6.3 0 1 1-5.4-6.2v3.4a3 3 0 1 0 2 2.8V2Z"
          fill="currentColor"
        />
      )}
      {name === "youtube" && (
        <>
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="m10 9 6 3-6 3Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
