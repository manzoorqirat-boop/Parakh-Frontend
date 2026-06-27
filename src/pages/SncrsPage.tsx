import { useState } from "react";
import { Plus } from "lucide-react";
import {
  useSncrs,
  useCreateSncr,
  useSiteOptions,
  useMaterials,
} from "@/lib/hooks";
import { Button, Card, CardBody, Field, Input, Select } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge, SeverityBadge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { humanize } from "@/lib/utils";
import type { DefectCategory, Severity, SncrDisposition } from "@/types";

const defectCategories: DefectCategory[] = [
  "Oos",
  "Damage",
  "Labeling",
  "Documentation",
  "Contamination",
  "Quantity",
  "Other",
];
const dispositions: SncrDisposition[] = ["Reject", "Return", "UseAsIs", "Rework", "Scrap"];

export function SncrsPage() {
  const { data, isLoading, error } = useSncrs();
  const sites = useSiteOptions();
  const [showCreate, setShowCreate] = useState(false);

  const siteName = (id: string) =>
    sites.data?.find((s) => s.id === id)?.siteName ?? "—";

  return (
    <>
      <PageHeader
        title="SNCRs"
        subtitle="Supplier non-conformance reports — incoming defects, OOS, and dispositions"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New SNCR
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No SNCRs yet"
          message="Log a supplier non-conformance when incoming material fails inspection. Critical/major SNCRs can be escalated to a SCAR."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New SNCR
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
                  <th className="px-5 py-3 font-medium">Batch/Lot</th>
                  <th className="px-5 py-3 font-medium">Defect</th>
                  <th className="px-5 py-3 font-medium">Severity</th>
                  <th className="px-5 py-3 font-medium">Disposition</th>
                  <th className="px-5 py-3 font-medium">SCAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[var(--pk-navy)]">
                      {s.recordNumber}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{siteName(s.supplierSiteId)}</td>
                    <td className="px-5 py-3 text-gray-500">{s.batchLot ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone="muted">{humanize(s.defectCategory)}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <SeverityBadge value={s.severity} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {s.disposition ? humanize(s.disposition) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {s.scarId ? <Badge tone="info">Escalated</Badge> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      )}

      <CreateSncrModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function CreateSncrModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSncr();
  const sites = useSiteOptions();
  const materials = useMaterials();
  const toast = useToast();
  const empty = {
    supplierSiteId: "",
    materialId: "",
    batchLot: "",
    quantityAffected: "",
    defectCategory: "Oos" as DefectCategory,
    severity: "Major" as Severity,
    disposition: "" as SncrDisposition | "",
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await create.mutateAsync({
        supplierSiteId: form.supplierSiteId,
        materialId: form.materialId,
        batchLot: form.batchLot || null,
        quantityAffected: form.quantityAffected ? Number(form.quantityAffected) : null,
        defectCategory: form.defectCategory,
        severity: form.severity,
        disposition: form.disposition || null,
      });
      toast.push("SNCR created");
      onClose();
      setForm(empty);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New SNCR">
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
        <Field label="Material">
          <Select value={form.materialId} onChange={(e) => set("materialId", e.target.value)}>
            <option value="">Select a material…</option>
            {materials.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.materialCode})
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Batch / Lot">
            <Input value={form.batchLot} onChange={(e) => set("batchLot", e.target.value)} />
          </Field>
          <Field label="Quantity affected">
            <Input
              type="number"
              value={form.quantityAffected}
              onChange={(e) => set("quantityAffected", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Defect category">
            <Select
              value={form.defectCategory}
              onChange={(e) => set("defectCategory", e.target.value as DefectCategory)}
            >
              {defectCategories.map((d) => (
                <option key={d} value={d}>
                  {humanize(d)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severity">
            <Select
              value={form.severity}
              onChange={(e) => set("severity", e.target.value as Severity)}
            >
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </Select>
          </Field>
        </div>
        <Field label="Disposition" hint="Optional at intake">
          <Select
            value={form.disposition}
            onChange={(e) => set("disposition", e.target.value as SncrDisposition | "")}
          >
            <option value="">—</option>
            {dispositions.map((d) => (
              <option key={d} value={d}>
                {humanize(d)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={create.isPending}
            disabled={!form.supplierSiteId || !form.materialId}
          >
            Create SNCR
          </Button>
        </div>
      </div>
    </Modal>
  );
}