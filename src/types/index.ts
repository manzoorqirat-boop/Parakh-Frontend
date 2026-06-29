// Mirrors the Parakh backend domain. Keep in sync with C# enums/DTOs.

export type AuditeeType = "Supplier" | "Cmo" | "Cro" | "InternalDept";
export type Criticality = "Critical" | "Major" | "Minor";
export type MaterialCategory =
  | "Api"
  | "Ksm"
  | "Intermediate"
  | "Excipient"
  | "PrimaryPackaging"
  | "PrintedPackaging"
  | "DrugProduct"
  | "Other";
export type QualStatus = "Approved" | "Conditional" | "Disqualified" | "Pending" | "Blocked";
export type AuditType = "Onsite" | "Remote" | "Postal" | "ForCause" | "Internal";
export type AuditCategory =
  | "FirstTime"
  | "Periodic"
  | "FollowUp"
  | "ForCause"
  | "Desk";
export type AuditClass = "A" | "B" | "C";
export type AuditClassSource = "Auto" | "Manual";
export type AuditOutcome =
  | "Pending"
  | "Acceptable"
  | "NotAcceptable"
  | "Approved"
  | "NotApproved";
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
export interface ChecklistListItem {
  id: string;
  name: string;
  standard?: string | null;
  version: number;
  description?: string | null;
  itemCount: number;
}

export interface ChecklistItemRow {
  id?: string;
  orderNo?: number;
  section?: string | null;
  question: string;
  refClause?: string | null;
  isCritical: boolean;
}

export interface ChecklistDetail {
  id: string;
  name: string;
  standard?: string | null;
  version: number;
  description?: string | null;
  items: ChecklistItemRow[];
}

export interface ChecklistAssignmentRow {
  category: AuditCategory;
  checklistId: string;
  checklistName?: string | null;
}

export interface AuditNumberLogRow {
  auditNo: string;
  scheduledDate?: string | null;
  auditors?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  materialName?: string | null;
  complianceAcceptanceDate?: string | null;
  nextDueDate?: string | null;
}

export interface AuditProgrammeRow {
  materialName?: string | null;
  materialType?: string | null;
  manufacturerName?: string | null;
  manufacturerAddress?: string | null;
  lastAuditDate?: string | null;
  plannedDate?: string | null;
  plannedFrom?: string | null;
  plannedTo?: string | null;
  auditDate?: string | null;
}

export interface ProgrammeApproval {
  period: string;
  approvedByName: string;
  approvedOn: string;
  note?: string | null;
}

export interface StageCodesConfig {
  prefix: string;
  format: string;
  rules: { materialCategory: MaterialCategory; stageCode: string }[];
}

export interface AuditChecklistView {
  assigned: boolean;
  checklistId?: string | null;
  status: AuditStatus;
  items: {
    id: string;
    orderNo: number;
    section?: string | null;
    question: string;
    refClause?: string | null;
    isCritical: boolean;
  }[];
  responses: {
    checklistItemId: string;
    result: ComplianceResult;
    evidenceText?: string | null;
    auditorComment?: string | null;
  }[];
}

export type EffectivenessResult = "Effective" | "NotEffective" | "Pending";

// ----- P1 additions -----
export type ComplianceReportStatus = "Awaited" | "Received" | "Closed" | "Overdue";
export type AdequacyDecision = "Pending" | "Adequate" | "Inadequate";
export type ComplianceVerificationMethod = "DocumentEvidence" | "FollowUpAudit";
export type DesignationLevel =
  | "Executive"
  | "SeniorExecutive"
  | "AssistantManager"
  | "Manager"
  | "SeniorManager"
  | "GeneralManager"
  | "Director";

export interface ComplianceReport {
  id: string;
  auditId: string;
  reportNo: string;
  requestedOn: string;
  workingDaysAllowed: number;
  dueOn: string;
  receivedOn?: string | null;
  status: ComplianceReportStatus;
  adequacy: AdequacyDecision;
  verificationMethod?: ComplianceVerificationMethod | null;
  reviewedOn?: string | null;
  reviewNotes?: string | null;
  followUpAuditId?: string | null;
}

export interface WorkingCalendar {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface Holiday {
  id: string;
  date: string;
  name?: string | null;
}
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
  materialCategory?: MaterialCategory | null;
  country?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  qualifiedOn?: string | null;
  qualificationExpiry?: string | null;
  lastAuditDate?: string | null;
  nextAuditDue?: string | null;
}

// ----- Audit -----
export interface AuditListItem {
  id: string;
  auditNo: string;
  status: AuditStatus;
  type: AuditType;
  category?: AuditCategory;
  class?: AuditClass;
  outcome?: AuditOutcome;
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
  category: AuditCategory;
  class: AuditClass;
  classSource: AuditClassSource;
  outcome: AuditOutcome;
  outcomeEvaluatedAt?: string | null;
  parentAuditId?: string | null;
  supplierSiteId?: string | null;
  checklistId?: string | null;
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

export interface AuditIntimation {
  id: string;
  auditId: string;
  reason: string;
  criticalCount: number;
  majorCount: number;
  recipients?: string | null;
  riskAssessmentId?: string | null;
  materialAlreadyProcured: boolean;
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
  auditsDueSoon: number;
  auditsOverdue: number;
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

// ===================== SQM closed-loop + scorecard =====================
export type Severity = "Critical" | "Major" | "Minor";
export type ScarSourceType =
  | "Sncr" | "AuditFinding" | "Complaint" | "ScorecardTrigger" | "Change" | "Manual";
export type EffectivenessResultSqm = "Effective" | "NotEffective" | "Pending";
export type ScorecardBand = "Green" | "Yellow" | "Red";
export type RootCauseMethod = "FiveWhys" | "Fishbone" | "FaultTree" | "Other";
export type BuyerReviewDecision = "Accepted" | "Rejected" | "NeedsInfo";
export type ExternalLicenseState = "Pooled" | "Provisioned" | "Active" | "Inactive";

export interface ScarListItem {
  id: string;
  recordNumber?: string | null;
  title: string;
  supplierSiteId: string;
  sourceType: ScarSourceType;
  severity: Severity;
  priority: string;
  issuedDate?: string | null;
  responseDueDate?: string | null;
  effectivenessResult: EffectivenessResultSqm;
  escalationCount: number;
  recurrenceFlag: boolean;
  stateCode?: string | null;
  siteName?: string | null;
}

export interface Scar {
  id: string;
  recordNumber?: string | null;
  supplierSiteId: string;
  sourceType: ScarSourceType;
  sourceRefId?: string | null;
  title: string;
  description: string;
  severity: Severity;
  priority: string;
  issuedDate?: string | null;
  responseDueDate?: string | null;
  assignedExternalUserId?: string | null;
  containmentAction?: string | null;
  rootCause?: string | null;
  rootCauseMethod?: RootCauseMethod | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  buyerReviewDecision?: BuyerReviewDecision | null;
  effectivenessResult: EffectivenessResultSqm;
  escalationCount: number;
  recurrenceFlag: boolean;
  stateId?: string | null;
}

export interface ScarDetail {
  scar: Scar;
  stateCode?: string | null;
  transitions: AvailableTransition[];
}

export interface ScorecardListItem {
  id: string;
  recordNumber?: string | null;
  supplierSiteId: string;
  period: string;
  weightedScore: number;
  band: ScorecardBand;
  prevBand?: ScorecardBand | null;
  computedAt: string;
  nextReviewDue?: string | null;
  siteName?: string | null;
}

export interface Scorecard extends ScorecardListItem {
  kpiValues: string;
  kpiScores: string;
  escalationsRaised?: string | null;
}

export interface PoolStatus {
  active: number;
  provisioned: number;
  inactive: number;
  total: number;
}

// =====================================================================
//  Quality events & collaboration modules (added: full UI coverage)
// =====================================================================

// ----- Enums (string names matching backend JsonStringEnumConverter) -----
export type DefectCategory =
  | "Oos"
  | "Damage"
  | "Labeling"
  | "Documentation"
  | "Contamination"
  | "Quantity"
  | "Other";
export type SncrDisposition =
  | "Reject"
  | "Return"
  | "UseAsIs"
  | "Rework"
  | "Scrap";
export type CoaResult = "Pass" | "Fail" | "PendingReview";
export type ChangeIntakeChannel = "EmailProcessor" | "Portal" | "Manual";
export type ChangeType =
  | "Process"
  | "SiteLocation"
  | "RawMaterial"
  | "Equipment"
  | "Ownership"
  | "Spec"
  | "Other";
export type ImpactLevel = "None" | "Low" | "Medium" | "High";
export type ChangeDecision = "Accepted" | "Rejected" | "NoAction";
export type QualityAgreementStatus =
  | "Draft"
  | "Active"
  | "Expired"
  | "Terminated";

// ----- SNCR -----
export interface SncrListItem {
  id: string;
  recordNumber?: string | null;
  supplierSiteId: string;
  materialId: string;
  batchLot?: string | null;
  defectCategory: DefectCategory;
  severity: Severity;
  disposition?: SncrDisposition | null;
  scarId?: string | null;
}

// ----- CoA Inspection -----
export interface CoaInspectionListItem {
  id: string;
  recordNumber?: string | null;
  supplierSiteId: string;
  materialId: string;
  batchLot?: string | null;
  overallResult: CoaResult;
  oosFlag: boolean;
  reviewedDate?: string | null;
}

// ----- Change Notification -----
export interface ChangeNotificationListItem {
  id: string;
  recordNumber?: string | null;
  supplierSiteId: string;
  intakeChannel: ChangeIntakeChannel;
  changeType: ChangeType;
  impactLevel?: ImpactLevel | null;
  decision?: ChangeDecision | null;
  stateCode?: string | null;
}

// ----- Quality Agreement -----
export interface QualityAgreementListItem {
  id: string;
  recordNumber?: string | null;
  supplierSiteId: string;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  status: QualityAgreementStatus;
}

// ----- Auditor -----
export interface AuditorRoleItem {
  id: string;
  roleType: string;
  qualified: boolean;
  qualifiedDate?: string | null;
}
export interface AuditorProfileItem {
  id: string;
  recordNumber?: string | null;
  fullName: string;
  userId?: string | null;
  isActive: boolean;
  designation?: DesignationLevel;
  experienceStartDate?: string | null;
  isCertified?: boolean;
  refresherDueOn?: string | null;
  gxpAreas?: string | null;
  roles: AuditorRoleItem[];
}

// ----- Users (for people-pickers / dropdowns) -----
export interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

// ----- Findings (for CAPA finding-picker) -----
export interface FindingOption {
  id: string;
  findingNo: string;
  classification: FindingClass;
  description: string;
  auditId: string;
}

// ===========================================================================
//  Master Data Management (MDM)
//  Mirrors Parakh.Api.MasterData DTOs. Keep in sync with the C# records.
// ===========================================================================
export type MasterEntityType =
  | "SupplierParent"
  | "SupplierSite"
  | "Material"
  | "Auditor"
  | "User"
  | "ClinicalMaster";

export type ImportSource = "Manual" | "Excel" | "SapOData" | "ErpRest";

export type ImportRunStatus =
  | "Draft"
  | "Validated"
  | "Committed"
  | "Failed"
  | "Cancelled";

export type ImportRowState =
  | "Pending"
  | "Valid"
  | "Invalid"
  | "Created"
  | "Updated"
  | "Skipped";

export type ErpKind = "SapS4HanaOData" | "SapEccGateway" | "GenericRest";

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "select" | "bool";
  required: boolean;
  hint?: string | null;
  options?: string[] | null;
  externalKey?: string | null;
}

export interface EntitySchema {
  entityType: MasterEntityType;
  label: string;
  keyField: string;
  fields: FieldDef[];
}

export interface ImportRun {
  id: string;
  entityType: MasterEntityType;
  source: ImportSource;
  status: ImportRunStatus;
  sourceLabel?: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  notes?: string | null;
  createdUtc: string;
  committedUtc?: string | null;
}

export interface RowError {
  field: string;
  message: string;
}

export interface ImportRowView {
  id: string;
  rowNumber: number;
  state: ImportRowState;
  payload: Record<string, unknown>;
  externalKey?: string | null;
  errors: RowError[];
}

export interface ImportRunDetail {
  run: ImportRun;
  rows: ImportRowView[];
}

export interface ErpConnection {
  id: string;
  name: string;
  kind: ErpKind;
  baseUrl: string;
  supplierEntitySet?: string | null;
  materialEntitySet?: string | null;
  authMode: string;
  username?: string | null;
  tokenUrl?: string | null;
  isActive: boolean;
  lastSyncUtc?: string | null;
  lastTestUtc?: string | null;
  lastTestResult?: string | null;
}

export interface ErpConnectionUpsert {
  name: string;
  kind: ErpKind;
  baseUrl: string;
  supplierEntitySet?: string | null;
  materialEntitySet?: string | null;
  authMode: string;
  username?: string | null;
  secret?: string | null;
  tokenUrl?: string | null;
  isActive: boolean;
}

export interface ErpTestResult {
  ok: boolean;
  message: string;
  sampleCount?: number | null;
}
