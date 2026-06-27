import { useState } from "react";
import { Plus } from "lucide-react";
import {
  useChangeNotifications,
  useCreateChangeNotification,
  useAssessChange,
  useSiteOptions,
} from "@/lib/hooks";
import { Button, Card, CardBody, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { humanize } from "@/lib/utils";
import type {
  ChangeNotificationListItem,
  ChangeIntakeChannel,
  ChangeType,
  ImpactLevel,
  ChangeDecision,
} from "@/types";

const channels: ChangeIntakeChannel[] = ["EmailProcessor", "Portal", "Manual"];
const changeTypes: ChangeType[] = [
  "Process",
  "SiteLocation",
  "RawMaterial",
  "Equipment",
  "Ownership",
  "Spec",
  "Other",
];
const impactLevels: ImpactLevel[] = ["None", "Low", "Medium", "High"];
const decisions: ChangeDecision[] = ["Accepted", "Rejected", "NoAction"];

function impactTone(v?: ImpactLevel | null) {
  if (v === "High") return "danger" as const;
  if (v === "Medium") return "warn" as const;
  if (v === "Low") return "info" as const;
  return "muted" as const;
}

export function ChangeNotificationsPage() {
  const { data, isLoading, error } = useChangeNotifications();
  const sites = useSiteOptions();
  const [showCreate, setShowCreate] = useState(false);
  const [assessing, setAssessing] = useState<ChangeNotificationListItem | null>(null);

  const siteName = (id: string) => sites.data?.find((s) => s.id === id)?.siteName ?? "—";

  return (
    <>
      <PageHeader
        title="Change Control"
        subtitle="Supplier change notifications — intake, impact assessment, and decision"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New change
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No change notifications yet"
          message="Record a supplier change (process, site, material, ownership, etc.), assess its impact, and decide whether to accept it."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New change
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Record</th>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">Impact</th>
                  <th className="px-5 py-3 font-medium">Decision</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[var(--pk-navy)]">
                      {c.recordNumber}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{siteName(c.supplierSiteId)}</td>
                    <td className="px-5 py-3">
                      <Badge tone="muted">{humanize(c.changeType)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {c.stateCode ? humanize(c.stateCode) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {c.impactLevel ? (
                        <Badge tone={impactTone(c.impactLevel)}>{c.impactLevel}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.decision ? humanize(c.decision) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setAssessing(c)}>
                        Assess
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      )}

      <CreateChangeModal open={showCreate} onClose={() => setShowCreate(false)} />
      {assessing && (
        <AssessChangeModal change={assessing} onClose={() => setAssessing(null)} />
      )}
    </>
  );
}

function CreateChangeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateChangeNotification();
  const sites = useSiteOptions();
  const toast = useToast();
  const empty = {
    supplierSiteId: "",
    intakeChannel: "Manual" as ChangeIntakeChannel,
    changeType: "Process" as ChangeType,
    description: "",
    proposedEffectiveDate: "",
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await create.mutateAsync({
        supplierSiteId: form.supplierSiteId,
        intakeChannel: form.intakeChannel,
        changeType: form.changeType,
        description: form.description,
        proposedEffectiveDate: form.proposedEffectiveDate || null,
      });
      toast.push("Change notification created");
      onClose();
      setForm(empty);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New change notification">
      <div className="space-y-4">
        <Field label="Supplier site">
          <Select
            value={form.supplierSiteId}
            onChange={(e) => set("supplierSiteId", e.target.value)}
          >
            <option value="">Select a site…</option>
            {sites.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.siteName}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Intake channel">
            <Select
              value={form.intakeChannel}
              onChange={(e) => set("intakeChannel", e.target.value as ChangeIntakeChannel)}
            >
              {channels.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Change type">
            <Select
              value={form.changeType}
              onChange={(e) => set("changeType", e.target.value as ChangeType)}
            >
              {changeTypes.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Proposed effective date" hint="Optional">
          <Input
            type="date"
            value={form.proposedEffectiveDate}
            onChange={(e) => set("proposedEffectiveDate", e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={create.isPending}
            disabled={!form.supplierSiteId || !form.description}
          >
            Create change
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AssessChangeModal({
  change,
  onClose,
}: {
  change: ChangeNotificationListItem;
  onClose: () => void;
}) {
  const assess = useAssessChange(change.id);
  const toast = useToast();
  const [form, setForm] = useState({
    impactAssessment: "",
    impactLevel: "Low" as ImpactLevel,
    decision: "Accepted" as ChangeDecision,
  });

  async function submit() {
    try {
      await assess.mutateAsync(form);
      toast.push("Assessment recorded");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open onClose={onClose} title={`Assess ${change.recordNumber ?? "change"}`}>
      <div className="space-y-4">
        <Field label="Impact assessment">
          <Textarea
            rows={3}
            value={form.impactAssessment}
            onChange={(e) => setForm((f) => ({ ...f, impactAssessment: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Impact level">
            <Select
              value={form.impactLevel}
              onChange={(e) =>
                setForm((f) => ({ ...f, impactLevel: e.target.value as ImpactLevel }))
              }
            >
              {impactLevels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Decision">
            <Select
              value={form.decision}
              onChange={(e) =>
                setForm((f) => ({ ...f, decision: e.target.value as ChangeDecision }))
              }
            >
              {decisions.map((d) => (
                <option key={d} value={d}>
                  {humanize(d)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={assess.isPending} disabled={!form.impactAssessment}>
            Save assessment
          </Button>
        </div>
      </div>
    </Modal>
  );
}