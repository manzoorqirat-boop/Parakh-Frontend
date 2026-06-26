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
  SupplierParent,
  SupplierSite,
  SupplierSiteDetail,
  Material,
  SupplierMaterialRow,
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

// ---------- SQM: Supplier parents ----------
export function useSupplierParents() {
  return useQuery({
    queryKey: ["supplier-parents"],
    queryFn: async () =>
      (await api.get<SupplierParent[]>("/supplier-parents")).data,
  });
}
export function useSupplierParent(id: string | undefined) {
  return useQuery({
    queryKey: ["supplier-parent", id],
    enabled: !!id,
    queryFn: async () =>
      (await api.get<SupplierParent>(`/supplier-parents/${id}`)).data,
  });
}
export function useCreateSupplierParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post("/supplier-parents", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-parents"] }),
  });
}
export function useUpdateSupplierParent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.put(`/supplier-parents/${id}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-parents"] });
      qc.invalidateQueries({ queryKey: ["supplier-parent", id] });
    },
  });
}

// ---------- SQM: Supplier sites ----------
export function useSupplierSites(parentId?: string) {
  return useQuery({
    queryKey: ["supplier-sites", parentId ?? "all"],
    queryFn: async () =>
      (await api.get<SupplierSite[]>("/supplier-sites", {
        params: { parentId },
      })).data,
  });
}
export function useSupplierSite(id: string | undefined) {
  return useQuery({
    queryKey: ["supplier-site", id],
    enabled: !!id,
    queryFn: async () =>
      (await api.get<SupplierSiteDetail>(`/supplier-sites/${id}`)).data,
  });
}
export function useCreateSupplierSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post("/supplier-sites", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-sites"] }),
  });
}
export function useUpdateSupplierSite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.put(`/supplier-sites/${id}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-sites"] });
      qc.invalidateQueries({ queryKey: ["supplier-site", id] });
    },
  });
}

// ---------- SQM: Workflow transition ----------
export function useTransition(objectType: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      trigger: string;
      reason?: string | null;
      esignatureId?: string | null;
    }) =>
      (await api.post(`/workflow/${objectType}/${id}/transition`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-site", id] });
      qc.invalidateQueries({ queryKey: ["supplier-sites"] });
    },
  });
}

// ---------- SQM: Materials ----------
export function useMaterials() {
  return useQuery({
    queryKey: ["materials"],
    queryFn: async () => (await api.get<Material[]>("/materials")).data,
  });
}
export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post("/materials", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

// ---------- SQM: Supplier-Material (ASL) ----------
export function useSupplierMaterials(params: {
  siteId?: string;
  materialId?: string;
}) {
  return useQuery({
    queryKey: ["supplier-materials", params.siteId ?? "", params.materialId ?? ""],
    queryFn: async () =>
      (await api.get<SupplierMaterialRow[]>("/supplier-materials", { params }))
        .data,
  });
}
export function useCreateSupplierMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post("/supplier-materials", body)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["supplier-materials"] }),
  });
}
export function useUpdateSupplierMaterial(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.put(`/supplier-materials/${id}`, body)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["supplier-materials"] }),
  });
}

// ---------- SQM: SCARs (closed loop) ----------
export function useScars(params: { siteId?: string } = {}) {
  return useQuery({
    queryKey: ["scars", params.siteId ?? "all"],
    queryFn: async () =>
      (await api.get<import("@/types").ScarListItem[]>("/scars", { params })).data,
  });
}
export function useScar(id: string | undefined) {
  return useQuery({
    queryKey: ["scar", id],
    enabled: !!id,
    queryFn: async () =>
      (await api.get<import("@/types").ScarDetail>(`/scars/${id}`)).data,
  });
}
export function useCreateScar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post("/scars", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scars"] }),
  });
}
// Generic SCAR action: posts to a sub-route and refreshes detail + list.
export function useScarAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      path,
      body,
    }: {
      path: string;
      body?: Record<string, unknown>;
    }) => (await api.post(`/scars/${id}/${path}`, body ?? {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scar", id] });
      qc.invalidateQueries({ queryKey: ["scars"] });
    },
  });
}

// ---------- SQM: Scorecards (the differentiator) ----------
export function useScorecards(siteId?: string) {
  return useQuery({
    queryKey: ["scorecards", siteId ?? "all"],
    queryFn: async () =>
      (await api.get<import("@/types").ScorecardListItem[]>("/scorecards", {
        params: { siteId },
      })).data,
  });
}
export function useComputeScorecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { supplierSiteId: string; period: string }) =>
      (await api.post("/scorecards/compute", body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scorecards"] });
      qc.invalidateQueries({ queryKey: ["scars"] });
      qc.invalidateQueries({ queryKey: ["supplier-sites"] });
    },
  });
}

// ---------- SQM: External collaboration pool ----------
export function useExternalPool() {
  return useQuery({
    queryKey: ["external-pool"],
    queryFn: async () =>
      (await api.get<import("@/types").PoolStatus>("/external-collaboration/pool"))
        .data,
  });
}

// ---------- SQM: Risk assessments & qualifications ----------
export function useRiskAssessments(siteId?: string) {
  return useQuery({
    queryKey: ["risk-assessments", siteId ?? "all"],
    queryFn: async () =>
      (await api.get("/risk-assessments", { params: { siteId } })).data,
  });
}
export function useQualifications(siteId?: string) {
  return useQuery({
    queryKey: ["qualifications", siteId ?? "all"],
    queryFn: async () =>
      (await api.get("/qualifications", { params: { siteId } })).data,
  });
}
