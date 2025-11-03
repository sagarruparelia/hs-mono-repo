// API Response Types

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// User & Profile Types

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileData {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
    notifications?: boolean;
  };
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
    notifications?: boolean;
  };
}

// Summary & Activity Types

export interface ActivityItem {
  id: string;
  type: 'login' | 'update' | 'purchase' | 'view' | 'share' | 'comment';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MetricData {
  label: string;
  value: number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface SummaryData {
  userId: string;
  metrics: MetricData[];
  recentActivities: ActivityItem[];
  timeRange: 'week' | 'month' | 'year';
  lastUpdated: string;
}

export interface SummaryQueryParams {
  userId?: string;
  timeRange?: 'week' | 'month' | 'year';
  limit?: number;
}

// Pagination

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
