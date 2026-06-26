import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useScar, useScarAction } from "@/lib/hooks";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  Badge,
  SeverityBadge,
} from "@/components/ui/status";
import { useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { RootCauseMethod } from "@/types";

// The ordered stages of the SCAR lifecycle, for the progress rail.
const STAGES = [
  "Draft",
  "Issued",
  "SupplierResponding",
  "ContainmentSubmitted",
  "RootCauseSubmitted",
  "ActionPlanSubmitted",
  "UnderReview",
  "EffectivenessPending",
  "Closed",
];

export function ScarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useScar(id);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!data || !id) return <ErrorNote message="SCAR not found." />;

  const { scar, stateCode } = data;
  const stageIdx = STAGES.indexOf(stateCode ?? "");

  return (
    <>
      <Link
        to="/scars"
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--pk-navy)]"
      >
        <ArrowLeft size={14} /> Back to SCARs
      </Link>

      <PageHeader
        title={scar.title}
        subtitle={`${scar.recordNumber ?? ""} · ${scar.sourceType}`}
      />

      {/* Progress rail */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={
                "rounded-md px-2 py-0.5 text-xs font-medium " +
                (i < stageIdx
                  ? "bg-green-50 text-green-700"
                  : i === stageIdx
                  ? "bg-[var(--pk-navy)] text-white"
                  : "bg-gray-100 text-gray-400")
              }
            >
              {s}
            </span>
            {i < STAGES.length - 1 && (
              <span className="text-gray-300">›</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader title="Request details" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Detail label="Severity">
                <SeverityBadge value={scar.severity} />
              </Detail>
              <Detail label="Priority">{scar.priority}</Detail>
              <Detail label="Issued">{fmtDate(scar.issuedDate)}</Detail>
              <Detail label="Response due">
                {fmtDate(scar.responseDueDate)}
              </Detail>
              <Detail label="Effectiveness">{scar.effectivenessResult}</Detail>
              <Detail label="Escalation cycles">{scar.escalationCount}</Detail>
              <div className="col-span-2">
                <dt className="text-xs text-gray-400">Problem statement</dt>
                <dd className="whitespace-pre-wrap text-[var(--pk-navy)]">
                  {scar.description}
                </dd>
              </div>
              {scar.containmentAction && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400">Containment</dt>
                  <dd className="whitespace-pre-wrap text-[var(--pk-navy)]">
                    {scar.containmentAction}
                  </dd>
                </div>
              )}
              {scar.rootCause && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400">
                    Root cause{" "}
                    {scar.rootCauseMethod && (
                      <span className="text-gray-300">
                        ({scar.rootCauseMethod})
                      </span>
                    )}
                  </dt>
                  <dd className="whitespace-pre-wrap text-[var(--pk-navy)]">
                    {scar.rootCause}
                  </dd>
                </div>
              )}
              {scar.correctiveAction && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400">Corrective action</dt>
                  <dd className="whitespace-pre-wrap text-[var(--pk-navy)]">
                    {scar.correctiveAction}
                  </dd>
                </div>
              )}
              {scar.preventiveAction && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400">Preventive action</dt>
                  <dd className="whitespace-pre-wrap text-[var(--pk-navy)]">
                    {scar.preventiveAction}
                  </dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Next action" />
          <CardBody>
            <div className="mb-3">
              <div className="text-xs text-gray-400">Current state</div>
              <div className="mt-1">
                <Badge tone="info" className="text-sm">
                  {stateCode ?? "—"}
                </Badge>
              </div>
            </div>
            <ActionPanel scarId={id} stateCode={stateCode ?? ""} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-[var(--pk-navy)]">{children}</dd>
    </div>
  );
}

// State-aware panel: shows the form for the action available from this state.
// Each action posts to the SCAR service endpoint that carries the business
// side effects (license provisioning, SLA, escalation), not the raw workflow.
function ActionPanel({
  scarId,
  stateCode,
}: {
  scarId: string;
  stateCode: string;
}) {
  const act = useScarAction(scarId);
  const toast = useToast();

  // Local form state shared across the small forms.
  const [contact, setContact] = useState({ name: "", email: "" });
  const [text, setText] = useState("");
  const [text2, setText2] = useState("");
  const [rcm, setRcm] = useState<RootCauseMethod>("FiveWhys");

  async function run(path: string, body?: Record<string, unknown>) {
    try {
      await act.mutateAsync({ path, body });
      toast.push("Done");
      setText("");
      setText2("");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  switch (stateCode) {
    case "Draft":
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Issuing provisions a temporary external seat from the license pool,
            scoped to this SCAR, and sets the response SLA by severity.
          </p>
          <Field label="Supplier contact name">
            <Input
              value={contact.name}
              onChange={(e) =>
                setContact({ ...contact, name: e.target.value })
              }
            />
          </Field>
          <Field label="Supplier contact email">
            <Input
              value={contact.email}
              onChange={(e) =>
                setContact({ ...contact, email: e.target.value })
              }
            />
          </Field>
          <Button
            className="w-full"
            loading={act.isPending}
            disabled={!contact.name || !contact.email}
            onClick={() =>
              run("issue", {
                contactName: contact.name,
                contactEmail: contact.email,
              })
            }
          >
            Issue to supplier
          </Button>
        </div>
      );

    case "Issued":
      return (
        <Button
          className="w-full"
          loading={act.isPending}
          onClick={() => run("acknowledge")}
        >
          Supplier acknowledges
        </Button>
      );

    case "SupplierResponding":
      return (
        <div className="space-y-3">
          <Field label="Interim containment">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <Button
            className="w-full"
            loading={act.isPending}
            disabled={!text}
            onClick={() => run("containment", { containment: text })}
          >
            Submit containment
          </Button>
        </div>
      );

    case "ContainmentSubmitted":
      return (
        <div className="space-y-3">
          <Field label="Root cause method">
            <Select
              value={rcm}
              onChange={(e) => setRcm(e.target.value as RootCauseMethod)}
            >
              <option value="FiveWhys">5 Whys</option>
              <option value="Fishbone">Fishbone</option>
              <option value="FaultTree">Fault tree</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Root cause analysis">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <Button
            className="w-full"
            loading={act.isPending}
            disabled={!text}
            onClick={() => run("root-cause", { rootCause: text, method: rcm })}
          >
            Submit root cause
          </Button>
        </div>
      );

    case "RootCauseSubmitted":
      return (
        <div className="space-y-3">
          <Field label="Corrective action">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <Field label="Preventive action">
            <Textarea
              value={text2}
              onChange={(e) => setText2(e.target.value)}
            />
          </Field>
          <Button
            className="w-full"
            loading={act.isPending}
            disabled={!text}
            onClick={() =>
              run("action-plan", { corrective: text, preventive: text2 || null })
            }
          >
            Submit action plan
          </Button>
        </div>
      );

    case "ActionPlanSubmitted":
      return (
        <Button
          className="w-full"
          loading={act.isPending}
          onClick={() => run("submit-review")}
        >
          Submit for buyer review
        </Button>
      );

    case "UnderReview":
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Buyer QA review decision.</p>
          <Button
            className="w-full"
            loading={act.isPending}
            onClick={() =>
              run("review", { decision: "Accepted", effectivenessDue: null })
            }
          >
            Accept
          </Button>
          <Button
            variant="outline"
            className="w-full"
            loading={act.isPending}
            onClick={() =>
              run("review", { decision: "Rejected", effectivenessDue: null })
            }
          >
            Reject / request more info
          </Button>
        </div>
      );

    case "EffectivenessPending":
      return (
        <div className="space-y-2">
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-600/20">
            Verifying effectiveness closes the SCAR (e-signature gated) and
            returns the external license to the pool.
          </div>
          <Button
            className="w-full"
            loading={act.isPending}
            onClick={() =>
              run("effectiveness", { result: "Effective", esignatureId: null })
            }
          >
            Effective — verify &amp; close
          </Button>
          <Button
            variant="outline"
            className="w-full"
            loading={act.isPending}
            onClick={() =>
              run("effectiveness", {
                result: "NotEffective",
                esignatureId: null,
              })
            }
          >
            Not effective — escalate
          </Button>
        </div>
      );

    case "Escalated":
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Two ineffective cycles re-tier the supplier and move the site to
            probation automatically.
          </p>
          <Button
            className="w-full"
            loading={act.isPending}
            onClick={() => run("new-cycle")}
          >
            Start new response cycle
          </Button>
        </div>
      );

    case "Closed":
      return (
        <p className="text-sm text-gray-400">
          This SCAR is closed. The record is locked and the external license has
          been returned to the pool.
        </p>
      );

    default:
      return (
        <p className="text-sm text-gray-400">No action available.</p>
      );
  }
}
