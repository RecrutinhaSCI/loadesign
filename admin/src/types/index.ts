// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer' | 'SUPER_ADMIN';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptTerms: boolean;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadSource = 'organic' | 'paid' | 'referral' | 'social' | 'email' | 'other';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
  source: LeadSource;
  status: LeadStatus;
  service: string;
  score: number;
  value: number;
  notes: string | null;
  tags: string[];
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactAt: string | null;
}

export interface LeadFilters {
  search?: string
  status?: LeadStatus
  sortBy?: keyof Lead
  sortDirection?: 'asc' | 'desc'
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface StatMetric {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  period: string;
}

export interface DashboardStats {
  totalRevenue: StatMetric;
  totalLeads: StatMetric;
  conversionRate: StatMetric;
  activeUsers: StatMetric;
  averageTicket: StatMetric;
  churnRate: StatMetric;
}

// ─── Charts ───────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  label: string;
  value: number;
  secondary?: number;
  color?: string;
  meta?: Record<string, unknown>;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'lead' | 'deal' | 'user' | 'system' | 'alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

// ─── Activities ───────────────────────────────────────────────────────────────

export type ActivityTargetType = 'lead' | 'user' | 'deal' | 'company' | 'project';

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  action: string;
  target: string;
  targetType: ActivityTargetType;
  targetId: string;
  createdAt: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  instagram: string | null;
  notes: string | null;
  totalProjects: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatusKey = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';

export interface Project {
  id: string
  name: string
  client: string
  clientId: string | null
  status: ProjectStatusKey
  progress: number
  value: number
  deadline: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// ─── Services / Packages ──────────────────────────────────────────────────────

export interface Service {
  id: string
  name: string
  slug: string
  description: string
  price: number
  featured: boolean
  active: boolean
  items: string[]
  createdAt: string
  updatedAt: string
}

// ─── Quotes (orçamentos) ──────────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
}

export interface Quote {
  id: string
  clientName: string
  clientEmail: string
  clientPhone: string
  status: QuoteStatus
  items: QuoteItem[]
  discount: number
  total: number
  notes: string | null
  validUntil: string
  createdAt: string
  updatedAt: string
}

// ─── Finance / Transactions ───────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  description: string
  client: string
  type: TransactionType
  value: number
  date: string
  category: string
  createdAt: string
  updatedAt: string
}

// ─── Agency Settings ──────────────────────────────────────────────────────────

export interface AgencySettings {
  name: string
  email: string
  whatsapp: string
  instagram: string
  website: string
  ownerName: string
  ownerEmail: string
  notifications: {
    newLead: boolean
    statusChange: boolean
    paymentReceived: boolean
    projectDelivered: boolean
  }
}

// ─── Table ────────────────────────────────────────────────────────────────────

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface SortConfig<T> {
  key: keyof T;
  direction: 'asc' | 'desc';
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

// ─── Plan / Billing ───────────────────────────────────────────────────────────

export type PlanInterval = 'month' | 'year';

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: PlanInterval;
  description: string;
  features: string[];
  limits: {
    users: number;
    leads: number;
    storage: string;
  };
  popular: boolean;
  color: string;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  children?: NavItem[];
  requiredPermission?: string;
}

// ─── Generic ─────────────────────────────────────────────────────────────────

export type ID = string;

export interface TimestampedEntity {
  createdAt: string;
  updatedAt: string;
}

export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
