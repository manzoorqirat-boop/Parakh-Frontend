import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useCapas, useCreateCapa, useFindings } from "@/lib/hooks";
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  EmptyState,
  CapaStatusBadge,
  Badge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate, humanize, daysUntil } from "@/lib/utils";
import type { ActionType } from "@/types";

const CAPA_STATUSES = [
  "Open",
  "InProgress",
  "PendingVerification",
  "Closed",
  "Overdue",
];

export function CapasPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading, error } = useCapas(statusFilter || undefined);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader
        title="CAPAs"
        subtitle="Corrective and preventive actions through to verified closure"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New CAPA
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
          {CAPA_STATUSES.map((s) => (
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
          title="No CAPAs yet"
          message="CAPAs are raised against findings once an audit report is signed."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">CAPA no.</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((c) => {
                  const dleft = daysUntil(c.dueDate);
                  const overdue =
                    dleft !== null && dleft < 0 && c.status !== "Closed";
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <Link
                          to={`/capas/${c.id}`}
                          className="tabular font-medium text-[var(--pk-navy)] hover:text-[var(--pk-teal)]"
                        >
                          {c.capaNo}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="muted">{humanize(c.actionType)}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <CapaStatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            overdue ? "text-[var(--color-critical)]" : "text-gray-500"
                          }
                        >
                          {fmtDate(c.dueDate)}
                          {overdue && ` · ${Math.abs(dleft!)}d late`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <CreateCapaModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function CreateCapaModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateCapa();
  const findings = useFindings();
  const toast = useToast();
  const [form, setForm] = useState({
    findingId: "",
    actionType: "Corrective" as ActionType,
    actionDescription: "",
    rootCause: "",
    dueDate: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await create.mutateAsync({
        ...form,
        ownerId: null,
        dueDate: form.dueDate || null,
      });
      toast.push("CAPA created");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New CAPA">
      <div className="space-y-4">
        <Field label="Finding" hint="The signed finding this CAPA addresses">
          <Select value={form.findingId} onChange={(e) => set("findingId", e.target.value)}>
            <option value="">Select a finding…</option>
            {findings.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.findingNo} · {f.classification} · {f.description.slice(0, 40)}
                {f.description.length > 40 ? "…" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Action type">
          <Select
            value={form.actionType}
            onChange={(e) => set("actionType", e.target.value as ActionType)}
          >
            <option value="Corrective">Corrective</option>
            <option value="Preventive">Preventive</option>
            <option value="Correction">Correction</option>
          </Select>
        </Field>
        <Field label="Root cause">
          <Textarea
            rows={2}
            value={form.rootCause}
            onChange={(e) => set("rootCause", e.target.value)}
          />
        </Field>
        <Field label="Action description">
          <Textarea
            rows={3}
            value={form.actionDescription}
            onChange={(e) => set("actionDescription", e.target.value)}
          />
        </Field>
        <Field label="Due date">
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={create.isPending}
            disabled={!form.findingId || !form.actionDescription}
          >
            Create CAPA
          </Button>
        </div>
      </div>
    </Modal>
  );
}