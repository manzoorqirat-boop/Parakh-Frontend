import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Wrench,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { useDashboard, useRiskHeatmap } from "@/lib/hooks";
import { Card, CardBody, CardHeader } from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  CriticalityBadge,
  EmptyState,
} from "@/components/ui/status";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import { humanize } from "@/lib/utils";

const statusColors: Record<string, string> = {
  Planned: "#9ca3af",
  Scheduled: "#2471a3",
  InProgress: "#d68910",
  ReportDraft: "#b8860b",
  Signed: "#1e8449",
  Closed: "#6b7280",
};

export function DashboardPage() {
  const { data, isLoading, error } = useDashboard();
  const heatmap = useRiskHeatmap();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!data) return null;

  const tiles = [
    {
      label: "Overdue audits",
      value: data.overdueAudits,
      icon: Clock,
      tone: data.overdueAudits > 0 ? "danger" : "ok",
      to: "/audits",
    },
    {
      label: "Open CAPAs",
      value: data.openCapas,
      icon: Wrench,
      tone: "info",
      to: "/capas",
    },
    {
      label: "Overdue CAPAs",
      value: data.overdueCapas,
      icon: AlertTriangle,
      tone: data.overdueCapas > 0 ? "danger" : "ok",
      to: "/capas",
    },
    {
      label: "Expiring qualifications",
      value: data.expiringQuals,
      icon: CalendarClock,
      tone: data.expiringQuals > 0 ? "warn" : "ok",
      to: "/auditees",
    },
  ] as const;

  const toneClasses: Record<string, string> = {
    danger: "text-[var(--color-critical)] bg-red-50",
    warn: "text-[var(--color-major)] bg-amber-50",
    info: "text-[var(--color-info)] bg-blue-50",
    ok: "text-[var(--color-ok)] bg-green-50",
  };

  const chartData = data.auditsByStatus.map((s) => ({
    name: humanize(s.status),
    status: s.status,
    count: s.count,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="What needs your attention across the audit programme"
      />

      {/* Needs-attention hero band */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardBody className="flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClasses[t.tone]}`}
                >
                  <t.icon size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular text-[var(--pk-navy)]">
                    {t.value}
                  </div>
                  <div className="text-xs text-gray-500">{t.label}</div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Audits by status */}
        <Card>
          <CardHeader title="Audits by status" />
          <CardBody>
            {chartData.length === 0 ? (
              <EmptyState
                title="No audits yet"
                message="Audits will appear here once the programme is populated."
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.status} fill={statusColors[d.status] ?? "#1f2a44"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Risk heatmap */}
        <Card>
          <CardHeader
            title="Vendor risk"
            subtitle="Criticality vs. open findings"
            action={
              <Link
                to="/auditees"
                className="flex items-center gap-1 text-xs font-medium text-[var(--pk-teal)]"
              >
                All auditees <ArrowRight size={14} />
              </Link>
            }
          />
          <CardBody className="p-0">
            {heatmap.isLoading ? (
              <Spinner />
            ) : !heatmap.data || heatmap.data.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No vendors yet"
                  message="Add auditees to see the risk picture."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--pk-line)]">
                {heatmap.data
                  .slice()
                  .sort((a, b) => b.openFindings - a.openFindings)
                  .slice(0, 6)
                  .map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <CriticalityBadge value={row.criticality} />
                        <span className="text-sm text-gray-700">{row.name}</span>
                      </div>
                      <span className="tabular text-sm font-semibold text-[var(--pk-navy)]">
                        {row.openFindings} open
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
