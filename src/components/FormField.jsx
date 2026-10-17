// One labelled form field with a leading icon. Required fields get a red
// asterisk; optional ones a small "optional" tag, so visitors can tell them
// apart at a glance.
const icons = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  whatsapp:
    "M20.5 11.6a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.5-4.7A8.5 8.5 0 1 1 20.5 11.6Z",
  email: "M4 6h16v12H4zM4 7l8 6 8-6",
  calendar: "M5 6h14v14H5zM5 10h14M9 4v4m6-4v4",
  people:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 8a6 6 0 0 1 12 0m1-8a3 3 0 1 0 0-6m2 14a6 6 0 0 0-3.5-5.5",
  days: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  note: "M6 4h9l3 3v13H6zM9 10h6M9 14h6",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  flag: "M6 21V4M6 4h11l-2.5 4L17 12H6",
  home: "M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5",
};

export default function FormField({
  id,
  label,
  icon,
  required,
  optional,
  children,
}) {
  return (
    <div className={"form-field" + (icon ? " has-icon" : "")}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="form-required" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="form-optional">{optional}</span>}
      </label>
      <div className="form-control">
        {icon && (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d={icons[icon]}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {children}
      </div>
    </div>
  );
}
