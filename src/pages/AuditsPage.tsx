import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAudits, useCreateAudit, useAuditees } from "@/lib/hooks";
import {
  Button,
  Card,
  CardBody,
  Field,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  EmptyState,
  AuditStatusBadge,
  Badge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate, humanize } from "@/lib/utils";
import type { AuditType, AuditCategory, AuditClass } from "@/types";

const AUDIT_STATUSES = [
  "Planned",
  "Scheduled",
  "InProgress",
  "ReportDraft",
  "Signed",
  "Closed",
];

export function AuditsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading, error } = useAudits(statusFilter || undefined);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader
        title="Audits"
        subtitle="Plan, conduct, and close vendor and internal audits"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New audit
          </Button>
        }
      />

      <div className="mb-4 flex gap-2">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All statuses</option>
          {AUDIT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No audits yet"
          message="Create an audit against an auditee to begin the lifecycle."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New audit
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Audit no.</th>
                  <th className="px-5 py-3 font-medium">Auditee</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Scheduled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/audits/${a.id}`}
                        className="tabular font-medium text-[var(--pk-navy)] hover:text-[var(--pk-teal)]"
                      >
                        {a.auditNo}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{a.auditee}</td>
                    <td className="px-5 py-3">
                      <Badge tone="muted">{humanize(a.type)}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <AuditStatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {a.scheduledFrom ? (
                        <>
                          {fmtDate(a.scheduledFrom)} – {fmtDate(a.scheduledTo)}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      )}

      <CreateAuditModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function CreateAuditModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateAudit();
  const auditees = useAuditees();
  const toast = useToast();
  const [auditeeId, setAuditeeId] = useState("");
  const [type, setType] = useState<AuditType>("Onsite");
  const [category, setCategory] = useState<AuditCategory>("FirstTime");
  // Empty string = let the backend auto-derive the class from the auditee.
  const [klass, setKlass] = useState<AuditClass | "">("");
  const [scope, setScope] = useState("");
  const [objective, setObjective] = useState("");

  async function submit() {
    try {
      await create.mutateAsync({
        auditeeId,
        type,
        category,
        scope,
        objective,
        ...(klass ? { class: klass } : {}),
      });
      toast.push("Audit created");
      onClose();
      setAuditeeId("");
      setCategory("FirstTime");
      setKlass("");
      setScope("");
      setObjective("");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New audit">
      <div className="space-y-4">
        <Field label="Auditee">
          <Select value={auditeeId} onChange={(e) => setAuditeeId(e.target.value)}>
            <option value="">Select an auditee…</option>
            {auditees.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Audit type">
          <Select value={type} onChange={(e) => setType(e.target.value as AuditType)}>
            <option value="Onsite">On-site</option>
            <option value="Remote">Remote</option>
            <option value="Postal">Postal / questionnaire</option>
            <option value="ForCause">For cause</option>
            <option value="Internal">Internal</option>
          </Select>
        </Field>
        <Field label="Audit category">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as AuditCategory)}
          >
            <option value="FirstTime">First time</option>
            <option value="Periodic">Periodic</option>
            <option value="FollowUp">Follow-up</option>
            <option value="ForCause">For cause</option>
            <option value="Desk">Desk audit</option>
          </Select>
        </Field>
        <Field label="Audit class">
          <Select
            value={klass}
            onChange={(e) => setKlass(e.target.value as AuditClass | "")}
          >
            <option value="">Auto (derive from auditee)</option>
            <option value="A">A — API</option>
            <option value="B">B — KSM / intermediate / excipient / primary packaging</option>
            <option value="C">C — Others</option>
          </Select>
        </Field>
        <Field label="Scope">
          <Textarea
            rows={2}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Systems, areas, and processes covered"
          />
        </Field>
        <Field label="Objective">
          <Textarea
            rows={2}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!auditeeId}>
            Create audit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
