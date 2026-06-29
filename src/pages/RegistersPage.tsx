import { useState } from "react";
import { Download } from "lucide-react";
import { useAuditorProfiles, useAuditNumberLog } from "@/lib/hooks";
import { Button, Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState } from "@/components/ui/status";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import type { AuditorProfileItem, AuditNumberLogRow } from "@/types";

type RegisterTab = "auditors" | "numberLog" | "programme";

// Build a CSV string and trigger a client-side download.
function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

function yearsSince(date?: string | null): number {
  if (!date) return 0;
  const start = new Date(date);
  if (isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

// gxpAreas is stored as a JSON array string (e.g. '["GMP","GDP"]'); render it readably.
function functions(raw?: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {
    /* not JSON — fall through */
  }
  return raw;
}

export function RegistersPage() {
  const [tab, setTab] = useState<RegisterTab>("auditors");

  return (
    <>
      <PageHeader
        title="Registers"
        subtitle="SOP registers and logs — viewable on screen and exportable"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            { id: "auditors", label: "List of auditors" },
            { id: "numberLog", label: "Audit number log" },
            { id: "programme", label: "Audit programme" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors " +
              (tab === t.id
                ? "border-[var(--pk-navy)] bg-[var(--pk-navy)] text-white"
                : "border-[var(--pk-line)] bg-white text-gray-600 hover:bg-gray-50")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "auditors" && <AuditorRegister />}
      {tab === "numberLog" && <NumberLogRegister />}
      {tab === "programme" && (
        <Card>
          <CardBody className="p-6 text-sm text-gray-500">
            Audit programme (Jan/Jul, ±6-month window) — building next.
          </CardBody>
        </Card>
      )}
    </>
  );
}

function AuditorRegister() {
  const { data, isLoading, error } = useAuditorProfiles();

  function exportCsv(rows: AuditorProfileItem[]) {
    downloadCsv(
      "list-of-auditors.csv",
      ["Sr. No.", "Name of the auditor", "Designation", "Work Experience (Years)", "Worked in function(s)", "Remark"],
      rows.map((a, i) => [
        i + 1,
        a.fullName,
        a.designation ?? "",
        yearsSince(a.experienceStartDate),
        functions(a.gxpAreas),
        "",
      ])
    );
  }

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!data || data.length === 0)
    return <EmptyState title="No auditors" message="Create auditors in Master data to populate this register." />;

  return (
    <Card>
      <CardHeader
        title="List of auditors"
        subtitle={`${data.length} auditor(s)`}
        action={
          <Button variant="outline" onClick={() => exportCsv(data)}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Sr.</th>
                <th className="px-5 py-3 font-medium">Name of the auditor</th>
                <th className="px-5 py-3 font-medium">Designation</th>
                <th className="px-5 py-3 font-medium">Experience (yrs)</th>
                <th className="px-5 py-3 font-medium">Worked in function(s)</th>
                <th className="px-5 py-3 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a, i) => (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-[var(--pk-navy)]">{a.fullName}</td>
                  <td className="px-5 py-3 text-gray-600">{a.designation ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{yearsSince(a.experienceStartDate)}</td>
                  <td className="px-5 py-3 text-gray-600">{functions(a.gxpAreas) || "—"}</td>
                  <td className="px-5 py-3 text-gray-400"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function NumberLogRegister() {
  const { data, isLoading, error } = useAuditNumberLog();

  function exportCsv(rows: AuditNumberLogRow[]) {
    downloadCsv(
      "audit-number-log.csv",
      [
        "Audit report Number",
        "Scheduled date of audit",
        "Name of Auditor(s)",
        "Name of company",
        "Company address",
        "Name of the material",
        "Assigned by Compliance Acceptance date",
        "Next due date",
        "Remark",
      ],
      rows.map((r) => [
        r.auditNo,
        fmtDate(r.scheduledDate),
        r.auditors ?? "",
        r.companyName ?? "",
        r.companyAddress ?? "",
        r.materialName ?? "",
        fmtDate(r.complianceAcceptanceDate),
        fmtDate(r.nextDueDate),
        "",
      ])
    );
  }

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!data || data.length === 0)
    return <EmptyState title="No audits" message="Audits appear here with their numbers once created." />;

  return (
    <Card>
      <CardHeader
        title="Audit report numbering log"
        subtitle={`${data.length} audit(s)`}
        action={
          <Button variant="outline" onClick={() => exportCsv(data)}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Audit no.</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Auditor(s)</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium">Compliance acceptance</th>
                <th className="px-4 py-3 font-medium">Next due</th>
                <th className="px-4 py-3 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.auditNo} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-[var(--pk-navy)]">{r.auditNo}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(r.scheduledDate) || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.auditors || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.companyName || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{r.companyAddress || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.materialName || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(r.complianceAcceptanceDate) || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(r.nextDueDate) || "—"}</td>
                  <td className="px-4 py-3 text-gray-400"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}