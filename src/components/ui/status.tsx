import type { ReactNode } from "react";
import { cn, humanize } from "@/lib/utils";
import type {
  AuditStatus,
  CapaStatus,
  FindingClass,
  Criticality,
  QualStatus,
  Severity,
  ScorecardBand,
  RiskTier,
} from "@/types";

// ---------- Generic badge ----------
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "muted";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-700",
    ok: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    warn: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    info: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    muted: "bg-gray-50 text-gray-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ---------- Domain-specific status badges ----------
const auditTone: Record<AuditStatus, Parameters<typeof Badge>[0]["tone"]> = {
  Planned: "muted",
  Scheduled: "info",
  InProgress: "warn",
  ReportDraft: "warn",
  Signed: "ok",
  Closed: "neutral",
};
export function AuditStatusBadge({ status }: { status: AuditStatus }) {
  return <Badge tone={auditTone[status]}>{humanize(status)}</Badge>;
}

const capaTone: Record<CapaStatus, Parameters<typeof Badge>[0]["tone"]> = {
  Open: "info",
  InProgress: "warn",
  PendingVerification: "warn",
  Closed: "ok",
  Overdue: "danger",
};
export function CapaStatusBadge({ status }: { status: CapaStatus }) {
  return <Badge tone={capaTone[status]}>{humanize(status)}</Badge>;
}

const findingTone: Record<FindingClass, Parameters<typeof Badge>[0]["tone"]> = {
  Critical: "danger",
  Major: "warn",
  Minor: "info",
  Recommendation: "muted",
};
export function FindingBadge({ cls }: { cls: FindingClass }) {
  return <Badge tone={findingTone[cls]}>{cls}</Badge>;
}

const critTone: Record<Criticality, Parameters<typeof Badge>[0]["tone"]> = {
  Critical: "danger",
  Major: "warn",
  Minor: "info",
};
export function CriticalityBadge({ value }: { value: Criticality }) {
  return <Badge tone={critTone[value]}>{value}</Badge>;
}

const qualTone: Record<QualStatus, Parameters<typeof Badge>[0]["tone"]> = {
  Approved: "ok",
  Conditional: "warn",
  Disqualified: "danger",
  Pending: "muted",
  Blocked: "danger",
};
export function QualBadge({ value }: { value: QualStatus }) {
  return <Badge tone={qualTone[value]}>{humanize(value)}</Badge>;
}

const severityTone: Record<Severity, Parameters<typeof Badge>[0]["tone"]> = {
  Critical: "danger",
  Major: "warn",
  Minor: "info",
};
export function SeverityBadge({ value }: { value: Severity }) {
  return <Badge tone={severityTone[value]}>{value}</Badge>;
}

const bandTone: Record<ScorecardBand, Parameters<typeof Badge>[0]["tone"]> = {
  Green: "ok",
  Yellow: "warn",
  Red: "danger",
};
export function BandBadge({ value }: { value: ScorecardBand }) {
  return <Badge tone={bandTone[value]}>{value}</Badge>;
}

const riskTierTone: Record<RiskTier, Parameters<typeof Badge>[0]["tone"]> = {
  Low: "ok",
  Medium: "info",
  High: "warn",
  Critical: "danger",
};
export function RiskTierBadge({ value }: { value: RiskTier }) {
  return <Badge tone={riskTierTone[value]}>{value}</Badge>;
}

// ---------- Lifecycle rail (the signature element) ----------
// Visualises an audit or CAPA moving through its states. Order carries meaning,
// so the numbered/connected steps are justified here (a real process sequence).
export function LifecycleRail({
  steps,
  current,
}: {
  steps: string[];
  current: string;
}) {
  const idx = steps.indexOf(current);
  return (
    <ol className="flex items-center gap-1 overflow-x-auto py-1">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={step} className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                  done && "bg-[var(--pk-teal)] text-white",
                  active && "bg-[var(--pk-navy)] text-white ring-4 ring-[var(--pk-navy)]/10",
                  !done && !active && "bg-gray-100 text-gray-400"
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  active ? "font-semibold text-[var(--pk-navy)]" : "text-gray-500"
                )}
              >
                {humanize(step)}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "mx-1 h-px w-6",
                  i < idx ? "bg-[var(--pk-teal)]" : "bg-gray-200"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Empty / loading / error states ----------
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/50 px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-[var(--pk-navy)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200 border-t-[var(--pk-teal)]" />
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}