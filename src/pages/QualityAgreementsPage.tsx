import { useState } from "react";
import { Plus } from "lucide-react";
import {
  useQualityAgreements,
  useCreateQualityAgreement,
  useSiteOptions,
} from "@/lib/hooks";
import { Button, Card, CardBody, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { QualityAgreementStatus } from "@/types";

const statuses: QualityAgreementStatus[] = ["Draft", "Active", "Expired", "Terminated"];

function statusTone(s: QualityAgreementStatus) {
  if (s === "Active") return "ok" as const;
  if (s === "Draft") return "muted" as const;
  if (s === "Expired") return "warn" as const;
  return "danger" as const;
}

export function QualityAgreementsPage() {
  const { data, isLoading, error } = useQualityAgreements();
  const sites = useSiteOptions();
  const [showCreate, setShowCreate] = useState(false);

  const siteName = (id: string) => sites.data?.find((s) => s.id === id)?.siteName ?? "—";

  return (
    <>
      <PageHeader
        title="Quality Agreements"
        subtitle="Quality / technical agreements per supplier site, with effective and expiry dates"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New agreement
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No quality agreements yet"
          message="Record the quality agreement governing each supplier site, including the responsibility matrix and validity dates."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New agreement
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
                  <th className="px-5 py-3 font-medium">Effective</th>
                  <th className="px-5 py-3 font-medium">Expiry</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[var(--pk-navy)]">
                      {a.recordNumber}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{siteName(a.supplierSiteId)}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(a.effectiveDate)}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(a.expiryDate)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <CreateAgreementModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function CreateAgreementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateQualityAgreement();
  const sites = useSiteOptions();
  const toast = useToast();
  const empty = {
    supplierSiteId: "",
    documentRef: "",
    effectiveDate: "",
    expiryDate: "",
    responsibilityMatrix: "",
    status: "Draft" as QualityAgreementStatus,
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // `responsibilityMatrix` is a jsonb column. Send valid JSON if the user typed
  // it, otherwise wrap their text as a JSON string so it's always valid jsonb.
  function toJsonb(text: string): string | null {
    const t = text.trim();
    if (!t) return null;
    try {
      JSON.parse(t);
      return t;
    } catch {
      return JSON.stringify(t);
    }
  }

  async function submit() {
    try {
      await create.mutateAsync({
        supplierSiteId: form.supplierSiteId,
        documentRef: form.documentRef || null,
        effectiveDate: form.effectiveDate || null,
        expiryDate: form.expiryDate || null,
        responsibilityMatrix: toJsonb(form.responsibilityMatrix),
        status: form.status,
      });
      toast.push("Quality agreement created");
      onClose();
      setForm(empty);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New quality agreement">
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Document ref" hint="Optional">
            <Input value={form.documentRef} onChange={(e) => set("documentRef", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => set("status", e.target.value as QualityAgreementStatus)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Effective date">
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => set("effectiveDate", e.target.value)}
            />
          </Field>
          <Field label="Expiry date">
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => set("expiryDate", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Responsibility matrix" hint="Optional JSON or free text">
          <Textarea
            rows={3}
            value={form.responsibilityMatrix}
            onChange={(e) => set("responsibilityMatrix", e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!form.supplierSiteId}>
            Create agreement
          </Button>
        </div>
      </div>
    </Modal>
  );
}