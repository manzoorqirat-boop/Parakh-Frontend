import { useMemo, useRef, useState, useEffect } from "react";
import {
  Plus,
  Upload,
  Download,
  DatabaseZap,
  FileSpreadsheet,
  Server,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  useMasterSchemas,
  useImportRuns,
  useImportRun,
  useMasterCreate,
  useMasterUpload,
  useErpPull,
  useCommitRun,
  downloadTemplate,
  useErpConnections,
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
import {
  Spinner,
  ErrorNote,
  EmptyState,
  Badge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { cn, humanize } from "@/lib/utils";
import type {
  EntitySchema,
  FieldDef,
  ImportRun,
  ImportRowState,
  MasterEntityType,
} from "@/types";
import { ErpConnectionsPanel } from "@/components/mdm/ErpConnectionsPanel";
import {
  useChecklists,
  useChecklist,
  useCreateChecklist,
  useUpdateChecklist,
  useChecklistAssignments,
  useSetChecklistAssignment,
  useStageCodes,
  useSetStageCode,
} from "@/lib/hooks";
import type { ChecklistItemRow, AuditCategory, MaterialCategory } from "@/types";

type Mode = "create" | "excel" | "erp";

export function MasterDataPage() {
  const { data: schemas, isLoading, error } = useMasterSchemas();
  const [activeType, setActiveType] = useState<MasterEntityType | null>(null);
  const [mode, setMode] = useState<Mode>("create");
  const [customTab, setCustomTab] = useState<"checklists" | "numbering" | null>(null);

  const schema = useMemo(
    () => schemas?.find((s) => s.entityType === (activeType ?? schemas[0]?.entityType)),
    [schemas, activeType]
  );

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!schemas || schemas.length === 0)
    return (
      <EmptyState
        title="No master entities configured"
        message="The backend schema registry returned no entities. Check the MDM service registration."
      />
    );

  const current = schema ?? schemas[0];

  return (
    <>
      <PageHeader
        title="Master data"
        subtitle="Create records, import from Excel, or sync from SAP / ERP — one validated, auditable pipeline"
      />

      {/* Entity switcher */}
      <div className="mb-6 flex flex-wrap gap-2">
        {schemas.map((s) => {
          const active = !customTab && s.entityType === current.entityType;
          return (
            <button
              key={s.entityType}
              onClick={() => {
                setActiveType(s.entityType);
                setCustomTab(null);
              }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--pk-navy)] bg-[var(--pk-navy)] text-white"
                  : "border-[var(--pk-line)] bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {s.label}
            </button>
          );
        })}
        {([
          { id: "checklists", label: "Checklists" },
          { id: "numbering", label: "Numbering" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setCustomTab(t.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              customTab === t.id
                ? "border-[var(--pk-navy)] bg-[var(--pk-navy)] text-white"
                : "border-[var(--pk-line)] bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {customTab === "checklists" ? (
        <ChecklistAdminPanel />
      ) : customTab === "numbering" ? (
        <NumberingAdminPanel />
      ) : (
        <>
          {/* Mode tabs */}
          <div className="mb-5 inline-flex rounded-lg border border-[var(--pk-line)] bg-white p-1">
            {(
              [
                { id: "create", label: "Create", icon: Plus },
                { id: "excel", label: "Excel upload", icon: FileSpreadsheet },
                { id: "erp", label: "ERP sync", icon: Server },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === t.id
                    ? "bg-[var(--pk-navy)] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <t.icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {mode === "create" && <CreatePanel schema={current} />}
              {mode === "excel" && <ExcelPanel schema={current} />}
              {mode === "erp" && <ErpPanel schema={current} />}
            </div>
            <div>
              <RecentRunsCard type={current.entityType} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
//  Create — schema-driven manual form
// ---------------------------------------------------------------------------
function CreatePanel({ schema }: { schema: EntitySchema }) {
  const create = useMasterCreate(schema.entityType);
  const toast = useToast();
  const [values, setValues] = useState<Record<string, unknown>>({});

  function set(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  const missingRequired = schema.fields.some(
    (f) => f.required && !values[f.key]
  );

  async function submit() {
    try {
      await create.mutateAsync(values);
      toast.push(`${schema.label.replace(/s$/, "")} created`);
      setValues({});
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Card>
      <CardHeader
        title={`New ${schema.label.replace(/s$/, "").toLowerCase()}`}
        subtitle="Fields marked with * are required"
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {schema.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key]}
              onChange={(v) => set(f.key, v)}
            />
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={submit}
            loading={create.isPending}
            disabled={missingRequired}
          >
            <Plus size={16} /> Create record
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = field.label + (field.required ? " *" : "");
  if (field.type === "select") {
    return (
      <Field label={label} hint={field.hint ?? undefined}>
        <Select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {humanize(o)}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (field.type === "bool") {
    return (
      <Field label={label} hint={field.hint ?? undefined}>
        <Select
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : e.target.value === "true")
          }
        >
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      </Field>
    );
  }
  return (
    <Field label={label} hint={field.hint ?? undefined}>
      <Input
        type={
          field.type === "number"
            ? "number"
            : field.type === "email"
            ? "email"
            : field.type === "date"
            ? "date"
            : "text"
        }
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
//  Excel — template download, file pick, client preview, upload→validate→commit
// ---------------------------------------------------------------------------
function ExcelPanel({ schema }: { schema: EntitySchema }) {
  const upload = useMasterUpload(schema.entityType);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ rows: number; cols: string[] } | null>(
    null
  );
  const [file, setFile] = useState<File | null>(null);
  const [run, setRun] = useState<ImportRun | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  async function onTemplate() {
    try {
      await downloadTemplate(schema.entityType, schema.label);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  async function onPick(f: File) {
    setFile(f);
    setRun(null);
    // Light client-side preview so the user sees row/column counts before upload.
    try {
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames.find((n) => n !== "_schema") ?? wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      const cols = json.length ? Object.keys(json[0]) : [];
      setPreview({ rows: json.length, cols });
    } catch {
      setPreview(null);
      toast.push("Could not read that file. Use the template format.", "error");
    }
  }

  async function onUpload() {
    if (!file) return;
    try {
      const r = await upload.mutateAsync(file);
      setRun(r);
      setReviewId(r.id);
      toast.push(`Validated ${r.validRows}/${r.totalRows} rows`);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Import from Excel"
          subtitle={`Bulk-load ${schema.label.toLowerCase()} with validation before anything is saved`}
          action={
            <Button variant="outline" size="sm" onClick={onTemplate}>
              <Download size={15} /> Template
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Download the template and fill in your rows.</li>
            <li>2. Upload it here — every row is validated server-side.</li>
            <li>3. Review the report, then commit valid rows to live data.</li>
          </ol>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />

          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-6 py-10 text-center hover:border-[var(--pk-teal)]"
          >
            <Upload size={24} className="mb-2 text-gray-400" />
            <p className="text-sm font-medium text-[var(--pk-navy)]">
              {file ? file.name : "Choose an .xlsx file"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {preview
                ? `${preview.rows} rows, ${preview.cols.length} columns detected`
                : "Generated from the template above"}
            </p>
          </div>

          {file && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setRun(null);
                }}
              >
                Clear
              </Button>
              <Button onClick={onUpload} loading={upload.isPending}>
                <FileSpreadsheet size={16} /> Upload &amp; validate
              </Button>
            </div>
          )}

          {run && <RunSummary run={run} onReview={() => setReviewId(run.id)} />}
        </CardBody>
      </Card>

      <ReviewModal
        runId={reviewId}
        onClose={() => setReviewId(null)}
        schema={schema}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
//  ERP — pick a connection, pull a page, validate, commit
// ---------------------------------------------------------------------------
function ErpPanel({ schema }: { schema: EntitySchema }) {
  const { data: connections, isLoading } = useErpConnections();
  const pull = useErpPull(schema.entityType);
  const toast = useToast();
  const [connId, setConnId] = useState<string>("");
  const [top, setTop] = useState(200);
  const [filter, setFilter] = useState("");
  const [run, setRun] = useState<ImportRun | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const supported =
    schema.entityType === "SupplierParent" ||
    schema.entityType === "SupplierSite" ||
    schema.entityType === "Material";

  async function onPull() {
    if (!connId) return;
    try {
      const r = await pull.mutateAsync({
        connectionId: connId,
        top,
        filter: filter || undefined,
      });
      setRun(r);
      setReviewId(r.id);
      toast.push(`Pulled and validated ${r.validRows}/${r.totalRows} records`);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Sync from SAP / ERP"
            subtitle="Pull master records live over OData, validate, then commit"
          />
          <CardBody className="space-y-4">
            {!supported ? (
              <EmptyState
                title="ERP sync not mapped for this entity"
                message={`${schema.label} is managed via Create or Excel. ERP sync currently covers Suppliers, Sites, and Materials.`}
              />
            ) : isLoading ? (
              <Spinner />
            ) : !connections || connections.length === 0 ? (
              <EmptyState
                title="No ERP connection yet"
                message="Add a SAP or ERP connection below, test it, then pull master data."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <Field label="Connection">
                      <Select
                        value={connId}
                        onChange={(e) => setConnId(e.target.value)}
                      >
                        <option value="">Select a connection…</option>
                        {connections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.isActive ? "" : " (inactive)"}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Field label="Max records" hint="Preview page size">
                    <Input
                      type="number"
                      value={top}
                      min={1}
                      max={1000}
                      onChange={(e) => setTop(Number(e.target.value))}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="OData filter" hint="Optional $filter expression">
                      <Input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="e.g. Country eq 'IN'"
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={onPull} loading={pull.isPending} disabled={!connId}>
                    <DatabaseZap size={16} /> Pull &amp; validate
                  </Button>
                </div>
              </>
            )}

            {run && <RunSummary run={run} onReview={() => setReviewId(run.id)} />}
          </CardBody>
        </Card>

        <ErpConnectionsPanel />
      </div>

      <ReviewModal
        runId={reviewId}
        onClose={() => setReviewId(null)}
        schema={schema}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
//  Shared: run summary, recent runs, review modal
// ---------------------------------------------------------------------------
function RunSummary({
  run,
  onReview,
}: {
  run: ImportRun;
  onReview: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--pk-line)] bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={run.invalidRows === 0 ? "ok" : "warn"}>
          {run.validRows}/{run.totalRows} valid
        </Badge>
        {run.invalidRows > 0 && (
          <Badge tone="danger">{run.invalidRows} with errors</Badge>
        )}
        {run.status === "Committed" && (
          <Badge tone="info">
            {run.createdCount} created · {run.updatedCount} updated
          </Badge>
        )}
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={onReview}>
            Review &amp; commit
          </Button>
        </div>
      </div>
      {run.notes && <p className="mt-2 text-xs text-gray-500">{run.notes}</p>}
    </div>
  );
}

function RecentRunsCard({ type }: { type: MasterEntityType }) {
  const { data, isLoading } = useImportRuns(type);
  const [reviewId, setReviewId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader title="Recent imports" subtitle="Last 30 runs for this entity" />
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner />
          ) : !data || data.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No imports yet"
                message="Manual, Excel, and ERP loads will be listed here with their outcome."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--pk-line)]">
              {data.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setReviewId(r.id)}
                  >
                    <div className="flex items-center gap-2">
                      <SourceBadge source={r.source} />
                      <RunStatusBadge status={r.status} />
                    </div>
                    <div className="mt-1 truncate text-xs text-gray-500">
                      {r.sourceLabel ?? "—"} ·{" "}
                      {new Date(r.createdUtc).toLocaleString()}
                    </div>
                  </button>
                  <div className="shrink-0 text-right text-xs text-gray-500">
                    <div className="tabular font-semibold text-[var(--pk-navy)]">
                      {r.totalRows}
                    </div>
                    rows
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      <ReviewModal runId={reviewId} onClose={() => setReviewId(null)} />
    </>
  );
}

function ReviewModal({
  runId,
  onClose,
  schema,
}: {
  runId: string | null;
  onClose: () => void;
  schema?: EntitySchema;
}) {
  const { data, isLoading } = useImportRun(runId ?? undefined);
  const commit = useCommitRun();
  const toast = useToast();
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [allowUpdates, setAllowUpdates] = useState(true);

  if (!runId) return null;

  const run = data?.run;
  const rows = data?.rows ?? [];
  const cols = schema?.fields.map((f) => f.key) ?? (rows[0] ? Object.keys(rows[0].payload) : []);
  const committed = run?.status === "Committed";

  async function onCommit() {
    if (!runId) return;
    try {
      const r = await commit.mutateAsync({ id: runId, skipInvalid, allowUpdates });
      toast.push(`Committed: ${r.createdCount} created, ${r.updatedCount} updated`);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={!!runId} onClose={onClose} title="Import review" width="max-w-4xl">
      {isLoading || !run ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={run.source} />
            <RunStatusBadge status={run.status} />
            <Badge tone={run.invalidRows === 0 ? "ok" : "warn"}>
              {run.validRows}/{run.totalRows} valid
            </Badge>
            {committed && (
              <Badge tone="info">
                {run.createdCount} created · {run.updatedCount} updated ·{" "}
                {run.skippedCount} skipped
              </Badge>
            )}
          </div>

          <div className="max-h-[50vh] overflow-auto rounded-lg border border-[var(--pk-line)]">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  {cols.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      row.state === "Invalid" && "bg-red-50/40"
                    )}
                  >
                    <td className="px-3 py-2 tabular text-gray-400">
                      {row.rowNumber}
                    </td>
                    <td className="px-3 py-2">
                      <RowStateBadge state={row.state} />
                      {row.errors.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {row.errors.map((e, i) => (
                            <div key={i} className="text-[11px] text-red-600">
                              {e.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    {cols.map((c) => (
                      <td key={c} className="px-3 py-2 text-gray-700">
                        {formatCell(row.payload[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!committed && (
            <>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                  />
                  Skip invalid rows
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowUpdates}
                    onChange={(e) => setAllowUpdates(e.target.checked)}
                  />
                  Update existing records (upsert)
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button
                  onClick={onCommit}
                  loading={commit.isPending}
                  disabled={run.validRows === 0 && skipInvalid}
                >
                  <CheckCircle2 size={16} /> Commit to live data
                </Button>
              </div>
            </>
          )}
          {committed && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---- small presentational helpers ----
function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function SourceBadge({ source }: { source: ImportRun["source"] }) {
  const map: Record<ImportRun["source"], { tone: Parameters<typeof Badge>[0]["tone"]; label: string }> = {
    Manual: { tone: "muted", label: "Manual" },
    Excel: { tone: "info", label: "Excel" },
    SapOData: { tone: "ok", label: "SAP" },
    ErpRest: { tone: "ok", label: "ERP" },
  };
  const m = map[source];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function RunStatusBadge({ status }: { status: ImportRun["status"] }) {
  const map: Record<ImportRun["status"], Parameters<typeof Badge>[0]["tone"]> = {
    Draft: "muted",
    Validated: "warn",
    Committed: "ok",
    Failed: "danger",
    Cancelled: "muted",
  };
  return <Badge tone={map[status]}>{status}</Badge>;
}

function RowStateBadge({ state }: { state: ImportRowState }) {
  const icon =
    state === "Invalid" ? (
      <XCircle size={13} className="text-red-600" />
    ) : state === "Created" || state === "Updated" || state === "Valid" ? (
      <CheckCircle2 size={13} className="text-green-600" />
    ) : state === "Skipped" ? (
      <AlertCircle size={13} className="text-gray-400" />
    ) : (
      <Loader2 size={13} className="text-gray-400" />
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600">
      {icon}
      {state}
    </span>
  );
}

// ---------------------------------------------------------------------------
//  Checklists — template authoring (create/edit items, version, assign by type)
// ---------------------------------------------------------------------------

const AUDIT_CATEGORIES: { value: AuditCategory; label: string }[] = [
  { value: "FirstTime", label: "First time" },
  { value: "Periodic", label: "Periodic" },
  { value: "FollowUp", label: "Follow-up" },
  { value: "ForCause", label: "For cause" },
  { value: "Desk", label: "Desk audit" },
];

function ChecklistAdminPanel() {
  const { data: list } = useChecklists();
  const [editId, setEditId] = useState<string | "new" | null>(null);

  if (editId) {
    return <ChecklistEditor editId={editId} onClose={() => setEditId(null)} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader
            title="Checklist templates"
            subtitle="Author the questionnaire used during audits"
            action={
              <Button onClick={() => setEditId("new")}>
                <Plus size={16} /> New template
              </Button>
            }
          />
          <CardBody className="p-0">
            {!list || list.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No templates yet. Create one, then assign it to an audit category below.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Standard</th>
                    <th className="px-5 py-3 font-medium">Version</th>
                    <th className="px-5 py-3 font-medium">Items</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-5 py-3 font-medium text-[var(--pk-navy)]">{c.name}</td>
                      <td className="px-5 py-3 text-gray-500">{c.standard || "—"}</td>
                      <td className="px-5 py-3 text-gray-500">v{c.version}</td>
                      <td className="px-5 py-3 text-gray-500">{c.itemCount}</td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditId(c.id)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
      <div>
        <AssignmentsCard />
      </div>
    </div>
  );
}

function AssignmentsCard() {
  const { data: list } = useChecklists();
  const { data: assignments } = useChecklistAssignments();
  const setAssign = useSetChecklistAssignment();
  const toast = useToast();

  function current(cat: AuditCategory): string {
    return assignments?.find((a) => a.category === cat)?.checklistId ?? "";
  }

  async function change(cat: AuditCategory, checklistId: string) {
    if (!checklistId) return;
    try {
      await setAssign.mutateAsync({ category: cat, checklistId });
      toast.push("Default checklist set");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Card>
      <CardHeader title="Default by audit type" subtitle="Auto-attached when an audit is created" />
      <CardBody className="space-y-3">
        {AUDIT_CATEGORIES.map((c) => (
          <Field key={c.value} label={c.label}>
            <Select value={current(c.value)} onChange={(e) => change(c.value, e.target.value)}>
              <option value="">— none —</option>
              {list?.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name} (v{cl.version})
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </CardBody>
    </Card>
  );
}

function ChecklistEditor({ editId, onClose }: { editId: string | "new"; onClose: () => void }) {
  const isNew = editId === "new";
  const { data: detail } = useChecklist(isNew ? undefined : editId);
  const create = useCreateChecklist();
  const update = useUpdateChecklist();
  const toast = useToast();

  const [name, setName] = useState("");
  const [standard, setStandard] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ChecklistItemRow[]>([]);

  useEffect(() => {
    if (detail && !isNew) {
      setName(detail.name);
      setStandard(detail.standard ?? "");
      setDescription(detail.description ?? "");
      setItems(detail.items.map((i) => ({ ...i })));
    }
  }, [detail, isNew]);

  function addRow() {
    setItems((rows) => [...rows, { question: "", section: "", refClause: "", isCritical: false }]);
  }
  function removeRow(idx: number) {
    setItems((rows) => rows.filter((_, i) => i !== idx));
  }
  function setRow(idx: number, patch: Partial<ChecklistItemRow>) {
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function save() {
    const body = {
      name: name.trim(),
      standard: standard.trim() || undefined,
      description: description.trim() || undefined,
      items: items
        .filter((i) => i.question.trim())
        .map((i) => ({
          question: i.question.trim(),
          section: i.section?.trim() || undefined,
          refClause: i.refClause?.trim() || undefined,
          isCritical: i.isCritical,
        })),
    };
    if (!body.name) {
      toast.push("Name is required", "error");
      return;
    }
    try {
      if (isNew) {
        await create.mutateAsync(body);
        toast.push("Template created");
      } else {
        const res = await update.mutateAsync({ id: editId, ...body });
        toast.push(res?.forked ? `Saved as new version v${res.version}` : "Template updated");
      }
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  // Group rows by section header as the user types (display aid only).
  return (
    <Card>
      <CardHeader
        title={isNew ? "New checklist template" : `Edit: ${detail?.name ?? ""}`}
        subtitle="Add sections and items. A version already used by an audit forks a new version on save."
        action={
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
        }
      />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Template name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. General Vendor Audit Checklist" />
          </Field>
          <Field label="Standard / reference">
            <Input value={standard} onChange={(e) => setStandard(e.target.value)} placeholder="e.g. ICH Q7" />
          </Field>
        </div>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="rounded-lg border border-[var(--pk-line)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <span className="text-sm font-medium text-[var(--pk-navy)]">Items ({items.length})</span>
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus size={14} /> Add item
            </Button>
          </div>
          {items.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">No items yet — add rows and fill in your content.</div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto">
              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 border-b border-gray-50 p-2">
                  <div className="col-span-3">
                    <Input
                      value={row.section ?? ""}
                      placeholder="Section"
                      onChange={(e) => setRow(idx, { section: e.target.value })}
                    />
                  </div>
                  <div className="col-span-6">
                    <Input
                      value={row.question}
                      placeholder="Item / question"
                      onChange={(e) => setRow(idx, { question: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={row.isCritical}
                        onChange={(e) => setRow(idx, { isCritical: e.target.checked })}
                      />
                      Critical
                    </label>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-gray-400 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending} disabled={!name.trim()}>
            {isNew ? "Create template" : "Save"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
//  Numbering — configurable material-category -> stage code map
// ---------------------------------------------------------------------------

const MATERIAL_CATEGORIES: { value: MaterialCategory; label: string; fallback: string }[] = [
  { value: "Api", label: "API", fallback: "API" },
  { value: "Ksm", label: "KSM", fallback: "KSM" },
  { value: "Intermediate", label: "Intermediate", fallback: "INT" },
  { value: "Excipient", label: "Excipient", fallback: "EX" },
  { value: "PrimaryPackaging", label: "Primary packaging", fallback: "PPM" },
  { value: "PrintedPackaging", label: "Printed packaging", fallback: "PPM" },
  { value: "DrugProduct", label: "Drug product", fallback: "DP" },
  { value: "Other", label: "Other", fallback: "RM" },
];

function NumberingAdminPanel() {
  const { data } = useStageCodes();
  const setCode = useSetStageCode();
  const toast = useToast();
  // Local edits keyed by material category.
  const [draft, setDraft] = useState<Record<string, string>>({});

  function configured(cat: MaterialCategory): string {
    return data?.rules.find((r) => r.materialCategory === cat)?.stageCode ?? "";
  }
  function value(cat: MaterialCategory): string {
    return draft[cat] ?? configured(cat);
  }

  async function save(cat: MaterialCategory) {
    try {
      await setCode.mutateAsync({ materialCategory: cat, stageCode: value(cat) });
      toast.push("Stage code saved");
      setDraft((d) => {
        const next = { ...d };
        delete next[cat];
        return next;
      });
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader
            title="Audit number — stage codes"
            subtitle="The STAGE token per material category. Blank uses the built-in default."
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Material category</th>
                  <th className="px-5 py-3 font-medium">Stage code</th>
                  <th className="px-5 py-3 font-medium">Default</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {MATERIAL_CATEGORIES.map((m) => {
                  const dirty = draft[m.value] !== undefined && draft[m.value] !== configured(m.value);
                  return (
                    <tr key={m.value} className="border-t border-gray-100">
                      <td className="px-5 py-3 font-medium text-[var(--pk-navy)]">{m.label}</td>
                      <td className="px-5 py-3">
                        <Input
                          value={value(m.value)}
                          placeholder={m.fallback}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [m.value]: e.target.value.toUpperCase() }))
                          }
                        />
                      </td>
                      <td className="px-5 py-3 text-gray-400">{m.fallback}</td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" variant="outline" disabled={!dirty} onClick={() => save(m.value)}>
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader title="Number format" />
          <CardBody className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-400">Format</div>
              <code className="text-[var(--pk-navy)]">{data?.format ?? "{prefix}/{VAUDIT|VDAUDIT}/{stage}/{yy}/{seq}"}</code>
            </div>
            <div>
              <div className="text-xs text-gray-400">Prefix</div>
              <div className="font-medium text-[var(--pk-navy)]">{data?.prefix ?? "CQC"}</div>
            </div>
            <p className="text-xs text-gray-500">
              VAUDIT = on-site, VDAUDIT = desk audit. Sequence is allocated per type.
              Example: {(data?.prefix ?? "CQC")}/VAUDIT/API/26/001
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
