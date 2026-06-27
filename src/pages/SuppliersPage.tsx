import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useSupplierParents, useCreateSupplierParent } from "@/lib/hooks";
import { Button, Card, CardBody, Field, Input, Select } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import type { SupplierCategory } from "@/types";

const categoryLabels: Record<SupplierCategory, string> = {
  Api: "API",
  Excipient: "Excipient",
  Packaging: "Packaging",
  Component: "Component",
  Cmo: "CMO",
  Cro: "CRO",
  Lab: "Lab",
  Service: "Service",
  Logistics: "Logistics",
};

export function SuppliersPage() {
  const { data, isLoading, error } = useSupplierParents();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Supplier companies and their regulated manufacturing sites"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New supplier
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          message="Add a supplier company, then add its manufacturing or service sites to begin qualification."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New supplier
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Legal name</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Country</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Sites</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/suppliers/${p.id}`}
                        className="font-medium text-[var(--pk-navy)] hover:text-[var(--pk-teal)]"
                      >
                        {p.legalName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 tabular text-gray-500">
                      {p.recordNumber}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="muted">{categoryLabels[p.category]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.country}</td>
                    <td className="px-5 py-3">
                      <Badge tone={p.parentStatus === "Active" ? "ok" : "muted"}>
                        {p.parentStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.siteCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      )}

      <CreateSupplierModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function CreateSupplierModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSupplierParent();
  const toast = useToast();
  const empty = {
    legalName: "",
    displayName: "",
    dunsNumber: "",
    erpVendorId: "",
    category: "Api" as SupplierCategory,
    country: "",
    website: "",
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await create.mutateAsync(form);
      toast.push("Supplier created");
      onClose();
      setForm(empty);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New supplier">
      <div className="space-y-4">
        <Field label="Legal name">
          <Input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Display name">
            <Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} />
          </Field>
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => set("category", e.target.value as SupplierCategory)}
            >
              {Object.entries(categoryLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Country" hint="ISO country">
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
          </Field>
          <Field label="DUNS number">
            <Input value={form.dunsNumber} onChange={(e) => set("dunsNumber", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="ERP vendor ID">
            <Input value={form.erpVendorId} onChange={(e) => set("erpVendorId", e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!form.legalName || !form.country}>
            Create supplier
          </Button>
        </div>
      </div>
    </Modal>
  );
}