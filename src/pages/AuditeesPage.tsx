import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuditees, useCreateAuditee } from "@/lib/hooks";
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  EmptyState,
  CriticalityBadge,
  QualBadge,
  Badge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { AuditeeType, Criticality, MaterialCategory } from "@/types";

const typeLabels: Record<AuditeeType, string> = {
  Supplier: "Supplier",
  Cmo: "CMO",
  Cro: "CRO",
  InternalDept: "Internal dept.",
};

export function AuditeesPage() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const { data, isLoading, error } = useAuditees(typeFilter || undefined);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader
        title="Auditees"
        subtitle="Suppliers, contract organisations, and internal departments"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New auditee
          </Button>
        }
      />

      <div className="mb-4 flex gap-2">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All types</option>
          <option value="Supplier">Suppliers</option>
          <option value="Cmo">CMOs</option>
          <option value="Cro">CROs</option>
          <option value="InternalDept">Internal departments</option>
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No auditees yet"
          message="Add your first supplier, CMO, CRO, or internal department to start building the audit programme."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New auditee
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Criticality</th>
                  <th className="px-5 py-3 font-medium">Qualification</th>
                  <th className="px-5 py-3 font-medium">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/auditees/${a.id}`}
                        className="font-medium text-[var(--pk-navy)] hover:text-[var(--pk-teal)]"
                      >
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 tabular text-gray-500">{a.code}</td>
                    <td className="px-5 py-3">
                      <Badge tone="muted">{typeLabels[a.type]}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <CriticalityBadge value={a.criticality} />
                    </td>
                    <td className="px-5 py-3">
                      <QualBadge value={a.qualStatus} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {fmtDate(a.qualificationExpiry)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      )}

      <CreateAuditeeModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function CreateAuditeeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateAuditee();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "Supplier" as AuditeeType,
    criticality: "Major" as Criticality,
    materialCategory: "" as MaterialCategory | "",
    materialOrServiceCategory: "",
    country: "",
    contactEmail: "",
    qualificationExpiry: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await create.mutateAsync({
        ...form,
        materialCategory: form.materialCategory || null,
        qualificationExpiry: form.qualificationExpiry || null,
      });
      toast.push("Auditee created");
      onClose();
      setForm({
        name: "",
        code: "",
        type: "Supplier",
        criticality: "Major",
        materialCategory: "",
        materialOrServiceCategory: "",
        country: "",
        contactEmail: "",
        qualificationExpiry: "",
      });
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New auditee">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Code" hint="Unique short identifier">
            <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(e) => set("type", e.target.value as AuditeeType)}
            >
              <option value="Supplier">Supplier</option>
              <option value="Cmo">CMO</option>
              <option value="Cro">CRO</option>
              <option value="InternalDept">Internal department</option>
            </Select>
          </Field>
          <Field label="Criticality">
            <Select
              value={form.criticality}
              onChange={(e) => set("criticality", e.target.value as Criticality)}
            >
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </Select>
          </Field>
        </div>
        <Field label="Material / service category" hint="Drives audit class, number & frequency">
          <Select
            value={form.materialCategory}
            onChange={(e) => set("materialCategory", e.target.value as MaterialCategory | "")}
          >
            <option value="">Select a category…</option>
            <option value="Api">API</option>
            <option value="Ksm">KSM (key starting material)</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Excipient">Excipient</option>
            <option value="PrimaryPackaging">Primary packaging</option>
            <option value="PrintedPackaging">Printed packaging</option>
            <option value="DrugProduct">Drug product</option>
            <option value="Other">Other</option>
          </Select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </Field>
          <Field label="Qualification expiry">
            <Input
              type="date"
              value={form.qualificationExpiry}
              onChange={(e) => set("qualificationExpiry", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Contact email">
          <Input
            type="email"
            value={form.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={create.isPending}
            disabled={!form.name || !form.code}
          >
            Create auditee
          </Button>
        </div>
      </div>
    </Modal>
  );
}