import { useState } from "react";
import { Plus, Server, CheckCircle2, XCircle, Wifi } from "lucide-react";
import {
  useErpConnections,
  useUpsertErpConnection,
  useTestErpConnection,
} from "@/lib/mdm";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import { Spinner, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { apiError } from "@/lib/api";
import type { ErpConnection, ErpConnectionUpsert, ErpKind } from "@/types";

const kindLabels: Record<ErpKind, string> = {
  SapS4HanaOData: "SAP S/4HANA (OData)",
  SapEccGateway: "SAP ECC (Gateway)",
  GenericRest: "Generic REST/OData",
};

export function ErpConnectionsPanel() {
  const { data, isLoading } = useErpConnections();
  const test = useTestErpConnection();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);

  async function onTest(id: string) {
    try {
      const r = await test.mutateAsync(id);
      toast.push(r.message, r.ok ? "ok" : "error");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="ERP connections"
          subtitle="SAP / ERP endpoints available for sync"
          action={
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add
            </Button>
          }
        />
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner />
          ) : !data || data.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              <Server size={22} className="mx-auto mb-2 text-gray-300" />
              No connections configured yet.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--pk-line)]">
              {data.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-[var(--pk-navy)]">
                          {c.name}
                        </span>
                        {c.isActive ? (
                          <Badge tone="ok">Active</Badge>
                        ) : (
                          <Badge tone="muted">Inactive</Badge>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">
                        {kindLabels[c.kind]} · {c.baseUrl}
                      </div>
                      {c.lastTestResult && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                          {c.lastTestResult.toLowerCase().includes("ok") ? (
                            <CheckCircle2 size={12} className="text-green-600" />
                          ) : (
                            <XCircle size={12} className="text-red-500" />
                          )}
                          {c.lastTestResult}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onTest(c.id)}
                      loading={test.isPending}
                    >
                      <Wifi size={14} /> Test
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ConnectionForm open={showForm} onClose={() => setShowForm(false)} />
    </>
  );
}

function ConnectionForm({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: ErpConnection;
}) {
  const upsert = useUpsertErpConnection();
  const toast = useToast();
  const empty: ErpConnectionUpsert = {
    name: existing?.name ?? "",
    kind: existing?.kind ?? "SapS4HanaOData",
    baseUrl: existing?.baseUrl ?? "",
    supplierEntitySet: existing?.supplierEntitySet ?? "API_BUSINESS_PARTNER/A_Supplier",
    materialEntitySet: existing?.materialEntitySet ?? "API_PRODUCT_SRV/A_Product",
    authMode: existing?.authMode ?? "Basic",
    username: existing?.username ?? "",
    secret: "",
    tokenUrl: existing?.tokenUrl ?? "",
    isActive: existing?.isActive ?? true,
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof ErpConnectionUpsert>(k: K, v: ErpConnectionUpsert[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await upsert.mutateAsync(form);
      toast.push("Connection saved");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="ERP connection" width="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="System type">
            <Select
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as ErpKind)}
            >
              {Object.entries(kindLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Base URL *" hint="e.g. https://my-s4.example.com/sap/opu/odata/sap">
          <Input value={form.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Supplier entity set" hint="OData path for suppliers">
            <Input
              value={form.supplierEntitySet ?? ""}
              onChange={(e) => set("supplierEntitySet", e.target.value)}
            />
          </Field>
          <Field label="Material entity set" hint="OData path for materials">
            <Input
              value={form.materialEntitySet ?? ""}
              onChange={(e) => set("materialEntitySet", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Auth mode">
            <Select
              value={form.authMode}
              onChange={(e) => set("authMode", e.target.value)}
            >
              <option value="Basic">Basic</option>
              <option value="OAuth2ClientCredentials">OAuth2 client credentials</option>
              <option value="ApiKey">API key</option>
            </Select>
          </Field>
          <Field
            label={form.authMode === "ApiKey" ? "Client ID (unused)" : "Username / Client ID"}
          >
            <Input
              value={form.username ?? ""}
              onChange={(e) => set("username", e.target.value)}
            />
          </Field>
        </div>

        {form.authMode === "OAuth2ClientCredentials" && (
          <Field label="Token URL" hint="OAuth2 token endpoint">
            <Input
              value={form.tokenUrl ?? ""}
              onChange={(e) => set("tokenUrl", e.target.value)}
            />
          </Field>
        )}

        <Field
          label="Secret / password"
          hint="Stored via the secret store, never shown again"
        >
          <Input
            type="password"
            value={form.secret ?? ""}
            onChange={(e) => set("secret", e.target.value)}
            placeholder={existing ? "Leave blank to keep current" : ""}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          Active
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={upsert.isPending}
            disabled={!form.name || !form.baseUrl}
          >
            Save connection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
