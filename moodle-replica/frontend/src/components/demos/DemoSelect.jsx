// Accessible labelled selector used across every hard-case workspace. It wraps
// a native <select> (a real, keyboard-operable, type-ahead-searchable combobox
// — no fragile custom listbox) with a leading domain icon and a chevron, and
// renders honest loading / error / empty states. Options never show a raw id as
// their primary text (spec §20).
import Icon from "./icons";
import { Bi, SkeletonRows, pick } from "./ui";

export default function DemoSelect({
  id,
  labelEn,
  labelAr,
  icon = "userRound",
  value,
  onChange,
  options = [],
  loading = false,
  error = null,
  disabled = false,
  placeholder,
  lang = "en",
  trailing = null,
}) {
  const label = (
    <label htmlFor={id} className="dm-field__label">
      <Bi en={labelEn} ar={labelAr} />
    </label>
  );

  if (loading) {
    return (
      <div className="dm-field">
        {label}
        <SkeletonRows lines={1} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dm-field">
        {label}
        <p className="inline-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  const empty = options.length === 0;
  return (
    <div className="dm-field">
      {label}
      <div className="dm-field__control">
        <div className={`dm-select${disabled || empty ? " dm-select--disabled" : ""}`}>
          <Icon name={icon} className="dm-select__lead" />
          <select
            id={id}
            className="dm-select__el"
            value={value ?? ""}
            disabled={disabled || empty}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">
              {empty
                ? pick(lang, "— none available —", "— لا يوجد —")
                : placeholder ?? pick(lang, "— select —", "— اختر —")}
            </option>
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.text}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" className="dm-select__chev" />
        </div>
        {trailing}
      </div>
    </div>
  );
}
