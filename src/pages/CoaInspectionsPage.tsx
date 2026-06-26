import { useState } from "react";
import { Plus } from "lucide-react";
import {
  useCoaInspections,
  useCreateCoaInspection,
  useReviewCoa,
  useSiteOptions,
  useMaterials,
} from "@/lib/hooks";
import { Button, Card, CardBody, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { CoaInspectionListItem, CoaResult } from "@/types";

function ResultBadge({ value }: { value: CoaResult }) {
  const tone = value === "Pass" ? "ok" : value === "Fail" ? "danger" : "muted";
  const label = value === "PendingReview" ? "Pending review" : value;
  return <Badge tone={tone}>{label}</Badge>;
}

export function CoaInspectionsPage() {
  const { data, isLoading, error } = useCoaInspections();
  const sites = useSiteOptions();
  const [showCreate, setShowCreate] = useState(false);
  const [reviewing, setReviewing] = useState<CoaInspectionListItem | null>(null);

  const siteName = (id: string) => sites.data?.find((s) => s.id === id)?.siteName ?? "—";

  return (
    <>
      <PageHeader
        title="CoA Inspections"
        subtitle="Certificate of Analysis inspections against material specification"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New inspection
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No CoA inspections yet"
          message="Record an incoming Certificate of Analysis, then review it against spec. An out-of-spec result flags a possible SNCR/investigation."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New inspection
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Record</th>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">Batch/Lot</th>
                  <th className="px-5 py-3 font-medium">Result</th>
                  <th className="px-5 py-3 font-medium">OOS</th>
                  <th className="px-5 py-3 font-medium">Reviewed</th>
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
                    <td className="px-5 py-3 text-gray-500">{c.batchLot ?? "—"}</td>
                    <td className="px-5 py-3">
                      <ResultBadge value={c.overallResult} />
                    </td>
                    <td className="px-5 py-3">
                      {c.oosFlag ? <Badge tone="danger">OOS</Badge> : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(c.reviewedDate)}</td>
                    <td className="px-5 py-3 text-right">
                      {c.overallResult === "PendingReview" && (
                        <Button size="sm" variant="outline" onClick={() => setReviewing(c)}>
                          Review
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <CreateCoaModal open={showCreate} onClose={() => setShowCreate(false)} />
      {reviewing && (
        <ReviewCoaModal coa={reviewing} onClose={() => setReviewing(null)} />
      )}
    </>
  );
}

function CreateCoaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateCoaInspection();
  const sites = useSiteOptions();
  const materials = useMaterials();
  const toast = useToast();
  const empty = {
    supplierSiteId: "",
    materialId: "",
    batchLot: "",
    coaFileRef: "",
    parameters: "",
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // `parameters` is a jsonb column. If the user typed valid JSON, send it as-is;
  // otherwise wrap their text as a JSON string so it's always valid jsonb.
  function toJsonb(text: string): string | null {
    const t = text.trim();
    if (!t) return null;
    try {
      JSON.parse(t);
      return t; // already valid JSON
    } catch {
      return JSON.stringify(t); // wrap plain text as a JSON string
    }
  }

  async function submit() {
    try {
      await create.mutateAsync({
        supplierSiteId: form.supplierSiteId,
        materialId: form.materialId,
        batchLot: form.batchLot,
        coaFileRef: form.coaFileRef || null,
        parameters: toJsonb(form.parameters),
      });
      toast.push("CoA inspection created");
      onClose();
      setForm(empty);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New CoA inspection">
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Batch / Lot">
            <Input value={form.batchLot} onChange={(e) => set("batchLot", e.target.value)} />
          </Field>
          <Field label="CoA file ref" hint="Document reference">
            <Input value={form.coaFileRef} onChange={(e) => set("coaFileRef", e.target.value)} />
          </Field>
        </div>
        <Field label="Parameters" hint="Optional JSON or free text of tested parameters">
          <Textarea
            rows={3}
            value={form.parameters}
            onChange={(e) => set("parameters", e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={create.isPending}
            disabled={!form.supplierSiteId || !form.materialId || !form.batchLot}
          >
            Create inspection
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReviewCoaModal({
  coa,
  onClose,
}: {
  coa: CoaInspectionListItem;
  onClose: () => void;
}) {
  const review = useReviewCoa(coa.id);
  const toast = useToast();
  const [result, setResult] = useState<CoaResult>("Pass");
  const [oos, setOos] = useState(false);

  async function submit() {
    try {
      await review.mutateAsync({ overallResult: result, oosFlag: oos });
      toast.push("CoA reviewed");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open onClose={onClose} title={`Review ${coa.recordNumber ?? "CoA"}`}>
      <div className="space-y-4">
        <Field label="Overall result">
          <Select value={result} onChange={(e) => setResult(e.target.value as CoaResult)}>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={oos} onChange={(e) => setOos(e.target.checked)} />
          Flag as out-of-spec (OOS)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={review.isPending}>
            Save review
          </Button>
        </div>
      </div>
    </Modal>
  );
}