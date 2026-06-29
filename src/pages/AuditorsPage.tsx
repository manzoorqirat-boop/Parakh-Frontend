import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, BadgeCheck } from "lucide-react";
import {
  useAuditorProfiles,
  useUpdateAuditor,
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
  const [manage, setManage] = useState<AuditorProfileItem | null>(null);

  return (
    <>
      <PageHeader
        title="Auditors"
        subtitle="Created in Master data. Here you link a login user and set §5.3 qualification."
        action={
          <Link to="/master-data">
            <Button variant="outline">
              <Plus size={16} /> Create in Master data
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={apiError(error)} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No auditors yet"
          message="Create auditors under Master data → Auditors. They appear here to be linked to a user and qualified for the audit classes they can lead."
          action={
            <Link to="/master-data">
              <Button variant="outline">Go to Master data</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.map((a) => (
            <AuditorCard key={a.id} profile={a} onManage={() => setManage(a)} />
          ))}
        </div>
      )}

      <ManageAuditorModal profile={manage} onClose={() => setManage(null)} />
    </>
  );
}

function AuditorCard({ profile, onManage }: { profile: AuditorProfileItem; onManage: () => void }) {
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

  const linked = !!profile.userId;
  const expYears = profile.experienceStartDate
    ? Math.max(0, new Date().getFullYear() - new Date(profile.experienceStartDate).getFullYear())
    : 0;

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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {linked ? (
                <Badge tone="ok">User linked</Badge>
              ) : (
                <Badge tone="warn">No user — not assignable</Badge>
              )}
              {profile.designation && <Badge tone="muted">{profile.designation}</Badge>}
              {profile.experienceStartDate && (
                <Badge tone="muted">{expYears} yr exp</Badge>
              )}
              {profile.isCertified && <Badge tone="info">Certified</Badge>}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onManage}>
            Link user &amp; qualify
          </Button>
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

function ManageAuditorModal({
  profile,
  onClose,
}: {
  profile: AuditorProfileItem | null;
  onClose: () => void;
}) {
  const update = useUpdateAuditor();
  const qualify = useUpdateAuditorQualification();
  const users = useUsers();
  const toast = useToast();
  const [form, setForm] = useState({
    userId: "",
    designation: "Executive" as DesignationLevel,
    experienceStartDate: "",
    isCertified: false,
    certifiedOn: "",
  });

  // Prefill from the selected auditor each time the modal opens.
  useEffect(() => {
    if (profile) {
      setForm({
        userId: profile.userId ?? "",
        designation: profile.designation ?? "Executive",
        experienceStartDate: profile.experienceStartDate ?? "",
        isCertified: profile.isCertified ?? false,
        certifiedOn: "",
      });
    }
  }, [profile]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!profile) return;
    try {
      await update.mutateAsync({ id: profile.id, userId: form.userId || null });
      await qualify.mutateAsync({
        profileId: profile.id,
        designation: form.designation,
        experienceStartDate: form.experienceStartDate || null,
        isCertified: form.isCertified,
        certifiedOn: form.certifiedOn || null,
      });
      toast.push("Auditor updated");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={!!profile} onClose={onClose} title={profile ? `Manage ${profile.fullName}` : ""}>
      <div className="space-y-4">
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

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={update.isPending || qualify.isPending}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
