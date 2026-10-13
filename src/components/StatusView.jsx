import { statusMarkup } from "../status-pages.js";

// A maintenance or error page inside the Next layout. The markup is our own
// template; the only owner text in it (the maintenance note) is escaped.
export default function StatusView(props) {
  return (
    <div
      className="zs-root"
      dangerouslySetInnerHTML={{ __html: statusMarkup(props) }}
    />
  );
}
