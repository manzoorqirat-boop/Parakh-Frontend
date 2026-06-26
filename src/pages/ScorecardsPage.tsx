import { useState } from "react";
import { Calculator, Users } from "lucide-react";
import {
  useScorecards,
  useComputeScorecard,
  useSupplierSites,
  useExternalPool,
} from "@/lib/hooks";
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  EmptyState,
  BandBadge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";

// Default the period control to the current calendar quarter.
function currentQuarter(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

export function ScorecardsPage() {
  const { data, isLoading, error } = useScorecards();
  const pool = useExternalPool();
  const [showCompute, setShowCompute] = useState(false);

  return (
    <>
      <PageHeader
        title="Supplier scorecards"
        subtitle="Live, weighted KPI performance with automated escalation into the supplier lifecycle"
        action={
          <Button onClick={() => setShowCompute(true)}>
            <Calculator size={16} /> Compute scorecard
          </Button>
        }
      />

      {/* External license pool telemetry — the collaboration layer at a glance. */}
      {pool.data && (
        <Card className="mb-5">
          <CardBody className="flex items-center gap-6 py-4">
            <Users size={18} className="text-[var(--pk-navy)]" />
            <Stat label="Active seats" value={pool.data.active} />
            <Stat label="Provisioned" value={pool.data.provisioned} />
            <Stat label="Returned" value={pool.data.inactive} />
            <Stat label="Total" value={pool.data.total} />
            <span className="ml-auto text-xs text-gray-400">
              External license pool
            </span>
          </CardBody>
        </Card>
      )}

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No scorecards computed yet"
          message="Compute a scorecard for a supplier site to band its performance and trigger any escalation rules."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pk-line)] text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Supplier site</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Band</th>
                  <th className="px-5 py-3 font-medium">Trend</th>
                  <th className="px-5 py-3 font-medium">Next review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pk-line)]">
                {data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-medium text-[var(--pk-navy)]">
                      {c.siteName ?? c.supplierSiteId.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.period}</td>
                    <td className="px-5 py-3 font-semibold text-[var(--pk-navy)]">
                      {c.weightedScore.toFixed(1)}
                    </td>
                    <td className="px-5 py-3">
                      <BandBadge value={c.band} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {c.prevBand ? `${c.prevBand} → ${c.band}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {fmtDate(c.nextReviewDue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {showCompute && <ComputeModal onClose={() => setShowCompute(false)} />}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-bold text-[var(--pk-navy)]">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function ComputeModal({ onClose }: { onClose: () => void }) {
  const compute = useComputeScorecard();
  const toast = useToast();
  const { data: sites } = useSupplierSites();
  const [siteId, setSiteId] = useState("");
  const [period, setPeriod] = useState(currentQuarter());
  const [result, setResult] = useState<{
    band: string;
    weightedScore: number;
    escalationsRaised?: string | null;
  } | null>(null);

  async function run() {
    try {
      const r = await compute.mutateAsync({ supplierSiteId: siteId, period });
      setResult(r);
      toast.push(`Scorecard computed: ${r.band}`);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  // The engine returns escalationsRaised as a JSON string; parse for display.
  let escalations: Array<Record<string, unknown>> = [];
  if (result?.escalationsRaised) {
    try {
      escalations = JSON.parse(result.escalationsRaised);
    } catch {
      escalations = [];
    }
  }

  return (
    <Modal open onClose={onClose} title="Compute scorecard">
      <div className="space-y-4">
        <Field label="Supplier site" hint="Required">
          <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">Select a site…</option>
            {(sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.siteName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Period" hint="e.g. 2026-Q2">
          <Input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </Field>

        {result && (
          <div className="rounded-md border border-[var(--pk-line)] bg-gray-50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Result:</span>
              <BandBadge value={result.band as "Green" | "Yellow" | "Red"} />
              <span className="text-sm font-semibold text-[var(--pk-navy)]">
                {result.weightedScore.toFixed(1)}
              </span>
            </div>
            {escalations.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {escalations.map((e, i) => (
                  <li key={i}>
                    • <span className="font-medium">{String(e.code)}</span> →{" "}
                    {String(e.action)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                No escalations triggered.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          <Button onClick={run} loading={compute.isPending} disabled={!siteId}>
            Compute
          </Button>
        </div>
      </div>
    </Modal>
  );
}
