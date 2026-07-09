/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  department?: string;
  faculty?: string;
  lastLogin?: string;
  customPermissions?: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  parentId?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  communityId: string;
}

export interface Document {
  id: string;
  title: string;
  author: string;
  coAuthors?: string;
  department: string;
  faculty: string;
  keywords: string;
  abstract: string;
  description?: string;
  publicationYear: number;
  language: string;
  publisher?: string;
  isbn?: string;
  issn?: string;
  doi?: string;
  rightsStatement: string;
  status: 'Draft' | 'Submitted' | 'Pending Review' | 'Approved' | 'Rejected' | 'Archived';
  communityId: string;
  collectionId: string;
  submitterId: string;
  downloadCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  isFeatured?: boolean;
}

export interface DocumentFile {
  id: string;
  documentId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  filePath: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  documentId: string;
  reviewerId: string;
  reviewerName: string;
  action: 'Approved' | 'Rejected';
  comment: string;
  createdAt: string;
}

export interface WorkflowHistory {
  id: string;
  documentId: string;
  actorId: string;
  actorName: string;
  previousStatus: string;
  newStatus: string;
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  documentId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  ipAddress: string;
  action: string;
  timestamp: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  isDark: boolean;
}

export interface SystemSetting {
  id: string;
  setting_name: string;
  setting_value: string;
}

export interface Favorite {
  id: string;
  userId: string;
  documentId: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  documentId: string;
  notes?: string;
  createdAt: string;
}

export interface SearchLog {
  id: string;
  query: string;
  userId?: string;
  count: number;
  timestamp: string;
}

export interface RepositoryStats {
  totalDocuments: number;
  totalDownloads: number;
  totalViews: number;
  activeUsers: number;
  pendingApprovals: number;
  growth: { month: string; documents: number }[];
  searchStats: { query: string; count: number }[];
  communityStats: { name: string; count: number }[];
}
