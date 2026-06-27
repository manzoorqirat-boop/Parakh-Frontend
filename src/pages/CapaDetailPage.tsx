import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileSignature, Plus } from "lucide-react";
import { useCapa, useCapaAction } from "@/lib/hooks";
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
  EmptyState,
  CapaStatusBadge,
  LifecycleRail,
  Badge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { apiError } from "@/lib/api";
import { fmtDate, humanize } from "@/lib/utils";
import type { CapaDetail, EffectivenessResult } from "@/types";

const CAPA_LIFECYCLE = ["Open", "InProgress", "PendingVerification", "Closed"];

export function CapaDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useCapa(id);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!data) return null;

  // Overdue is a parallel state; rail shows the underlying linear progress.
  const railCurrent = data.status === "Overdue" ? "InProgress" : data.status;

  return (
    <>
      <Link
        to="/capas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--pk-navy)]"
      >
        <ArrowLeft size={16} /> CAPAs
      </Link>

      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <h1 className="tabular text-xl font-bold text-[var(--pk-navy)]">
            {data.capaNo}
          </h1>
          <CapaStatusBadge status={data.status} />
          <Badge tone="muted">{humanize(data.actionType)}</Badge>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <LifecycleRail steps={CAPA_LIFECYCLE} current={railCurrent} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Action" />
            <CardBody className="space-y-4 text-sm">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Root cause</div>
                <p className="text-gray-800">{data.rootCause ?? "—"}</p>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">
                  Action description
                </div>
                <p className="text-gray-800">{data.actionDescription}</p>
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="text-xs font-medium text-gray-500">Due date</div>
                  <p className="text-gray-800">{fmtDate(data.dueDate)}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500">Completed</div>
                  <p className="text-gray-800">{fmtDate(data.completedOn)}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <EffectivenessCard capa={data} />
        </div>

        <div>
          <CapaActionsCard capa={data} />
        </div>
      </div>
    </>
  );
}

function CapaActionsCard({ capa }: { capa: CapaDetail }) {
  const action = useCapaAction(capa.id);
  const toast = useToast();
  const [showComplete, setShowComplete] = useState(false);

  async function run(path: string, body?: Record<string, unknown>, label?: string) {
    try {
      await action.mutateAsync({ path, body });
      toast.push(label ?? "Done");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  const effective = capa.effectivenessChecks.some((e) => e.result === "Effective");

  return (
    <Card>
      <CardHeader title="Actions" />
      <CardBody className="space-y-2">
        {capa.status === "Open" && (
          <Button
            className="w-full"
            loading={action.isPending}
            onClick={() => run("start", undefined, "CAPA started")}
          >
            Start work
          </Button>
        )}
        {(capa.status === "InProgress" || capa.status === "Overdue") && (
          <Button
            className="w-full"
            variant="teal"
            onClick={() => setShowComplete(true)}
          >
            Submit for verification
          </Button>
        )}
        {capa.status === "PendingVerification" && (
          <Button
            className="w-full"
            variant="gold"
            loading={action.isPending}
            disabled={!effective}
            onClick={() => run("request-closure", {}, "Closure requested via ERES")}
          >
            <FileSignature size={16} /> Request closure
          </Button>
        )}
        {capa.status === "PendingVerification" && !effective && (
          <p className="text-xs text-gray-400">
            Record an effectiveness check with result “Effective” before closure can
            be signed.
          </p>
        )}
        {capa.status === "Closed" && (
          <p className="text-sm text-gray-500">This CAPA is closed.</p>
        )}
      </CardBody>

      <CompleteModal
        open={showComplete}
        onClose={() => setShowComplete(false)}
        capaId={capa.id}
      />
    </Card>
  );
}

function CompleteModal({
  open,
  onClose,
  capaId,
}: {
  open: boolean;
  onClose: () => void;
  capaId: string;
}) {
  const action = useCapaAction(capaId);
  const toast = useToast();
  const [completedOn, setCompletedOn] = useState("");

  async function submit() {
    try {
      await action.mutateAsync({
        path: "submit-verification",
        body: { completedOn },
      });
      toast.push("Submitted for verification");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Submit for verification">
      <div className="space-y-4">
        <Field label="Completed on">
          <Input
            type="date"
            value={completedOn}
            onChange={(e) => setCompletedOn(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={action.isPending} disabled={!completedOn}>
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EffectivenessCard({ capa }: { capa: CapaDetail }) {
  const [showAdd, setShowAdd] = useState(false);
  const canAdd =
    capa.status === "PendingVerification" || capa.status === "InProgress";

  return (
    <Card>
      <CardHeader
        title="Effectiveness verification"
        subtitle={`${capa.effectivenessChecks.length} recorded`}
        action={
          canAdd ? (
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Record check
            </Button>
          ) : undefined
        }
      />
      <CardBody className={capa.effectivenessChecks.length ? "p-0" : ""}>
        {capa.effectivenessChecks.length === 0 ? (
          <EmptyState
            title="No checks recorded"
            message="Record an effectiveness check to justify closure."
          />
        ) : (
          <ul className="divide-y divide-[var(--pk-line)]">
            {capa.effectivenessChecks.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                <Badge
                  tone={
                    e.result === "Effective"
                      ? "ok"
                      : e.result === "NotEffective"
                        ? "danger"
                        : "muted"
                  }
                >
                  {humanize(e.result)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">
                    {e.verificationNotes ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {fmtDate(e.verificationDate)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <AddEffectivenessModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        capaId={capa.id}
      />
    </Card>
  );
}

function AddEffectivenessModal({
  open,
  onClose,
  capaId,
}: {
  open: boolean;
  onClose: () => void;
  capaId: string;
}) {
  const action = useCapaAction(capaId);
  const toast = useToast();
  const [date, setDate] = useState("");
  const [result, setResult] = useState<EffectivenessResult>("Effective");
  const [notes, setNotes] = useState("");

  async function submit() {
    try {
      await action.mutateAsync({
        path: "effectiveness",
        body: { date, result, notes },
      });
      toast.push("Effectiveness check recorded");
      onClose();
      setNotes("");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record effectiveness check">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Verification date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Result">
            <Select
              value={result}
              onChange={(e) => setResult(e.target.value as EffectivenessResult)}
            >
              <option value="Effective">Effective</option>
              <option value="NotEffective">Not effective</option>
              <option value="Pending">Pending</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={action.isPending} disabled={!date}>
            Record check
          </Button>
        </div>
      </div>
    </Modal>
  );
}