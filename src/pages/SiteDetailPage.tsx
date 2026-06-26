import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSupplierSite, useTransition } from "@/lib/hooks";
import { Button, Card, CardBody, CardHeader, Field, Textarea } from "@/components/ui/primitives";
import { Spinner, ErrorNote, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { AvailableTransition } from "@/types";

export function SiteDetailPage() {
  const { parentId, siteId } = useParams<{ parentId: string; siteId: string }>();
  const { data, isLoading, error } = useSupplierSite(siteId);
  const [active, setActive] = useState<AvailableTransition | null>(null);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!data) return <ErrorNote message="Site not found." />;

  const { site, stateCode, transitions } = data;

  return (
    <>
      <Link
        to={`/suppliers/${parentId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--pk-navy)]"
      >
        <ArrowLeft size={14} /> Back to supplier
      </Link>

      <PageHeader
        title={site.siteName}
        subtitle={`${site.recordNumber ?? ""} · ${site.siteType}`}
      />

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader title="Site details" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Detail label="GMP status" value={site.gmpStatus} />
              <Detail label="Risk tier" value={site.riskTier} />
              <Detail label="Qualified" value={fmtDate(site.qualifiedDate)} />
              <Detail label="Requalification due" value={fmtDate(site.requalificationDue)} />
              <div className="col-span-2">
                <dt className="text-xs text-gray-400">Address</dt>
                <dd className="text-[var(--pk-navy)] whitespace-pre-wrap">
                  {site.address || "—"}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Qualification lifecycle" />
          <CardBody>
            <div className="mb-3">
              <div className="text-xs text-gray-400">Current state</div>
              <div className="mt-1">
                {stateCode ? (
                  <Badge tone="info" className="text-sm">
                    {stateCode}
                  </Badge>
                ) : (
                  <span className="text-gray-400">No workflow state</span>
                )}
              </div>
            </div>

            {transitions.length === 0 ? (
              <p className="text-sm text-gray-400">
                No actions available from this state.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-400">Available actions</div>
                {transitions.map((t) => (
                  <Button
                    key={t.transitionId}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActive(t)}
                  >
                    {t.label ?? t.trigger}
                    {t.requiresEsignature && (
                      <Badge tone="warn" className="ml-auto text-xs">
                        e-sig
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {siteId && active && (
        <TransitionModal
          siteId={siteId}
          transition={active}
          onClose={() => setActive(null)}
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

function TransitionModal({
  siteId,
  transition,
  onClose,
}: {
  siteId: string;
  transition: AvailableTransition;
  onClose: () => void;
}) {
  const move = useTransition("supplier_site", siteId);
  const toast = useToast();
  const [reason, setReason] = useState("");

  async function confirm() {
    try {
      await move.mutateAsync({
        trigger: transition.trigger,
        reason: reason || null,
        // e-signature integration is wired in a later phase; the gate is enforced
        // server-side, so transitions requiring it will report that requirement.
        esignatureId: null,
      });
      toast.push(`Moved to ${transition.toStateCode}`);
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open onClose={onClose} title={transition.label ?? transition.trigger}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Move this site to{" "}
          <span className="font-medium text-[var(--pk-navy)]">
            {transition.toStateCode}
          </span>
          .
        </p>

        {transition.requiresEsignature && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-600/20">
            This transition requires an electronic signature. E-signature capture
            is added in a later phase; the action may be rejected until then.
          </div>
        )}

        {transition.requiresReason && (
          <Field label="Reason for change" hint="Required">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            loading={move.isPending}
            disabled={transition.requiresReason && !reason}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
