import { useState } from "react";
import { Plus, Copy } from "lucide-react";
import {
  useVendorRegistrations,
  useInitiateRegistration,
  useVendorForms,
  useVendorRegistration,
  useReviewRegistration,
} from "@/lib/hooks";
import { Button, Card, CardBody, CardHeader, Field, Input, Select } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import type { VendorRegistrationListItem } from "@/types";

function statusTone(s: string): "neutral" | "ok" | "warn" | "danger" | "info" | "muted" {
  switch (s) {
    case "Approved":
      return "ok";
    case "Submitted":
    case "UnderReview":
      return "info";
    case "Pending":
      return "warn";
    case "Rejected":
      return "danger";
    case "Expired":
      return "muted";
    default:
      return "neutral";
  }
}

function buildLink(token: string): string {
  return `${window.location.origin}/vendor-form/${token}`;
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toISOString().slice(0, 10);
}

export function VendorRegistrationsPage() {
  const { data, isLoading, error } = useVendorRegistrations();
  const [showNew, setShowNew] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const toast = useToast();

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(buildLink(token));
      toast.push("Secure link copied");
    } catch {
      toast.push("Copy failed — select and copy manually", "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Vendor registrations"
        subtitle="Send the registration form to vendors and track submissions"
        action={
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> New registration
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No registrations yet"
          message="Start a registration to generate a secure link to share with a vendor."
          action={
            <Button onClick={() => setShowNew(true)}>
              <Plus size={16} /> New registration
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Vendor</th>
                    <th className="px-5 py-3 font-medium">Form</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Submitted</th>
                    <th className="px-5 py-3 font-medium">Expires</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-5 py-3">
                        <div className="font-medium text-[var(--pk-navy)]">{r.vendorName || r.vendorEmail}</div>
                        {r.vendorName && <div className="text-xs text-gray-400">{r.vendorEmail}</div>}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{r.templateName || "—"}</td>
                      <td className="px-5 py-3">
                        <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{fmtDate(r.submittedAt)}</td>
                      <td className="px-5 py-3 text-gray-600">{fmtDate(r.expiryDate)}</td>
                      <td className="px-5 py-3 text-right">
                        {r.status === "Pending" && (
                          <Button size="sm" variant="outline" onClick={() => copyLink(r.token)}>
                            <Copy size={14} /> Copy link
                          </Button>
                        )}
                        {(r.status === "Submitted" || r.status === "UnderReview") && (
                          <Button size="sm" onClick={() => setReviewId(r.id)}>
                            Review
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <InitiateModal open={showNew} onClose={() => setShowNew(false)} />
      <ReviewModal regId={reviewId} onClose={() => setReviewId(null)} />
    </>
  );
}

function InitiateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const forms = useVendorForms();
  const initiate = useInitiateRegistration();
  const toast = useToast();
  const [templateId, setTemplateId] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [expiryDays, setExpiryDays] = useState("14");
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  function reset() {
    setTemplateId("");
    setVendorEmail("");
    setVendorName("");
    setExpiryDays("14");
    setCreatedLink(null);
  }

  async function submit() {
    if (!templateId || !vendorEmail.trim()) {
      toast.push("Form and vendor email are required", "error");
      return;
    }
    try {
      const res = await initiate.mutateAsync({
        templateId,
        vendorEmail: vendorEmail.trim(),
        vendorName: vendorName.trim() || undefined,
        expiryDays: Number(expiryDays) > 0 ? Number(expiryDays) : undefined,
      });
      setCreatedLink(buildLink(res.token));
      toast.push("Registration created");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  async function copy() {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      toast.push("Link copied");
    } catch {
      toast.push("Copy failed", "error");
    }
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="New vendor registration">
      {createdLink ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Share this secure link with the vendor. It expires on the date set and is single-purpose.
          </p>
          <div className="rounded-lg border border-[var(--pk-line)] bg-gray-50 p-3 text-xs break-all text-[var(--pk-navy)]">
            {createdLink}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={copy}>
              <Copy size={14} /> Copy link
            </Button>
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Registration form">
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select a form…</option>
              {forms.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (v{f.version})
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Vendor email">
              <Input type="email" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} />
            </Field>
            <Field label="Vendor name (optional)">
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            </Field>
          </div>
          <Field label="Link valid for (days)">
            <Input type="number" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} loading={initiate.isPending} disabled={!templateId || !vendorEmail.trim()}>
              Create &amp; get link
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ReviewModal({ regId, onClose }: { regId: string | null; onClose: () => void }) {
  const { data } = useVendorRegistration(regId ?? undefined);
  const review = useReviewRegistration();
  const toast = useToast();
  const [note, setNote] = useState("");

  let parsed: Record<string, string> = {};
  if (data?.submittedData) {
    try {
      parsed = JSON.parse(data.submittedData);
    } catch {
      parsed = {};
    }
  }

  function display(fieldType: string, raw: string): string {
    if (raw === undefined || raw === null || raw === "") return "—";
    if (fieldType === "boolean") return raw === "true" ? "Yes" : "No";
    return String(raw);
  }

  async function act(action: "approve" | "reject") {
    if (!data) return;
    if (action === "reject" && !note.trim()) {
      toast.push("A reason is required to reject", "error");
      return;
    }
    try {
      await review.mutateAsync({ id: data.id, action, note: note.trim() || undefined });
      toast.push(action === "approve" ? "Registration approved" : "Registration rejected");
      setNote("");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={!!regId} onClose={onClose} title="Review registration">
      {!data ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <div className="text-sm">
            <div className="font-medium text-[var(--pk-navy)]">{data.vendorName || data.vendorEmail}</div>
            <div className="text-xs text-gray-400">
              {data.vendorEmail} · <Badge tone="info">{data.status}</Badge>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--pk-line)]">
            <div className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Submitted answers
            </div>
            <div className="divide-y divide-gray-50">
              {data.fields.length === 0 ? (
                <div className="p-3 text-sm text-gray-400">No fields.</div>
              ) : (
                data.fields.map((f) => (
                  <div key={f.fieldKey} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm">
                    <div className="text-gray-500">{f.label}</div>
                    <div className="col-span-2 text-[var(--pk-navy)]">{display(f.fieldType, parsed[f.fieldKey])}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--pk-line)] p-3 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Signature</div>
            {data.signatureImage && data.signatureImage.startsWith("data:image") ? (
              <img src={data.signatureImage} alt="signature" className="h-20 rounded border border-gray-100 bg-white" />
            ) : (
              <div className="italic text-gray-600">{data.signerName || "—"}</div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Signed by {data.signerName || "—"}
              {data.signedAt ? ` on ${fmtDate(data.signedAt)}` : ""}
              {data.signerIp ? ` · IP ${data.signerIp}` : ""}
            </div>
          </div>

          {(data.status === "Submitted" || data.status === "UnderReview") && (
            <>
              <Field label="Review note (required to reject)">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button
                  variant="danger"
                  onClick={() => act("reject")}
                  loading={review.isPending}
                >
                  Reject
                </Button>
                <Button onClick={() => act("approve")} loading={review.isPending}>
                  Approve
                </Button>
              </div>
            </>
          )}
          {data.reviewNote && (
            <p className="text-xs text-gray-500">Review note: {data.reviewNote}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
