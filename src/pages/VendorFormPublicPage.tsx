import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";

type FieldDef = {
  orderNo: number;
  section?: string | null;
  label: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  options?: string | null;
};

type FormState = "loading" | "open" | "expired" | "submitted" | "error" | "done";

function parseOptions(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

export function VendorFormPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<FormState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const drawn = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/public/vendor-form/${token}`);
        if (!active) return;
        const d = res.data;
        if (d.state === "expired") return setState("expired");
        if (d.state === "submitted") return setState("submitted");
        setTemplateName(d.templateName ?? "Vendor Registration Form");
        setVendorName(d.vendorName ?? "");
        setFields(d.fields ?? []);
        setState("open");
      } catch (e: any) {
        if (!active) return;
        setErrorMsg(e?.response?.data?.error ?? "This link is invalid.");
        setState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  // ---- signature canvas (pointer drawing) ----
  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    drawn.current = true;
  }
  function endDraw() {
    drawing.current = false;
  }
  function clearSig() {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    drawn.current = false;
  }

  function missingRequired(): string | null {
    for (const f of fields) {
      if (f.required && !String(values[f.fieldKey] ?? "").trim()) return f.label;
    }
    if (!signerName.trim()) return "Signature name";
    return null;
  }

  async function submit() {
    const missing = missingRequired();
    if (missing) {
      setErrorMsg(`Please complete: ${missing}`);
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const signatureImage =
        drawn.current && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null;
      await api.post(`/public/vendor-form/${token}`, {
        submittedData: JSON.stringify(values),
        signerName: signerName.trim(),
        signatureImage,
      });
      setState("done");
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="text-lg font-semibold text-[#0f172a]">{templateName || "Vendor Registration"}</div>
          <div className="text-sm text-gray-500">Secure vendor registration form</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {state === "loading" && <p className="text-sm text-gray-500">Loading…</p>}

          {state === "error" && (
            <p className="text-sm text-red-600">{errorMsg || "This link is invalid."}</p>
          )}
          {state === "expired" && (
            <p className="text-sm text-amber-700">
              This registration link has expired. Please contact your sponsor for a new link.
            </p>
          )}
          {state === "submitted" && (
            <p className="text-sm text-gray-700">This form has already been submitted. Thank you.</p>
          )}
          {state === "done" && (
            <div className="text-center">
              <div className="text-base font-semibold text-emerald-700">Thank you — submitted.</div>
              <p className="mt-1 text-sm text-gray-600">
                Your registration has been received and will be reviewed.
              </p>
            </div>
          )}

          {state === "open" && (
            <div className="space-y-5">
              {vendorName && <p className="text-sm text-gray-600">For: {vendorName}</p>}

              {fields.map((f) => (
                <div key={f.fieldKey}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                  </label>
                  <FieldInput field={f} value={values[f.fieldKey] ?? ""} onChange={(v) => setValue(f.fieldKey, v)} />
                </div>
              ))}

              <div className="border-t border-gray-100 pt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Signature name<span className="text-red-500"> *</span>
                </label>
                <input
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Full name of the person signing"
                />
                <label className="mb-1 mt-3 block text-sm font-medium text-gray-700">Draw signature (optional)</label>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={140}
                  className="w-full touch-none rounded-lg border border-gray-300 bg-white"
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                />
                <button onClick={clearSig} className="mt-1 text-xs text-gray-500 hover:text-gray-700">
                  Clear signature
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  By submitting, you confirm the information is true and complete. Your name, date/time and IP are recorded.
                </p>
              </div>

              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit registration"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const cls = "h-10 w-full rounded-lg border border-gray-300 px-3 text-sm";
  switch (field.fieldType) {
    case "textarea":
      return (
        <textarea
          className="min-h-[90px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={value === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "false")} />
          Yes
        </label>
      );
    case "select":
      return (
        <select className={cls} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {parseOptions(field.options).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "date":
      return <input type="date" className={cls} value={value} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <input type="number" className={cls} value={value} onChange={(e) => onChange(e.target.value)} />;
    case "email":
      return <input type="email" className={cls} value={value} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input type="text" className={cls} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}
