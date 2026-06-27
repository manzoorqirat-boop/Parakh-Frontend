import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  EntitySchema,
  ImportRun,
  ImportRunDetail,
  MasterEntityType,
  ErpConnection,
  ErpConnectionUpsert,
  ErpTestResult,
} from "@/types";

// ---------- Schemas ----------
export function useMasterSchemas() {
  return useQuery({
    queryKey: ["mdm", "schemas"],
    queryFn: async () => (await api.get<EntitySchema[]>("/mdm/schemas")).data,
    staleTime: 5 * 60_000,
  });
}

// ---------- Import runs ----------
export function useImportRuns(type?: MasterEntityType) {
  return useQuery({
    queryKey: ["mdm", "runs", type ?? "all"],
    queryFn: async () =>
      (await api.get<ImportRun[]>("/mdm/runs", { params: { type } })).data,
  });
}

export function useImportRun(id: string | undefined) {
  return useQuery({
    queryKey: ["mdm", "run", id],
    enabled: !!id,
    queryFn: async () =>
      (await api.get<ImportRunDetail>(`/mdm/runs/${id}`)).data,
  });
}

// ---------- Manual create ----------
export function useMasterCreate(type: MasterEntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) =>
      (await api.post<ImportRun>(`/mdm/${type}/create`, { entityType: type, values }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mdm", "runs"] }),
  });
}

// ---------- Excel upload (stage + validate) ----------
export function useMasterUpload(type: MasterEntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<ImportRun>(`/mdm/${type}/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mdm", "runs"] }),
  });
}

// ---------- ERP pull (stage + validate) ----------
export function useErpPull(type: MasterEntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { connectionId: string; top?: number; filter?: string }) =>
      (await api.post<ImportRun>(`/mdm/${type}/erp-pull`, { entityType: type, ...body }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mdm", "runs"] }),
  });
}

// ---------- Commit ----------
export function useCommitRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      skipInvalid?: boolean;
      allowUpdates?: boolean;
    }) =>
      (
        await api.post<ImportRun>(`/mdm/runs/${vars.id}/commit`, {
          skipInvalid: vars.skipInvalid ?? true,
          allowUpdates: vars.allowUpdates ?? true,
        })
      ).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["mdm", "runs"] });
      qc.invalidateQueries({ queryKey: ["mdm", "run", vars.id] });
    },
  });
}

// ---------- Template download ----------
export async function downloadTemplate(type: MasterEntityType, label: string) {
  const res = await api.get(`/mdm/${type}/template`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `parakh-${label.toLowerCase().replace(/\s+/g, "-")}-template.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- ERP connections ----------
export function useErpConnections() {
  return useQuery({
    queryKey: ["mdm", "erp-connections"],
    queryFn: async () =>
      (await api.get<ErpConnection[]>("/mdm/erp-connections")).data,
  });
}

export function useUpsertErpConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ErpConnectionUpsert) =>
      (await api.post<ErpConnection>("/mdm/erp-connections", body)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["mdm", "erp-connections"] }),
  });
}

export function useTestErpConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<ErpTestResult>(`/mdm/erp-connections/${id}/test`, {})).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["mdm", "erp-connections"] }),
  });
}
