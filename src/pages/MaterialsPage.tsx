import { useState } from "react";
import { Plus } from "lucide-react";
import { useMaterials, useCreateMaterial } from "@/lib/hooks";
import { Button, Card, CardBody, Field, Input, Select } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, CriticalityBadge, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import type { MaterialType, Criticality } from "@/types";

const materialTypeLabels: Record<MaterialType, string> = {
  DrugSubstance: "Drug substance",
  Excipient: "Excipient",
  Api: "API",
  Component: "Component",
  Packaging: "Packaging",
  Reagent: "Reagent",
};

export function MaterialsPage() {
  const { data, isLoading, error } = useMaterials();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader
        title="Materials"
        subtitle="The materials and components your suppliers are approved to provide"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New material
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No materials yet"
          message="Add the materials you procure. You can then link supplier sites to materials to build the Approved Supplier List."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New material
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Criticality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[var(--pk-navy)]">{m.name}</td>
                    <td className="px-5 py-3 tabular text-gray-500">{m.materialCode}</td>
                    <td className="px-5 py-3">
                      <Badge tone="muted">{materialTypeLabels[m.materialType]}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <CriticalityBadge value={m.criticalityClass} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      )}

      <CreateMaterialModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function CreateMaterialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateMaterial();
  const toast = useToast();
  const empty = {
    materialCode: "",
    name: "",
    materialType: "Api" as MaterialType,
    criticalityClass: "Major" as Criticality,
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await create.mutateAsync(form);
      toast.push("Material created");
      onClose();
      setForm(empty);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New material">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Material code" hint="Unique">
            <Input value={form.materialCode} onChange={(e) => set("materialCode", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Type">
            <Select
              value={form.materialType}
              onChange={(e) => set("materialType", e.target.value as MaterialType)}
            >
              {Object.entries(materialTypeLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Criticality class">
            <Select
              value={form.criticalityClass}
              onChange={(e) => set("criticalityClass", e.target.value as Criticality)}
            >
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!form.name || !form.materialCode}>
            Create material
          </Button>
        </div>
      </div>
    </Modal>
  );
}