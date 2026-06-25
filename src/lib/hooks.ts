import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Auditee,
  AuditListItem,
  AuditDetail,
  CapaListItem,
  CapaDetail,
  DashboardSummary,
  RiskHeatmapRow,
} from "@/types";

// ---------- Dashboard ----------
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () =>
      (await api.get<DashboardSummary>("/dashboard/summary")).data,
  });
}
export function useRiskHeatmap() {
  return useQuery({
    queryKey: ["risk-heatmap"],
    queryFn: async () =>
      (await api.get<RiskHeatmapRow[]>("/dashboard/risk-heatmap")).data,
  });
}

// ---------- Auditees ----------
export function useAuditees(type?: string) {
  return useQuery({
    queryKey: ["auditees", type ?? "all"],
    queryFn: async () =>
      (await api.get<Auditee[]>("/auditees", { params: { type } })).data,
  });
}
export function useAuditee(id: string | undefined) {
  return useQuery({
    queryKey: ["auditee", id],
    enabled: !!id,
    queryFn: async () => (await api.get<Auditee>(`/auditees/${id}`)).data,
  });
}
export function useCreateAuditee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post("/auditees", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auditees"] }),
  });
}
export function useUpdateQualification(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.put(`/auditees/${id}/qualification`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auditees"] });
      qc.invalidateQueries({ queryKey: ["auditee", id] });
    },
  });
}

// ---------- Audits ----------
export function useAudits(status?: string) {
  return useQuery({
    queryKey: ["audits", status ?? "all"],
    queryFn: async () =>
      (await api.get<AuditListItem[]>("/audits", { params: { status } })).data,
  });
}
export function useAudit(id: string | undefined) {
  return useQuery({
    queryKey: ["audit", id],
    enabled: !!id,
    queryFn: async () => (await api.get<AuditDetail>(`/audits/${id}`)).data,
  });
}
export function useCreateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post("/audits", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audits"] }),
  });
}

// Generic audit action helper — posts to a sub-route and refreshes detail+list.
export function useAuditAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      path,
      body,
      method = "post",
    }: {
      path: string;
      body?: Record<string, unknown>;
      method?: "post" | "put";
    }) => (await api[method](`/audits/${id}/${path}`, body ?? {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit", id] });
      qc.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}

// ---------- CAPAs ----------
export function useCapas(status?: string) {
  return useQuery({
    queryKey: ["capas", status ?? "all"],
    queryFn: async () =>
      (await api.get<CapaListItem[]>("/capas", { params: { status } })).data,
  });
}
export function useCapa(id: string | undefined) {
  return useQuery({
    queryKey: ["capa", id],
    enabled: !!id,
    queryFn: async () => (await api.get<CapaDetail>(`/capas/${id}`)).data,
  });
}
export function useCreateCapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post("/capas", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["capas"] }),
  });
}
export function useCapaAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      path,
      body,
    }: {
      path: string;
      body?: Record<string, unknown>;
    }) => (await api.post(`/capas/${id}/${path}`, body ?? {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capa", id] });
      qc.invalidateQueries({ queryKey: ["capas"] });
    },
  });
}
