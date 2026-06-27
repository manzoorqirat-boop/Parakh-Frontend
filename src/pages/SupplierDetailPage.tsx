import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, ArrowLeft } from "lucide-react";
import {
  useSupplierParent,
  useSupplierSites,
  useCreateSupplierSite,
} from "@/lib/hooks";
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { SiteType, GmpStatus, RiskTier } from "@/types";

const riskTone: Record<RiskTier, "ok" | "info" | "warn" | "danger"> = {
  Low: "ok",
  Medium: "info",
  High: "warn",
  Critical: "danger",
};

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: parent, isLoading, error } = useSupplierParent(id);
  const { data: sites } = useSupplierSites(id);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!parent) return <ErrorNote message="Supplier not found." />;

  return (
    <>
      <Link
        to="/suppliers"
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--pk-navy)]"
      >
        <ArrowLeft size={14} /> Suppliers
      </Link>

      <PageHeader
        title={parent.legalName}
        subtitle={`${parent.recordNumber ?? ""} · ${parent.category} · ${parent.country}`}
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Add site
          </Button>
        }
      />

      <Card className="mb-5">
        <CardHeader title="Company details" />
        <CardBody>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 md:grid-cols-3">
            <Detail label="Display name" value={parent.displayName} />
            <Detail label="DUNS" value={parent.dunsNumber} />
            <Detail label="ERP vendor ID" value={parent.erpVendorId} />
            <Detail label="Status" value={parent.parentStatus} />
            <Detail label="Risk roll-up" value={parent.riskTierRollup ?? "—"} />
            <Detail label="Website" value={parent.website} />
          </dl>
        </CardBody>
      </Card>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
        Sites
      </h2>

      {!sites || sites.length === 0 ? (
        <EmptyState
          title="No sites yet"
          message="Add a manufacturing, packaging, testing, or service site. Each site is qualified independently."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Add site
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Risk tier</th>
                  <th className="px-5 py-3 font-medium">Qualification state</th>
                  <th className="px-5 py-3 font-medium">Requal due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {sites.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/suppliers/${parent.id}/sites/${s.id}`}
                        className="font-medium text-[var(--pk-navy)] hover:text-[var(--pk-teal)]"
                      >
                        {s.siteName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 tabular text-gray-500">{s.recordNumber}</td>
                    <td className="px-5 py-3">
                      <Badge tone="muted">{s.siteType}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={riskTone[s.riskTier]}>{s.riskTier}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {s.stateCode ? (
                        <Badge tone="info">{s.stateCode}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(s.requalificationDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      )}

      {id && (
        <CreateSiteModal
          parentId={id}
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-[var(--pk-navy)]">{value || "—"}</dd>
    </div>
  );
}

function CreateSiteModal({
  parentId,
  open,
  onClose,
}: {
  parentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateSupplierSite();
  const toast = useToast();
  const empty = {
    siteName: "",
    address: "",
    siteType: "Manufacturing" as SiteType,
    gmpStatus: "Unknown" as GmpStatus,
    riskTier: "Medium" as RiskTier,
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await create.mutateAsync({ ...form, parentId, address: form.address || null });
      toast.push("Site added");
      onClose();
      setForm(empty);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add site">
      <div className="space-y-4">
        <Field label="Site name">
          <Input value={form.siteName} onChange={(e) => set("siteName", e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Street, city, region, postal, country"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Site type">
            <Select value={form.siteType} onChange={(e) => set("siteType", e.target.value as SiteType)}>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Packaging">Packaging</option>
              <option value="TestingLab">Testing lab</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Service">Service</option>
            </Select>
          </Field>
          <Field label="GMP status">
            <Select value={form.gmpStatus} onChange={(e) => set("gmpStatus", e.target.value as GmpStatus)}>
              <option value="Gmp">GMP</option>
              <option value="NonGmp">Non-GMP</option>
              <option value="Unknown">Unknown</option>
            </Select>
          </Field>
          <Field label="Risk tier">
            <Select value={form.riskTier} onChange={(e) => set("riskTier", e.target.value as RiskTier)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!form.siteName}>
            Add site
          </Button>
        </div>
      </div>
    </Modal>
  );
}