import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, AlertTriangle } from "lucide-react";
import {
  useScars,
  useCreateScar,
  useSupplierSites,
} from "@/lib/hooks";
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  EmptyState,
  Badge,
  SeverityBadge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate, daysUntil } from "@/lib/utils";
import type { Severity, ScarSourceType } from "@/types";

const SOURCE_TYPES: ScarSourceType[] = [
  "Sncr",
  "AuditFinding",
  "Complaint",
  "ScorecardTrigger",
  "Change",
  "Manual",
];
const SEVERITIES: Severity[] = ["Critical", "Major", "Minor"];

export function ScarsPage() {
  const { data, isLoading, error } = useScars();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader
        title="SCARs"
        subtitle="Supplier corrective action requests — the closed loop from event to verified effectiveness"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New SCAR
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No SCARs yet"
          message="SCARs are raised from nonconformances, audit findings, or scorecard breaches."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">SCAR no.</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Supplier site</th>
                  <th className="px-5 py-3 font-medium">Severity</th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">Response due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((s) => {
                  const dleft = daysUntil(s.responseDueDate);
                  const overdue =
                    dleft !== null &&
                    dleft < 0 &&
                    s.effectivenessResult !== "Effective";
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3">
                        <Link
                          to={`/scars/${s.id}`}
                          className="font-medium text-[var(--pk-navy)] hover:underline"
                        >
                          {s.recordNumber ?? s.id.slice(0, 8)}
                        </Link>
                        {s.recurrenceFlag && (
                          <Badge tone="danger" className="ml-2">
                            recurrence
                          </Badge>
                        )}
                        {s.escalationCount > 0 && (
                          <Badge tone="warn" className="ml-2">
                            esc ×{s.escalationCount}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{s.title}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {s.siteName ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <SeverityBadge value={s.severity} />
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="info">{s.stateCode ?? "—"}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            overdue ? "font-medium text-red-600" : "text-gray-600"
                          }
                        >
                          {overdue && (
                            <AlertTriangle
                              size={12}
                              className="mr-1 inline align-text-top"
                            />
                          )}
                          {fmtDate(s.responseDueDate)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </CardBody>
        </Card>
      )}

      {showCreate && <CreateScarModal onClose={() => setShowCreate(false)} />}
    </>
  );
}

function CreateScarModal({ onClose }: { onClose: () => void }) {
  const create = useCreateScar();
  const toast = useToast();
  const { data: sites } = useSupplierSites();
  const [form, setForm] = useState({
    supplierSiteId: "",
    sourceType: "Manual" as ScarSourceType,
    title: "",
    description: "",
    severity: "Major" as Severity,
    priority: "Medium",
  });

  async function submit() {
    try {
      await create.mutateAsync({ ...form, sourceRefId: null });
      toast.push("SCAR created");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  const valid = form.supplierSiteId && form.title && form.description;

  return (
    <Modal open onClose={onClose} title="New SCAR">
      <div className="space-y-4">
        <Field label="Supplier site" hint="Required">
          <Select
            value={form.supplierSiteId}
            onChange={(e) =>
              setForm({ ...form, supplierSiteId: e.target.value })
            }
          >
            <option value="">Select a site…</option>
            {(sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.siteName}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Source">
            <Select
              value={form.sourceType}
              onChange={(e) =>
                setForm({ ...form, sourceType: e.target.value as ScarSourceType })
              }
            >
              {SOURCE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severity" hint="Drives the response SLA">
            <Select
              value={form.severity}
              onChange={(e) =>
                setForm({ ...form, severity: e.target.value as Severity })
              }
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Title" hint="Required">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Problem statement" hint="Required">
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!valid}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}