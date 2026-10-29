"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { FormFieldInfo } from "@/lib/pdf/engine";

export default function FormFiller({
  bytes,
  values,
  onChange,
  disabled,
}: {
  bytes: Uint8Array;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  disabled: boolean;
}) {
  const [fields, setFields] = useState<FormFieldInfo[] | null>(null);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    (async () => {
      try {
        const engine = await import("@/lib/pdf/engine");
        const found = await engine.listFormFields(bytes);
        if (!mounted.current || cancelled) return;
        setFields(found);
        const next: Record<string, string> = {};
        for (const field of found) {
          if (field.name in values) next[field.name] = values[field.name];
          else if (field.value) next[field.name] = field.value;
        }
        onChange(next);
      } catch (e) {
        if (mounted.current && !cancelled)
          setError(e instanceof Error ? e.message : "Form fields could not be read.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Reload only when the file changes.
  }, [bytes]);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const setValue = (name: string, value: string) => onChange({ ...values, [name]: value });

  if (error)
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  if (!fields)
    return (
      <p className="settings-note" role="status">
        <LoaderCircle size={15} className="spin" aria-hidden="true" /> Reading form fields locally…
      </p>
    );
  if (!fields.length)
    return (
      <p className="settings-note" role="status">
        This PDF has no fillable AcroForm fields. XFA forms and flat scans cannot be filled; use
        Sign for a visual signature instead.
      </p>
    );
  return (
    <fieldset className="settings-fields form-filler" disabled={disabled}>
      <legend className="workspace-section-label">
        03 · FILL {fields.length} FIELD{fields.length === 1 ? "" : "S"}
      </legend>
      {fields.map((field) => (
        <div key={field.name}>
          {field.type === "checkbox" ? (
            <label className="check-row">
              <input
                type="checkbox"
                checked={/^(true|1|yes|on)$/i.test(values[field.name] ?? field.value)}
                onChange={(e) => setValue(field.name, e.target.checked ? "true" : "false")}
                disabled={field.readOnly}
              />
              <span>
                {field.name}
                {field.readOnly ? " (read-only)" : ""}
              </span>
            </label>
          ) : field.type === "choice" ? (
            <label className="field">
              <span>
                {field.name}
                {field.readOnly ? " (read-only)" : ""}
              </span>
              <select
                aria-label={`Fill field ${field.name}`}
                value={values[field.name] ?? field.value}
                onChange={(e) => setValue(field.name, e.target.value)}
                disabled={field.readOnly}
              >
                <option value="">— No selection —</option>
                {field.options.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>
                {field.name}
                {field.readOnly ? " (read-only)" : ""}
              </span>
              <input
                aria-label={`Fill field ${field.name}`}
                value={values[field.name] ?? field.value}
                onChange={(e) => setValue(field.name, e.target.value)}
                maxLength={10000}
                autoComplete="off"
                disabled={field.readOnly}
              />
            </label>
          )}
        </div>
      ))}
    </fieldset>
  );
}
