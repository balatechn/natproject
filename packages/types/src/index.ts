// ============================================================
// Shared TypeScript types for NAT Project
// Used by both apps/web and apps/api
// ============================================================

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type ProjectStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ARCHIVED';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';
export type NotificationType = 'SYSTEM' | 'TASK' | 'PROJECT' | 'WORKFLOW' | 'CRM' | 'WHATSAPP' | 'EMAIL';

// ---- User ----
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  jobTitle?: string;
  status: UserStatus;
  roles: string[];
  organizationId: string;
  departmentId?: string;
  locationId?: string;
}

// ---- Auth ----
export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface LoginDto {
  email: string;
  password: string;
  mfaCode?: string;
}

// ---- Project ----
export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  priority: TaskPriority;
  progress: number;
  startDate?: string;
  endDate?: string;
  teamId?: string;
  color: string;
  tags: string[];
}

// ---- Task ----
export interface TaskSummary {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignees: Pick<UserProfile, 'id' | 'name' | 'avatarUrl'>[];
  progress: number;
  slaBreach: boolean;
}

// ---- Notification ----
export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// ---- API responses ----
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ---- Pagination ----
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ---- WebSocket events ----
export type WsEventName =
  | 'task:updated'
  | 'task:created'
  | 'task:deleted'
  | 'project:updated'
  | 'notification:new'
  | 'presence:join'
  | 'presence:leave'
  | 'chat:message';

export interface WsEvent<T = unknown> {
  event: WsEventName;
  data: T;
  timestamp: string;
}
