import { useState } from "react";
import { Plus, BadgeCheck } from "lucide-react";
import {
  useAuditorProfiles,
  useCreateAuditorProfile,
  useUpsertAuditorRole,
  useQualifyAuditorRole,
} from "@/lib/hooks";
import { Button, Card, CardBody, Field, Input } from "@/components/ui/primitives";
import { Spinner, ErrorNote, EmptyState, Badge } from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { PageHeader } from "@/components/AppLayout";
import { apiError } from "@/lib/api";
import type { AuditorProfileItem } from "@/types";

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
  const toast = useToast();
  const empty = { fullName: "", certifications: "", languages: "", gxpAreas: "" };
  const [form, setForm] = useState(empty);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    try {
      await create.mutateAsync({
        fullName: form.fullName,
        certifications: form.certifications || null,
        languages: form.languages || null,
        gxpAreas: form.gxpAreas || null,
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
        <Field label="Certifications" hint="Free text, e.g. ISO 9001 Lead Auditor">
          <Input
            value={form.certifications}
            onChange={(e) => set("certifications", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Languages">
            <Input value={form.languages} onChange={(e) => set("languages", e.target.value)} />
          </Field>
          <Field label="GxP areas" hint="e.g. API, Sterile">
            <Input value={form.gxpAreas} onChange={(e) => set("gxpAreas", e.target.value)} />
          </Field>
        </div>
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
