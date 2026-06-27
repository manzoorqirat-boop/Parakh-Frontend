import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, FileSignature } from "lucide-react";
import { useAudit, useAuditAction, useUsers } from "@/lib/hooks";
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
import type { AuditDetail, FindingClass } from "@/types";

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
          <div className="flex items-center gap-3">
            <h1 className="tabular text-xl font-bold text-[var(--pk-navy)]">
              {data.auditNo}
            </h1>
            <AuditStatusBadge status={data.status} />
            <Badge tone="muted">{humanize(data.type)}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">{data.auditee.name}</p>
        </div>
      </div>

      {/* Lifecycle rail — the signature element */}
      <Card className="mb-6">
        <CardBody>
          <LifecycleRail steps={AUDIT_LIFECYCLE} current={data.status} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FindingsCard audit={data} />
        </div>
        <div className="space-y-6">
          <ActionsCard audit={data} />
          <DetailsCard audit={data} />
        </div>
      </div>
    </>
  );
}

function DetailsCard({ audit }: { audit: AuditDetail }) {
  return (
    <Card>
      <CardHeader title="Details" />
      <CardBody className="space-y-3 text-sm">
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
      />
    </Card>
  );
}

function ScheduleModal({
  open,
  onClose,
  auditId,
}: {
  open: boolean;
  onClose: () => void;
  auditId: string;
}) {
  const action = useAuditAction(auditId);
  const users = useUsers();
  const toast = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [leadAuditorId, setLead] = useState("");

  async function submit() {
    try {
      await action.mutateAsync({
        path: "schedule",
        body: {
          from,
          to,
          // Dropdown supplies a real user GUID (or "" -> null for no lead).
          leadAuditorId: leadAuditorId || null,
          teamUserIds: [],
        },
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <Field label="Lead auditor (optional)" hint="Pick a user, or leave blank to schedule without a lead">
          <Select value={leadAuditorId} onChange={(e) => setLead(e.target.value)}>
            <option value="">— No lead auditor —</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={action.isPending} disabled={!from || !to}>
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