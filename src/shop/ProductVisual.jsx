"use client";
import { useState } from "react";

// Lightweight illustrations are placeholders until the owner uploads product photos.
export default function ProductVisual({ product }) {
  const [failedURL, setFailedURL] = useState("");
  if (product.image && failedURL !== product.image)
    return (
      <img
        className="shop-product-photo"
        src={product.image}
        alt={product.name}
        loading="lazy"
        onError={() => setFailedURL(product.image)}
      />
    );
  return (
    <div className={"shop-illustration art-" + product.category}>
      <svg viewBox="0 0 280 220" fill="none" aria-hidden="true">
        <ellipse
          cx="140"
          cy="186"
          rx="74"
          ry="8"
          fill="currentColor"
          opacity=".08"
        />
        <g
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {product.category === "mask" && (
            <>
              <path
                d="M65 88C29 65 30 139 64 130M215 88c36-23 35 51 1 42"
                opacity=".4"
              />
              <path
                d="M67 86q73-30 146 0l-9 59q-25 21-51-4l-13-15-13 15q-26 25-51 4Z"
                fill="#164f61"
              />
              <path
                d="M79 97q23-10 46-5l-4 40q-18 17-36 4Zm122 0q-23-10-46-5l4 40q18 17 36 4Z"
                fill="#a2e4dc"
                stroke="#a2e4dc"
              />
              <path d="m90 111 16-6m64 6 16-6" stroke="white" opacity=".8" />
              <path d="M221 52v80q0 24-24 24h-12" strokeWidth="9" />
              <path d="M212 50h18" stroke="#20b8b1" strokeWidth="10" />
            </>
          )}
          {product.category === "fins" && (
            <g transform="rotate(-18 140 110)">
              <path d="M82 36h31l12 57 7 79q-30 14-60 0l7-79Z" fill="#bef4a5" />
              <path d="M86 43h24l6 42H80Z" fill="#164f61" />
              <path d="m88 100-5 60m23-60 5 60" opacity=".35" />
              <path
                d="M166 43h29l12 53 6 80q-30 14-59 0l8-80Z"
                fill="#164f61"
              />
              <path d="M169 50h23l6 39h-35Z" fill="#20b8b1" />
              <path
                d="m170 104-5 60m24-60 5 60"
                stroke="#a2e4dc"
                opacity=".6"
              />
            </g>
          )}
          {product.category === "suit" && (
            <>
              <path
                d="m114 39-33 12-30 66 21 9 30-43-6 102h34l10-67 10 67h34l-6-102 30 43 21-9-30-66-33-12q-26 18-52 0Z"
                fill="#164f61"
              />
              <path
                d="M120 49q20 10 40 0v64l-20 11-20-11Z"
                fill="#20b8b1"
                stroke="#20b8b1"
              />
              <path d="M140 58v54" stroke="#bef4a5" />
              <path d="M103 161h23m28 0h23" opacity=".3" stroke="#bef4a5" />
            </>
          )}
          {product.category === "bcd" && (
            <>
              <path
                d="M108 44 77 61 60 146l21 37h37l22-42 22 42h37l21-37-17-85-31-17-7 63h-50Z"
                fill="#164f61"
              />
              <path
                d="m106 46-9 94-18-7 6-59Zm68 0 9 94 18-7-6-59Z"
                fill="#20b8b1"
              />
              <path d="M94 117h92" stroke="#a2e4dc" strokeWidth="8" />
              <rect
                x="126"
                y="110"
                width="28"
                height="14"
                rx="3"
                fill="#bef4a5"
              />
              <path d="M87 149h22v17H87Zm84 0h22v17h-22Z" stroke="#a2e4dc" />
              <path d="M87 51q-34 4-24 52" strokeWidth="7" />
            </>
          )}
          {product.category === "regulator" && (
            <>
              <path
                d="M125 80C43 25 24 157 98 162M147 82c91-79 119 73 53 76"
                strokeWidth="8"
              />
              <rect
                x="117"
                y="50"
                width="38"
                height="46"
                rx="10"
                fill="#164f61"
              />
              <path d="M137 42v15m-12 18h23" stroke="#20b8b1" strokeWidth="7" />
              <circle cx="106" cy="155" r="24" fill="#164f61" />
              <circle cx="106" cy="155" r="13" stroke="#a2e4dc" />
              <path d="M91 176v13h29v-13" />
              <circle cx="191" cy="155" r="24" fill="#bef4a5" />
              <path d="M180 155h22m-28 21v13h29v-13" />
            </>
          )}
          {product.category === "cylinder" && (
            <g transform="rotate(12 140 110)">
              <rect
                x="108"
                y="56"
                width="64"
                height="134"
                rx="28"
                fill="#c1dce0"
              />
              <path d="M133 57V32h16v25m-4-22h23m-8-5v14" />
              <path d="M111 92h58v25h-58Z" fill="#20b8b1" />
              <path d="M112 177h56v8q-28 16-56 0Z" fill="#164f61" />
              <path d="M122 130v31" stroke="white" strokeWidth="7" />
            </g>
          )}
          {product.category === "computer" && (
            <g transform="rotate(-15 140 110)">
              <path d="M116 26h48l4 169h-56Z" fill="#164f61" />
              <rect
                x="99"
                y="64"
                width="82"
                height="91"
                rx="25"
                fill="#164f61"
                stroke="#20b8b1"
              />
              <rect
                x="113"
                y="79"
                width="54"
                height="59"
                rx="12"
                fill="#a2e4dc"
              />
              <path d="M125 98h30m-30 13h16m-16 13h27" strokeWidth="3" />
              <path
                d="M132 43h16m-16 132h16m-16 11h16"
                stroke="#a2e4dc"
                strokeWidth="3"
              />
            </g>
          )}
          {product.category === "light" && (
            <g transform="rotate(38 140 110)">
              <path d="m116 89-7-33h62l-7 33v84q-24 12-48 0Z" fill="#164f61" />
              <ellipse cx="140" cy="56" rx="31" ry="12" fill="#a2e4dc" />
              <path d="M117 95h46" stroke="#20b8b1" strokeWidth="9" />
              <path d="M130 115v39m20-39v39" opacity=".4" stroke="#a2e4dc" />
              <path d="M131 180q-9 22 15 20" strokeWidth="3" />
            </g>
          )}
        </g>
      </svg>
      <span>Ilustrasi alat</span>
    </div>
  );
}
