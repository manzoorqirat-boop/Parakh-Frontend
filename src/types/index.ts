// Mirrors the Parakh backend domain. Keep in sync with C# enums/DTOs.

export type AuditeeType = "Supplier" | "Cmo" | "Cro" | "InternalDept";
export type Criticality = "Critical" | "Major" | "Minor";
export type QualStatus = "Approved" | "Conditional" | "Disqualified" | "Pending";
export type AuditType = "Onsite" | "Remote" | "Postal" | "ForCause" | "Internal";
export type AuditStatus =
  | "Planned"
  | "Scheduled"
  | "InProgress"
  | "ReportDraft"
  | "Signed"
  | "Closed";
export type FindingClass = "Critical" | "Major" | "Minor" | "Recommendation";
export type CapaStatus =
  | "Open"
  | "InProgress"
  | "PendingVerification"
  | "Closed"
  | "Overdue";
export type ActionType = "Corrective" | "Preventive" | "Correction";
export type ComplianceResult =
  | "Compliant"
  | "NonCompliant"
  | "PartiallyCompliant"
  | "NotApplicable";
export type EffectivenessResult = "Effective" | "NotEffective" | "Pending";
export type EsignStatus =
  | "Requested"
  | "InProgress"
  | "Completed"
  | "Declined"
  | "Cancelled";

// ----- Auth -----
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  refreshExpiresUtc: string;
  userId: string;
  fullName: string;
  roles: string[];
}

export interface Me {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
}

// ----- Auditee -----
export interface Auditee {
  id: string;
  name: string;
  code: string;
  type: AuditeeType;
  criticality: Criticality;
  qualStatus: QualStatus;
  materialOrServiceCategory?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  qualifiedOn?: string | null;
  qualificationExpiry?: string | null;
}

// ----- Audit -----
export interface AuditListItem {
  id: string;
  auditNo: string;
  status: AuditStatus;
  type: AuditType;
  auditee: string;
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
}

export interface Finding {
  id: string;
  findingNo: string;
  classification: FindingClass;
  description: string;
  refClause?: string | null;
  isLocked: boolean;
}

export interface AuditDetail {
  id: string;
  auditNo: string;
  status: AuditStatus;
  type: AuditType;
  scope?: string | null;
  objective?: string | null;
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
  actualFrom?: string | null;
  actualTo?: string | null;
  leadAuditorId?: string | null;
  auditee: Auditee;
  findings: Finding[];
}

// ----- CAPA -----
export interface CapaListItem {
  id: string;
  capaNo: string;
  status: CapaStatus;
  actionType: ActionType;
  dueDate?: string | null;
  findingId: string;
}

export interface CapaEffectiveness {
  id: string;
  verificationDate: string;
  result: EffectivenessResult;
  verificationNotes?: string | null;
}

export interface CapaDetail {
  id: string;
  capaNo: string;
  status: CapaStatus;
  actionType: ActionType;
  rootCause?: string | null;
  actionDescription: string;
  ownerId?: string | null;
  dueDate?: string | null;
  completedOn?: string | null;
  findingId: string;
  effectivenessChecks: CapaEffectiveness[];
}

// ----- Dashboard -----
export interface DashboardSummary {
  overdueAudits: number;
  openCapas: number;
  overdueCapas: number;
  expiringQuals: number;
  auditsByStatus: { status: AuditStatus; count: number }[];
}

export interface RiskHeatmapRow {
  id: string;
  name: string;
  criticality: Criticality;
  openFindings: number;
}

// ===================== SQM expansion =====================
export type SupplierCategory =
  | "Api" | "Excipient" | "Packaging" | "Component"
  | "Cmo" | "Cro" | "Lab" | "Service" | "Logistics";
export type ParentStatus = "Active" | "Inactive" | "Blocked";
export type RiskTier = "Low" | "Medium" | "High" | "Critical";
export type SiteType =
  | "Manufacturing" | "Packaging" | "TestingLab" | "Warehouse" | "Service";
export type GmpStatus = "Gmp" | "NonGmp" | "Unknown";
export type RiskTierSource = "Computed" | "ManualOverride";
export type MaterialType =
  | "DrugSubstance" | "Excipient" | "Api" | "Component" | "Packaging" | "Reagent";
export type SupplierMaterialStatus =
  | "Pending" | "Approved" | "Conditional" | "Suspended" | "Disqualified";

export interface SupplierParent {
  id: string;
  recordNumber?: string | null;
  legalName: string;
  displayName?: string | null;
  dunsNumber?: string | null;
  erpVendorId?: string | null;
  category: SupplierCategory;
  country: string;
  parentStatus: ParentStatus;
  riskTierRollup?: RiskTier | null;
  website?: string | null;
  siteCount?: number;
}

export interface SupplierSite {
  id: string;
  recordNumber?: string | null;
  parentId: string;
  siteName: string;
  address?: string | null;
  siteType: SiteType;
  gmpStatus: GmpStatus;
  riskTier: RiskTier;
  riskTierSource?: RiskTierSource;
  stateId?: string | null;
  stateCode?: string | null;
  qualifiedDate?: string | null;
  requalificationDue?: string | null;
}

export interface AvailableTransition {
  transitionId: string;
  trigger: string;
  label?: string | null;
  toStateId: string;
  toStateCode: string;
  requiresEsignature: boolean;
  requiresReason: boolean;
}

export interface SupplierSiteDetail {
  site: SupplierSite;
  stateCode?: string | null;
  transitions: AvailableTransition[];
}

export interface Material {
  id: string;
  recordNumber?: string | null;
  materialCode: string;
  name: string;
  materialType: MaterialType;
  criticalityClass: Criticality;
}

export interface SupplierMaterialRow {
  id: string;
  recordNumber?: string | null;
  supplierSiteId: string;
  materialId: string;
  approvalStatus: SupplierMaterialStatus;
  approvedDate?: string | null;
  requalificationDue?: string | null;
  onAsl: boolean;
  siteName?: string | null;
  materialName?: string | null;
}
