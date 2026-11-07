import { inlineParts } from "../product-story.js";

// Bold, italic, code and safe links inside a line of the description.
function Inline({ text }) {
  return inlineParts(text).map((part, index) =>
    part.type === "strong" ? (
      <strong key={index}>{part.text}</strong>
    ) : part.type === "em" ? (
      <em key={index}>{part.text}</em>
    ) : part.type === "code" ? (
      <code key={index}>{part.text}</code>
    ) : part.type === "link" ? (
      <a
        key={index}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {part.text}
      </a>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

// A line icon for a feature card, picked from its title.
const featureIcons = [
  [
    /lens|lensa|vision|view|pandang|glass|kaca|clear|jernih|optic|panoram/i,
    "M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  ],
  [
    /silicon|skirt|seal|comfort|nyaman|fit|soft|lembut/i,
    "M12 3c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0C6 10.4 8.5 7.2 12 3z",
  ],
  [
    /buckle|strap|adjust|swivel|tali|gesper|atur/i,
    "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
  ],
  [
    /volume|light|ringan|weight|berat|compact|ringkas/i,
    "M20 4C10 4 5 9 4 20c4-6 8-8 12-8-3-1-6 0-8 2 2-5 6-8 12-10z",
  ],
  [
    /battery|baterai|power|charge|lumen|bright|terang/i,
    "M13 2 5 14h6l-1 8 8-12h-6l1-8z",
  ],
  [
    /depth|kedalaman|water|air|dive|selam|pressure|tekanan/i,
    "M3 15c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M3 10c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0",
  ],
];
const iconFor = (title) =>
  featureIcons.find(([rule]) => rule.test(title))?.[1] ??
  "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z";

// The full description of a product, read from its Markdown into tidy
// blocks (src/product-story.js): a tagline banner, headings, paragraphs,
// lists, quotes, tables, and feature cards with an icon each.
export default function ProductStory({ blocks }) {
  return (
    <div className="product-story">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = block.level <= 2 ? "h3" : "h4";
          return (
            <Tag key={index} className="story-heading">
              {block.text}
            </Tag>
          );
        }
        if (block.type === "tagline")
          return (
            <p key={index} className="story-tagline">
              <Inline text={block.text} />
            </p>
          );
        if (block.type === "quote")
          return (
            <blockquote key={index} className="story-quote">
              <Inline text={block.text} />
            </blockquote>
          );
        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={index} className="story-list">
              {block.items.map((item, n) => (
                <li key={n}>
                  <Inline text={item} />
                </li>
              ))}
            </Tag>
          );
        }
        if (block.type === "table")
          return (
            <div key={index} className="story-table">
              <table>
                {block.head && (
                  <thead>
                    <tr>
                      {block.head.map((cell, n) => (
                        <th key={n} scope="col">
                          <Inline text={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, n) => (
                        <td key={n}>
                          <Inline text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        if (block.type === "features")
          return (
            <ul key={index} className="story-features">
              {block.items.map((item, n) => (
                <li key={n}>
                  <span className="story-feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" focusable="false">
                      <path
                        d={iconFor(item.title)}
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <strong>{item.title}</strong>
                  {item.text && (
                    <p>
                      <Inline text={item.text} />
                    </p>
                  )}
                </li>
              ))}
            </ul>
          );
        return (
          <p key={index} className="story-text">
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
