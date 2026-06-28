import { useState } from "react";
import { Plus, BadgeCheck } from "lucide-react";
import {
  useAuditorProfiles,
  useCreateAuditorProfile,
  useUpdateAuditorQualification,
  useUpsertAuditorRole,
  useQualifyAuditorRole,
  useUsers,
} from "@/lib/hooks";
import { Button, Card, CardBody, Field, Input, Select } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import type { AuditorProfileItem, DesignationLevel } from "@/types";

export function AuditorsPage() {
  const { data, isLoading, error } = useAuditorProfiles();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader
        title="Auditors"
        subtitle="Auditor profiles and the audit-type roles they are qualified for"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New auditor
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No auditors yet"
          message="Add auditor profiles, then qualify each for the audit roles they can lead. Qualified auditors become eligible for assignment."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New auditor
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.map((a) => (
            <AuditorCard key={a.id} profile={a} />
          ))}
        </div>
      )}

      <CreateAuditorModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function AuditorCard({ profile }: { profile: AuditorProfileItem }) {
  const upsert = useUpsertAuditorRole(profile.id);
  const qualify = useQualifyAuditorRole(profile.id);
  const toast = useToast();
  const [roleType, setRoleType] = useState("");

  async function addRole() {
    if (!roleType.trim()) return;
    try {
      await upsert.mutateAsync({ roleType: roleType.trim() });
      toast.push("Role added");
      setRoleType("");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  async function doQualify(roleId: string) {
    try {
      await qualify.mutateAsync(roleId);
      toast.push("Auditor qualified for role");
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--pk-navy)]">
              {profile.fullName}
            </div>
            <div className="mt-0.5 text-xs text-gray-400">
              {profile.recordNumber}
              {!profile.isActive && " · inactive"}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Roles
          </div>
          {profile.roles.length === 0 ? (
            <p className="text-sm text-gray-400">No roles yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.roles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--pk-line)] px-3 py-1.5"
                >
                  <span className="text-sm text-gray-700">{r.roleType}</span>
                  {r.qualified ? (
                    <Badge tone="ok">
                      <BadgeCheck size={12} className="mr-1" /> Qualified
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => doQualify(r.id)}
                      loading={qualify.isPending}
                    >
                      Qualify
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-end gap-2">
            <Field label="Add role">
              <Input
                value={roleType}
                placeholder="e.g. GMP Lead Auditor"
                onChange={(e) => setRoleType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRole()}
              />
            </Field>
            <Button
              variant="outline"
              onClick={addRole}
              loading={upsert.isPending}
              disabled={!roleType.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function CreateAuditorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateAuditorProfile();
  const qualify = useUpdateAuditorQualification();
  const users = useUsers();
  const toast = useToast();
  const empty = {
    fullName: "",
    userId: "",
    certifications: "",
    languages: "",
    gxpAreas: "",
    designation: "Executive" as DesignationLevel,
    experienceStartDate: "",
    isCertified: false,
    certifiedOn: "",
  };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toJsonArray(text: string): string | null {
    const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.length ? JSON.stringify(parts) : null;
  }

  async function submit() {
    try {
      const res = await create.mutateAsync({
        fullName: form.fullName,
        userId: form.userId || null,
        certifications: toJsonArray(form.certifications),
        languages: toJsonArray(form.languages),
        gxpAreas: toJsonArray(form.gxpAreas),
      });
      // Persist designation/experience/certification so the auditor can lead audits.
      await qualify.mutateAsync({
        profileId: res.id,
        designation: form.designation,
        experienceStartDate: form.experienceStartDate || null,
        isCertified: form.isCertified,
        certifiedOn: form.certifiedOn || null,
      });
      toast.push("Auditor created");
      onClose();
      setForm(empty);
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New auditor">
      <div className="space-y-4">
        <Field label="Full name">
          <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>

        <Field label="Linked user" hint="Required to be assignable as lead/team on audits">
          <Select value={form.userId} onChange={(e) => set("userId", e.target.value)}>
            <option value="">— not linked —</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Designation">
            <Select
              value={form.designation}
              onChange={(e) => set("designation", e.target.value as DesignationLevel)}
            >
              <option value="Executive">Executive</option>
              <option value="SeniorExecutive">Senior Executive</option>
              <option value="AssistantManager">Assistant Manager</option>
              <option value="Manager">Manager</option>
              <option value="SeniorManager">Senior Manager</option>
              <option value="GeneralManager">General Manager</option>
              <option value="Director">Director</option>
            </Select>
          </Field>
          <Field label="Experience start" hint="Drives years of experience">
            <Input
              type="date"
              value={form.experienceStartDate}
              onChange={(e) => set("experienceStartDate", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Certified auditor?">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isCertified}
                onChange={(e) => set("isCertified", e.target.checked)}
              />
              Certified (§5.3.3)
            </label>
          </Field>
          {form.isCertified && (
            <Field label="Certified on" hint="Refresher auto-set +2 yr">
              <Input
                type="date"
                value={form.certifiedOn}
                onChange={(e) => set("certifiedOn", e.target.value)}
              />
            </Field>
          )}
        </div>

        <Field label="GxP areas" hint="e.g. API, Sterile">
          <Input value={form.gxpAreas} onChange={(e) => set("gxpAreas", e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!form.fullName}>
            Create auditor
          </Button>
        </div>
      </div>
    </Modal>
  );
}