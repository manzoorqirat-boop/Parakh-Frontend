import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, FileSignature } from "lucide-react";
import {
  useAudit,
  useAuditAction,
  useComplianceReport,
  useComplianceAction,
  useChecklists,
  useCreateChecklist,
  useAuditorProfiles,
} from "@/lib/hooks";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  EmptyState,
  AuditStatusBadge,
  FindingBadge,
  LifecycleRail,
  Badge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { apiError } from "@/lib/api";
import { fmtDate, humanize } from "@/lib/utils";
import type { AuditDetail, FindingClass, AuditClass, AuditorProfileItem } from "@/types";

const AUDIT_LIFECYCLE = [
  "Planned",
  "Scheduled",
  "InProgress",
  "ReportDraft",
  "Signed",
  "Closed",
];

export function AuditDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useAudit(id);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!data) return null;

  return (
    <>
      <Link
        to="/audits"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--pk-navy)]"
      >
        <ArrowLeft size={16} /> Audits
      </Link>

      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="tabular text-xl font-bold text-[var(--pk-navy)]">
              {data.auditNo}
            </h1>
            <AuditStatusBadge status={data.status} />
            <Badge tone="muted">{humanize(data.type)}</Badge>
            <Badge tone="muted">{humanize(data.category)}</Badge>
            <Badge tone="muted">Class {data.class}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">{data.auditee.name}</p>
        </div>
      </div>

      <OutcomeBanner audit={data} />

      {/* Lifecycle rail — the signature element */}
      <Card className="mb-6">
        <CardBody>
          <LifecycleRail steps={AUDIT_LIFECYCLE} current={data.status} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FindingsCard audit={data} />
          <ComplianceCard audit={data} />
        </div>
        <div className="space-y-6">
          <ActionsCard audit={data} />
          <ChecklistCard audit={data} />
          <DetailsCard audit={data} />
        </div>
      </div>
    </>
  );
}

function OutcomeBanner({ audit }: { audit: AuditDetail }) {
  if (audit.outcome === "Pending") return null;

  const acceptable = audit.outcome === "Acceptable" || audit.outcome === "Approved";
  const label =
    audit.outcome === "NotAcceptable"
      ? "Not Acceptable"
      : audit.outcome === "NotApproved"
        ? "Not Approved"
        : audit.outcome;

  const critical = audit.findings.filter((f) => f.classification === "Critical").length;
  const major = audit.findings.filter((f) => f.classification === "Major").length;

  return (
    <div
      className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
        acceptable
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <span className="font-semibold">Site classification: {label}</span>
      {!acceptable && (
        <span className="ml-2 text-red-700">
          {critical > 0
            ? `${critical} critical observation(s) recorded`
            : `${major} major observations (more than 6)`}{" "}
          — compliance report required; intimation note raised (§5.6.3).
        </span>
      )}
    </div>
  );
}

function ChecklistCard({ audit }: { audit: AuditDetail }) {
  const { data: checklists } = useChecklists();
  const create = useCreateChecklist();
  const assign = useAuditAction(audit.id);
  const toast = useToast();
  const [picked, setPicked] = useState("");
  const [newName, setNewName] = useState("");

  // Only relevant before the audit is locked; hide once signed/closed.
  if (audit.status === "Signed" || audit.status === "Closed") return null;

  const assigned = !!audit.checklistId;

  async function doAssign(checklistId: string) {
    try {
      await assign.mutateAsync({ path: "checklist", body: { checklistId } });
      toast.push("Checklist assigned");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  async function quickCreate() {
    if (!newName.trim()) return;
    try {
      const res = await create.mutateAsync({
        name: newName.trim(),
        items: [
          { question: "Is the Quality Management System documented and current?", section: "Quality System", isCritical: true },
          { question: "Are batch records reviewed and approved before release?", section: "Production", isCritical: true },
          { question: "Is equipment calibration current and documented?", section: "Utilities", isCritical: false },
          { question: "Are personnel trained and training records maintained?", section: "Personnel", isCritical: false },
        ],
      });
      setNewName("");
      await doAssign(res.id);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Card>
      <CardHeader title="Checklist" subtitle="Required before execution" />
      <CardBody className="space-y-3 text-sm">
        {assigned ? (
          <p className="text-emerald-700">A checklist is assigned to this audit.</p>
        ) : (
          <>
            {checklists && checklists.length > 0 && (
              <div className="space-y-2">
                <Select value={picked} onChange={(e) => setPicked(e.target.value)}>
                  <option value="">Select a checklist…</option>
                  {checklists.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.itemCount} items)
                    </option>
                  ))}
                </Select>
                <Button disabled={!picked} onClick={() => picked && doAssign(picked)}>
                  Assign
                </Button>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs text-gray-500">
                {checklists && checklists.length > 0
                  ? "Or create a new one:"
                  : "No checklists yet — create a starter one:"}
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="Checklist name (e.g. ICH Q7 API audit)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Button variant="outline" disabled={!newName.trim()} onClick={quickCreate}>
                  Create &amp; assign
                </Button>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function ComplianceCard({ audit }: { audit: AuditDetail }) {
  const { data: report, isLoading } = useComplianceReport(audit.id);
  const { request, received, review } = useComplianceAction(audit.id);
  const toast = useToast();

  // §5.7.1: only needed once the site is Not Acceptable (critical or >6 major).
  const needed = audit.outcome === "NotAcceptable" || report != null;
  if (!needed) return null;

  const today = new Date().toISOString().slice(0, 10);
  const overdue =
    report != null &&
    !report.receivedOn &&
    report.status !== "Closed" &&
    report.dueOn < today;

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.push(ok);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Card>
      <CardHeader title="Compliance report" subtitle="§5.7 vendor CAPA response" />
      <CardBody className="space-y-4 text-sm">
        {isLoading && <Spinner />}

        {!isLoading && !report && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-gray-500">
              Site is Not Acceptable — request a compliance report (30 working days).
            </p>
            <Button
              onClick={() => run(() => request.mutateAsync(undefined), "Compliance report requested")}
            >
              Request
            </Button>
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Row label="Report no" value={report.reportNo} />
              <Row
                label="Status"
                value={overdue ? "Overdue" : humanize(report.status)}
              />
              <Row label="Requested" value={fmtDate(report.requestedOn)} />
              <Row
                label="Due"
                value={
                  <span className={overdue ? "font-semibold text-red-700" : ""}>
                    {fmtDate(report.dueOn)} ({report.workingDaysAllowed} wd)
                  </span>
                }
              />
              {report.receivedOn && (
                <Row label="Received" value={fmtDate(report.receivedOn)} />
              )}
              {report.adequacy !== "Pending" && (
                <Row label="Adequacy" value={humanize(report.adequacy)} />
              )}
            </div>

            {report.status !== "Closed" && (
              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                {!report.receivedOn && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      run(
                        () => received.mutateAsync({ reportId: report.id, receivedOn: today }),
                        "Marked received",
                      )
                    }
                  >
                    Mark received
                  </Button>
                )}
                {report.receivedOn && (
                  <>
                    <Button
                      onClick={() =>
                        run(
                          () =>
                            review.mutateAsync({ reportId: report.id, adequacy: "Adequate" }),
                          "Approved — vendor classified Approved",
                        )
                      }
                    >
                      Adequate → Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        run(
                          () =>
                            review.mutateAsync({
                              reportId: report.id,
                              adequacy: "Inadequate",
                              verificationMethod: "FollowUpAudit",
                            }),
                          "Inadequate — follow-up audit created",
                        )
                      }
                    >
                      Inadequate → Follow-up
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function DetailsCard({ audit }: { audit: AuditDetail }) {
  return (
    <Card>
      <CardHeader title="Details" />
      <CardBody className="space-y-3 text-sm">
        <Row label="Category" value={humanize(audit.category)} />
        <Row
          label="Class"
          value={`${audit.class}${audit.classSource === "Manual" ? " (manual)" : ""}`}
        />
        <Row label="Scope" value={audit.scope ?? "—"} />
        <Row label="Objective" value={audit.objective ?? "—"} />
        <Row
          label="Scheduled"
          value={
            audit.scheduledFrom
              ? `${fmtDate(audit.scheduledFrom)} – ${fmtDate(audit.scheduledTo)}`
              : "—"
          }
        />
        <Row
          label="Conducted"
          value={
            audit.actualFrom
              ? `${fmtDate(audit.actualFrom)} – ${fmtDate(audit.actualTo)}`
              : "—"
          }
        />
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800">{value}</span>
    </div>
  );
}

// Context-sensitive transition actions driven by the current status.
function ActionsCard({ audit }: { audit: AuditDetail }) {
  const action = useAuditAction(audit.id);
  const toast = useToast();
  const [modal, setModal] = useState<null | "schedule">(null);

  async function run(path: string, body?: Record<string, unknown>, label?: string) {
    try {
      await action.mutateAsync({ path, body });
      toast.push(label ?? "Done");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Card>
      <CardHeader title="Actions" />
      <CardBody className="space-y-2">
        {audit.status === "Planned" && (
          <Button className="w-full" onClick={() => setModal("schedule")}>
            Schedule audit
          </Button>
        )}
        {audit.status === "Scheduled" && (
          <Button
            className="w-full"
            loading={action.isPending}
            onClick={() => run("start", undefined, "Audit started")}
          >
            Start execution
          </Button>
        )}
        {audit.status === "InProgress" && (
          <Button
            className="w-full"
            variant="teal"
            loading={action.isPending}
            onClick={() => run("report-draft", undefined, "Moved to report draft")}
          >
            Move to report draft
          </Button>
        )}
        {audit.status === "ReportDraft" && (
          <Button
            className="w-full"
            variant="gold"
            loading={action.isPending}
            onClick={() =>
              run("request-signature", {}, "Signature requested via ERES")
            }
          >
            <FileSignature size={16} /> Request signature
          </Button>
        )}
        {audit.status === "Signed" && (
          <p className="text-sm text-gray-500">
            Report signed. Closure follows once all CAPAs are verified and signed.
          </p>
        )}
        {audit.status === "Closed" && (
          <p className="text-sm text-gray-500">This audit is closed.</p>
        )}

        {(audit.status === "Scheduled" || audit.status === "ReportDraft") &&
          audit.status === "ReportDraft" && (
            <p className="text-xs text-gray-400">
              Signing creates an envelope in ERES Manager and locks all findings.
            </p>
          )}
      </CardBody>

      <ScheduleModal
        open={modal === "schedule"}
        onClose={() => setModal(null)}
        auditId={audit.id}
        auditClass={audit.class}
      />
    </Card>
  );
}

function ScheduleModal({
  open,
  onClose,
  auditId,
  auditClass,
}: {
  open: boolean;
  onClose: () => void;
  auditId: string;
  auditClass: AuditClass;
}) {
  const action = useAuditAction(auditId);
  const { data: auditors } = useAuditorProfiles();
  const toast = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [leadAuditorId, setLead] = useState("");
  const [team, setTeam] = useState<string[]>([]);

  // Only user-linked profiles can be assigned (eligibility matches by user id).
  const linkable = (auditors ?? []).filter((a) => a.userId);

  function leadHint(a: AuditorProfileItem): string {
    const yrs = a.experienceStartDate
      ? Math.max(0, new Date().getFullYear() - new Date(a.experienceStartDate).getFullYear())
      : 0;
    const mgrPlus = a.designation
      ? ["Manager", "SeniorManager", "GeneralManager", "Director"].includes(a.designation)
      : false;
    const ok =
      auditClass === "A" ? mgrPlus || yrs >= 5 : auditClass === "B" ? mgrPlus || yrs >= 3 : mgrPlus || yrs >= 2;
    return ok ? "" : ` — not eligible for Class ${auditClass}`;
  }

  function toggleTeam(userId: string) {
    setTeam((t) => (t.includes(userId) ? t.filter((x) => x !== userId) : [...t, userId]));
  }

  async function submit() {
    try {
      await action.mutateAsync({
        path: "schedule",
        body: { from, to, leadAuditorId, teamUserIds: team.filter((u) => u !== leadAuditorId) },
      });
      toast.push("Audit scheduled");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule audit">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>

        <Field label="Lead auditor" hint={`Class ${auditClass} eligibility applies`}>
          <Select value={leadAuditorId} onChange={(e) => setLead(e.target.value)}>
            <option value="">Select a lead…</option>
            {linkable.map((a) => (
              <option key={a.id} value={a.userId!}>
                {a.fullName}
                {a.designation ? ` · ${a.designation}` : ""}
                {leadHint(a)}
              </option>
            ))}
          </Select>
        </Field>

        {linkable.length === 0 && (
          <p className="text-xs text-amber-700">
            No user-linked auditors yet. Create one under Auditors (link a user + set
            designation/experience) before scheduling.
          </p>
        )}

        <Field label="Team members" hint="At least one certified or Manager+ (§5.3.4)">
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
            {linkable.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={team.includes(a.userId!) || a.userId === leadAuditorId}
                  disabled={a.userId === leadAuditorId}
                  onChange={() => toggleTeam(a.userId!)}
                />
                {a.fullName}
                {a.isCertified ? " · certified" : ""}
              </label>
            ))}
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={action.isPending}
            disabled={!from || !to || !leadAuditorId}
          >
            Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function FindingsCard({ audit }: { audit: AuditDetail }) {
  const [showRaise, setShowRaise] = useState(false);
  const canRaise = audit.status !== "Signed" && audit.status !== "Closed";

  return (
    <Card>
      <CardHeader
        title="Findings"
        subtitle={`${audit.findings.length} raised`}
        action={
          canRaise ? (
            <Button size="sm" variant="outline" onClick={() => setShowRaise(true)}>
              <Plus size={14} /> Raise finding
            </Button>
          ) : undefined
        }
      />
      <CardBody className={audit.findings.length ? "p-0" : ""}>
        {audit.findings.length === 0 ? (
          <EmptyState
            title="No findings"
            message="No findings have been raised on this audit."
          />
        ) : (
          <ul className="divide-y divide-[var(--pk-line)]">
            {audit.findings.map((f) => (
              <li key={f.id} className="flex items-start gap-3 px-5 py-3">
                <FindingBadge cls={f.classification} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">{f.description}</p>
                  <p className="mt-0.5 tabular text-xs text-gray-400">
                    {f.findingNo}
                    {f.refClause ? ` · ${f.refClause}` : ""}
                    {f.isLocked ? " · locked" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <RaiseFindingModal
        open={showRaise}
        onClose={() => setShowRaise(false)}
        auditId={audit.id}
      />
    </Card>
  );
}

function RaiseFindingModal({
  open,
  onClose,
  auditId,
}: {
  open: boolean;
  onClose: () => void;
  auditId: string;
}) {
  const action = useAuditAction(auditId);
  const toast = useToast();
  const [classification, setCls] = useState<FindingClass>("Major");
  const [description, setDesc] = useState("");
  const [refClause, setRef] = useState("");

  async function submit() {
    try {
      await action.mutateAsync({
        path: "findings",
        body: { classification, description, refClause, auditResponseId: null },
      });
      toast.push("Finding raised");
      onClose();
      setDesc("");
      setRef("");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Raise finding">
      <div className="space-y-4">
        <Field label="Classification">
          <Select
            value={classification}
            onChange={(e) => setCls(e.target.value as FindingClass)}
          >
            <option value="Critical">Critical</option>
            <option value="Major">Major</option>
            <option value="Minor">Minor</option>
            <option value="Recommendation">Recommendation</option>
          </Select>
        </Field>
        <Field label="Description">
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe the observation"
          />
        </Field>
        <Field label="Reference clause" hint="Optional regulatory clause">
          <Input
            value={refClause}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. ICH Q7 §6.2"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={action.isPending} disabled={!description}>
            Raise finding
          </Button>
        </div>
      </div>
    </Modal>
  );
}