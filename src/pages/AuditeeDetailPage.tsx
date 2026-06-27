import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuditee, useUpdateQualification } from "@/lib/hooks";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import {
  Spinner,
  ErrorNote,
  CriticalityBadge,
  QualBadge,
} from "@/components/ui/status";
import { Modal, useToast } from "@/components/ui/overlay";
import { apiError } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { QualStatus } from "@/types";

export function AuditeeDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useAuditee(id);
  const [showQual, setShowQual] = useState(false);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={apiError(error)} />;
  if (!data) return null;

  return (
    <>
      <Link
        to="/auditees"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--pk-navy)]"
      >
        <ArrowLeft size={16} /> Auditees
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold text-[var(--pk-navy)]">{data.name}</h1>
            <CriticalityBadge value={data.criticality} />
            <QualBadge value={data.qualStatus} />
          </div>
          <p className="mt-1 tabular text-sm text-gray-500">{data.code}</p>
        </div>
        <Button variant="outline" onClick={() => setShowQual(true)}>
          Update qualification
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <CardBody className="space-y-3">
            <Row label="Category" value={data.materialOrServiceCategory ?? "—"} />
            <Row label="Country" value={data.country ?? "—"} />
            <Row label="Contact" value={data.contactName ?? "—"} />
            <Row label="Email" value={data.contactEmail ?? "—"} />
            <Row label="Phone" value={data.contactPhone ?? "—"} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Qualification" />
          <CardBody className="space-y-3">
            <Row
              label="Status"
              value={<QualBadge value={data.qualStatus} />}
            />
            <Row label="Qualified on" value={fmtDate(data.qualifiedOn)} />
            <Row label="Expiry" value={fmtDate(data.qualificationExpiry)} />
          </CardBody>
        </Card>
      </div>

      <QualModal
        open={showQual}
        onClose={() => setShowQual(false)}
        id={data.id}
        current={data.qualStatus}
        expiry={data.qualificationExpiry}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

function QualModal({
  open,
  onClose,
  id,
  current,
  expiry,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  current: QualStatus;
  expiry?: string | null;
}) {
  const update = useUpdateQualification(id);
  const toast = useToast();
  const [status, setStatus] = useState<QualStatus>(current);
  const [exp, setExp] = useState(expiry?.slice(0, 10) ?? "");

  async function submit() {
    try {
      await update.mutateAsync({
        qualStatus: status,
        qualificationExpiry: exp || null,
      });
      toast.push("Qualification updated");
      onClose();
    } catch (e) {
      toast.push(apiError(e), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Update qualification">
      <div className="space-y-4">
        <Field label="Qualification status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as QualStatus)}
          >
            <option value="Approved">Approved</option>
            <option value="Conditional">Conditional</option>
            <option value="Disqualified">Disqualified</option>
            <option value="Pending">Pending</option>
          </Select>
        </Field>
        <Field label="Expiry date">
          <Input type="date" value={exp} onChange={(e) => setExp(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={update.isPending}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}