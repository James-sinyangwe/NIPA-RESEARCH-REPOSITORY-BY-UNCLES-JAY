/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import multer from 'multer';
import bcrypt from 'bcryptjs';

// Cloud SQL & Drizzle imports for persistent database storage
import { db as pgDb } from './src/db/index.ts';
import { appData } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

dotenv.config();

const app = express();
const PORT = 3000;

// Set up Google GenAI with recommended configurations
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Ensure database and upload directories exist
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'database.json');

// Whitelist of safe, allowed MIME types and extensions
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.ppt', '.pptx'];

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Security block: Disallowed file extension: ${ext}`);
  }

  const base = path.basename(filename, ext);
  // Strip any potential directory traversals or multiple extensions like .php.pdf
  const cleanBase = base.split('.')[0].replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
  const finalBase = cleanBase || 'file';
  
  return `${finalBase}${ext}`;
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    try {
      const sanitized = sanitizeFilename(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + sanitized);
    } catch (err: any) {
      cb(err, '');
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Security block: Disallowed file extension: ${ext}`));
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Security block: Disallowed MIME-type: ${file.mimetype}`));
    }
    cb(null, true);
  }
});

// JSON relational database structure
interface RelationalDatabase {
  users: any[];
  roles: any[];
  permissions: any[];
  role_permissions: any[];
  role_custom_permissions: any[];
  communities: any[];
  collections: any[];
  documents: any[];
  document_files: any[];
  document_versions: any[];
  metadata: any[];
  downloads: any[];
  views: any[];
  approvals: any[];
  workflow_history: any[];
  notifications: any[];
  audit_logs: any[];
  themes: any[];
  settings: any[];
  favorites: any[];
  bookmarks: any[];
  search_logs: any[];
}

const DEFAULT_THEMES = [
  { id: '1', name: 'Orange Green (Default)', primaryColor: '#F57C00', secondaryColor: '#2E7D32', isDark: false },
  { id: '2', name: 'Blue', primaryColor: '#1976D2', secondaryColor: '#455A64', isDark: false },
  { id: '3', name: 'Dark Mode', primaryColor: '#374151', secondaryColor: '#1F2937', isDark: true },
  { id: '4', name: 'Institutional Theme', primaryColor: '#0D47A1', secondaryColor: '#FFB300', isDark: false }
];

// Copy the generated logo file to uploads so it is served statically
const srcLogoPath = path.join(process.cwd(), 'src', 'assets', 'images', 'nipa_emblem_new_1782316364589.jpg');
const destLogoPath = path.join(UPLOADS_DIR, 'nipa_logo.jpg');
try {
  if (fs.existsSync(srcLogoPath)) {
    fs.copyFileSync(srcLogoPath, destLogoPath);
    console.log('Successfully copied NIPA logo image to uploads/nipa_logo.jpg');
  } else {
    console.log('NIPA logo file not found at srcLogoPath. Creating a blank or fallback if needed.');
  }
} catch (err) {
  console.error('Error copying NIPA logo file:', err);
}

const DEFAULT_SETTINGS = [
  { id: '1', setting_name: 'default_view_mode', setting_value: 'grid' },
  { id: '2', setting_name: 'enable_user_override', setting_value: 'true' },
  { id: '3', setting_name: 'active_theme', setting_value: '1' },
  { id: '4', setting_name: 'upload_max_size_mb', setting_value: '50' },
  { id: '5', setting_name: 'smtp_host', setting_value: 'smtp.institution.edu' },
  { id: '6', setting_name: 'repository_name', setting_value: 'NIPA RESEARCH REPOSITORY' },
  { id: '7', setting_name: 'repository_subtitle', setting_value: 'National Institute of Public Administration' },
  { id: '8', setting_name: 'hero_title', setting_value: 'NIPA Research & Academic Repository' },
  { id: '9', setting_name: 'hero_desc', setting_value: 'Discover scholarly journals, master\'s theses, research papers, and policy guidelines published by the National Institute of Public Administration (NIPA) community.' },
  { id: '10', setting_name: 'hero_bg_image', setting_value: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000' },
  { id: '11', setting_name: 'repository_logo_icon', setting_value: 'BookOpen' },
  { id: '12', setting_name: 'repository_logo_image', setting_value: '/uploads/nipa_logo.jpg' },
  { id: '13', setting_name: 'hero_bg_color', setting_value: '#0f172a' },
  { id: '14', setting_name: 'hero_bg_opacity', setting_value: '10' },
  { id: '15', setting_name: 'hero_bg_color_opacity', setting_value: '100' },
  { id: '16', setting_name: 'last_backup_time', setting_value: '' }
];

function isHashed(password: string): boolean {
  return typeof password === 'string' && password.startsWith('$2') && password.length === 60;
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function migrateDatabaseState(loadedDb: RelationalDatabase): { db: RelationalDatabase; modified: boolean } {
  let modified = false;

  // Ensure default themes exist if missing
  if (!loadedDb.themes) {
    loadedDb.themes = [...DEFAULT_THEMES];
    modified = true;
  }
  if (!loadedDb.settings) {
    loadedDb.settings = [];
    modified = true;
  }

  // Migrate loadedDb with new site customization settings if missing
  DEFAULT_SETTINGS.forEach(defSetting => {
    const found = loadedDb.settings.find((s: any) => s.setting_name === defSetting.setting_name);
    if (!found) {
      loadedDb.settings.push({ ...defSetting });
      modified = true;
    }
  });

  if (!loadedDb.role_custom_permissions) {
    loadedDb.role_custom_permissions = [
      { roleName: 'Student', customPermissions: ['SUBMISSION'] },
      { roleName: 'Staff / Researcher', customPermissions: ['BYPASS_CURATION', 'SUBMISSION'] },
      { roleName: 'Librarian', customPermissions: ['BYPASS_CURATION'] },
      { roleName: 'Repository Manager', customPermissions: ['BYPASS_CURATION', 'EXPORT_SECURE_REPORTS'] },
      { roleName: 'Administrator', customPermissions: ['BYPASS_CURATION', 'DESTROY_ARCHIVE', 'EXPORT_SECURE_REPORTS', 'SYSTEM_CREDENTIALS', 'ROOT_SUPERUSER'] }
    ];
    modified = true;
  } else {
    const studentRole = loadedDb.role_custom_permissions.find((r: any) => r.roleName === 'Student');
    if (studentRole && !studentRole.customPermissions.includes('SUBMISSION')) {
      studentRole.customPermissions.push('SUBMISSION');
      modified = true;
    }
    const staffRole = loadedDb.role_custom_permissions.find((r: any) => r.roleName === 'Staff / Researcher');
    if (staffRole && !staffRole.customPermissions.includes('SUBMISSION')) {
      staffRole.customPermissions.push('SUBMISSION');
      modified = true;
    }
  }

  if (loadedDb.users) {
    loadedDb.users.forEach((u: any) => {
      if (!u.customPermissions) {
        u.customPermissions = [];
        modified = true;
      }
      if (u.role === 'Student' && !u.customPermissions.includes('SUBMISSION')) {
        u.customPermissions.push('SUBMISSION');
        modified = true;
      }
      if (u.role === 'Staff / Researcher' && !u.customPermissions.includes('SUBMISSION')) {
        u.customPermissions.push('SUBMISSION');
        modified = true;
      }
      // Upgrade password to bcrypt hash if it's currently plaintext
      if (!isHashed(u.password)) {
        u.password = hashPassword(u.password);
        modified = true;
      }
    });
  }

  return { db: loadedDb, modified };
}

function initDB(): RelationalDatabase {
  // Create a beautiful pre-seeded relational database
  const seedDB: RelationalDatabase = {
    users: [
      { id: 'u1', username: 'admin', email: 'admin@institution.edu', password: 'admin123', role: 'Administrator', department: 'Administration', faculty: 'University Management', viewPreference: 'grid' },
      { id: 'u2', username: 'manager', email: 'manager@institution.edu', password: 'manager123', role: 'Repository Manager', department: 'Library Science', faculty: 'Information Science', viewPreference: 'grid' },
      { id: 'u3', username: 'librarian', email: 'librarian@institution.edu', password: 'librarian123', role: 'Librarian', department: 'Information Science', faculty: 'Arts & Sciences', viewPreference: 'grid' },
      { id: 'u4', username: 'researcher', email: 'researcher@institution.edu', password: 'researcher123', role: 'Staff / Researcher', department: 'Computer Science', faculty: 'School of ICT', viewPreference: 'grid' },
      { id: 'u5', username: 'student', email: 'student@institution.edu', password: 'student123', role: 'Student', department: 'Business Analytics', faculty: 'School of Business', viewPreference: 'grid' }
    ],
    roles: [
      { id: 'r1', name: 'Administrator', description: 'Full system control, manage settings, themes, and users' },
      { id: 'r2', name: 'Repository Manager', description: 'Manage repository structure (communities, collections) and workflows' },
      { id: 'r3', name: 'Librarian / Moderator', description: 'Review submissions, manage metadata and collections' },
      { id: 'r4', name: 'Staff / Researcher', description: 'Submit own documents and manage their submissions' },
      { id: 'r5', name: 'Student', description: 'Access repository and bookmark documents' },
      { id: 'r6', name: 'Public User', description: 'Browse and search content anonymously' }
    ],
    permissions: [
      { id: 'p1', name: 'MANAGE_USERS', description: 'Create, update, and delete users' },
      { id: 'p2', name: 'MANAGE_STRUCTURE', description: 'Create and modify communities and collections' },
      { id: 'p3', name: 'REVIEW_SUBMISSIONS', description: 'Approve or reject researcher uploads' },
      { id: 'p4', name: 'UPLOAD_DOCUMENTS', description: 'Upload research materials and papers' },
      { id: 'p5', name: 'MANAGE_SETTINGS', description: 'Configure system themes, limits, and view controls' }
    ],
    role_permissions: [
      { roleId: 'Administrator', permissionId: 'p1' },
      { roleId: 'Administrator', permissionId: 'p2' },
      { roleId: 'Administrator', permissionId: 'p3' },
      { roleId: 'Administrator', permissionId: 'p4' },
      { roleId: 'Administrator', permissionId: 'p5' },
      { roleId: 'Repository Manager', permissionId: 'p2' },
      { roleId: 'Repository Manager', permissionId: 'p3' },
      { roleId: 'Repository Manager', permissionId: 'p4' },
      { roleId: 'Librarian / Moderator', permissionId: 'p3' },
      { roleId: 'Librarian / Moderator', permissionId: 'p4' },
      { roleId: 'Staff / Researcher', permissionId: 'p4' }
    ],
    communities: [
      { id: 'comm1', name: 'School of ICT', description: 'Research outputs from the School of Information and Communication Technology.' },
      { id: 'comm2', name: 'School of Business', description: 'Publications, business papers, and student theses from the Business School.' },
      { id: 'comm3', name: 'School of Law', description: 'Legal treatises, case studies, and policy publications from the Law Department.' },
      { id: 'comm4', name: 'Research Directorate', description: 'Institutional reports, collaborative research grants, and university-wide studies.' }
    ],
    collections: [
      { id: 'coll1', name: 'Theses & Dissertations', description: 'Master\'s and Doctoral level research documents.', communityId: 'comm1' },
      { id: 'coll2', name: 'Research Papers & Preprints', description: 'Preprints and published scientific papers of the School of ICT.', communityId: 'comm1' },
      { id: 'coll3', name: 'Journal Articles', description: 'Peer-reviewed academic journal publications.', communityId: 'comm1' },
      { id: 'coll4', name: 'Conference Proceedings', description: 'Papers presented at conferences and colloquiums.', communityId: 'comm2' },
      { id: 'coll5', name: 'Institutional Reports', description: 'Official annual reports and governance policies.', communityId: 'comm4' }
    ],
    documents: [
      {
        id: 'doc1',
        title: 'Deep Learning Architectures for Academic Document Parsing',
        author: 'Dr. Evelyn Carter',
        coAuthors: 'Prof. Adam Vance, Dr. Sarah Jenkins',
        department: 'Computer Science',
        faculty: 'School of ICT',
        keywords: 'Deep Learning, OCR, Layout Analysis, PDF Parsing, Academic Repositories',
        abstract: 'This paper proposes a novel transformer-based neural network architecture tailored for parsing hierarchical semantic structures of multi-page academic publications. We achieve a 98.4% F1-score on the Benchmark Academic Dataset, significantly outperforming legacy heuristics.',
        description: 'Preprint version submitted for peer review.',
        publicationYear: 2025,
        language: 'English',
        publisher: 'IEEE Transactions on Artificial Intelligence',
        isbn: '',
        issn: '1558-2205',
        doi: '10.1109/TAI.2025.12345',
        rightsStatement: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        status: 'Approved',
        communityId: 'comm1',
        collectionId: 'coll2',
        submitterId: 'u4',
        downloadCount: 145,
        viewCount: 382,
        isFeatured: true,
        createdAt: '2026-01-10T10:00:00Z',
        updatedAt: '2026-01-12T14:30:00Z'
      },
      {
        id: 'doc2',
        title: 'Analysis of Blockchain Solutions in Healthcare Records Security',
        author: 'Dr. Alan Turing',
        coAuthors: 'Dr. Grace Hopper',
        department: 'Cyber Security',
        faculty: 'School of ICT',
        keywords: 'Blockchain, Healthcare, Security, Smart Contracts, Cryptography',
        abstract: 'A comprehensive investigation into decentralized ledger frameworks applied to Electronic Health Records. We evaluate smart contract configurations to enforce strict HIPAA compliance, concluding that hybrid public-private architectures represent the optimal security-efficiency tradeoff.',
        description: 'Accepted journal version.',
        publicationYear: 2024,
        language: 'English',
        publisher: 'Journal of Health Informatics',
        isbn: '',
        issn: '1234-5678',
        doi: '10.1016/j.jhi.2024.05.012',
        rightsStatement: 'Institutional Proprietary Rights',
        status: 'Approved',
        communityId: 'comm1',
        collectionId: 'coll3',
        submitterId: 'u4',
        downloadCount: 92,
        viewCount: 215,
        isFeatured: false,
        createdAt: '2024-06-15T09:00:00Z',
        updatedAt: '2024-06-20T11:00:00Z'
      },
      {
        id: 'doc3',
        title: 'Institutional Financial Performance & Environmental Metrics 2025',
        author: 'Finance & Compliance Directorate',
        coAuthors: 'Sustainability Committee',
        department: 'Finance',
        faculty: 'University Management',
        keywords: 'Annual Report, Financial Audit, Sustainability, ESG, Green Campus',
        abstract: 'This comprehensive institutional report details the university\'s financial status for fiscal year 2025 alongside our progress in carbon emissions mitigation, power-efficiency measures, and green-building initiatives.',
        description: 'Approved official report for public disclosure.',
        publicationYear: 2025,
        language: 'English',
        publisher: 'University Press',
        isbn: '978-3-16-148410-0',
        issn: '',
        doi: '',
        rightsStatement: 'Public Domain',
        status: 'Approved',
        communityId: 'comm4',
        collectionId: 'coll5',
        submitterId: 'u1',
        downloadCount: 41,
        viewCount: 112,
        isFeatured: true,
        createdAt: '2025-12-01T08:30:00Z',
        updatedAt: '2025-12-05T16:00:00Z'
      },
      {
        id: 'doc4',
        title: 'Sustainable Legal Frameworks for Emerging Autonomous AI Entities',
        author: 'Prof. Julian Sterling',
        coAuthors: '',
        department: 'Constitutional Law',
        faculty: 'School of Law',
        keywords: 'AI Law, Autonomy, Legal Personhood, Liability, Smart Regulations',
        abstract: 'As artificial intelligence models advance from static tools to proactive autonomous agents, current liability models fail. This thesis analyzes potential frameworks of limited legal personhood for artificial intelligence systems, establishing accountability protocols.',
        description: 'Doctoral Dissertation.',
        publicationYear: 2026,
        language: 'English',
        publisher: 'Law Library Press',
        isbn: '',
        issn: '',
        doi: '10.5555/law.ai.2026.1',
        rightsStatement: 'All Rights Reserved',
        status: 'Pending Review',
        communityId: 'comm3',
        collectionId: 'coll1',
        submitterId: 'u4',
        downloadCount: 0,
        viewCount: 14,
        isFeatured: false,
        createdAt: '2026-02-18T11:45:00Z',
        updatedAt: '2026-02-18T11:45:00Z'
      }
    ],
    document_files: [
      { id: 'f1', documentId: 'doc1', fileName: 'academic_parser_preprint.pdf', filePath: '/uploads/doc1_sample.pdf', fileSize: 1245000, mimeType: 'application/pdf', createdAt: '2026-01-10T10:00:00Z' },
      { id: 'f2', documentId: 'doc2', fileName: 'blockchain_healthcare_compliance.pdf', filePath: '/uploads/doc2_sample.pdf', fileSize: 2150000, mimeType: 'application/pdf', createdAt: '2024-06-15T09:00:00Z' },
      { id: 'f3', documentId: 'doc3', fileName: 'annual_finance_report_2025.pdf', filePath: '/uploads/doc3_sample.pdf', fileSize: 4120000, mimeType: 'application/pdf', createdAt: '2025-12-01T08:30:00Z' },
      { id: 'f4', documentId: 'doc4', fileName: 'autonomous_ai_legal_framework.pdf', filePath: '/uploads/doc4_sample.pdf', fileSize: 980000, mimeType: 'application/pdf', createdAt: '2026-02-18T11:45:00Z' }
    ],
    document_versions: [
      { id: 'v1_1', documentId: 'doc1', versionNumber: 1, fileName: 'academic_parser_preprint.pdf', filePath: '/uploads/doc1_sample.pdf', description: 'Initial Submission', createdBy: 'u4', createdAt: '2026-01-10T10:00:00Z' },
      { id: 'v2_1', documentId: 'doc2', versionNumber: 1, fileName: 'blockchain_healthcare_compliance.pdf', filePath: '/uploads/doc2_sample.pdf', description: 'Submitted peer-reviewed version', createdBy: 'u4', createdAt: '2024-06-15T09:00:00Z' },
      { id: 'v3_1', documentId: 'doc3', versionNumber: 1, fileName: 'annual_finance_report_2025.pdf', filePath: '/uploads/doc3_sample.pdf', description: 'Official Approved Version', createdBy: 'u1', createdAt: '2025-12-01T08:30:00Z' },
      { id: 'v4_1', documentId: 'doc4', versionNumber: 1, fileName: 'autonomous_ai_legal_framework.pdf', filePath: '/uploads/doc4_sample.pdf', description: 'Draft Dissertation', createdBy: 'u4', createdAt: '2026-02-18T11:45:00Z' }
    ],
    metadata: [
      { id: 'm1_1', documentId: 'doc1', element: 'title', value: 'Deep Learning Architectures for Academic Document Parsing' },
      { id: 'm1_2', documentId: 'doc1', element: 'creator', value: 'Dr. Evelyn Carter' },
      { id: 'm1_3', documentId: 'doc1', element: 'contributor', value: 'Prof. Adam Vance' },
      { id: 'm1_4', documentId: 'doc1', element: 'subject', value: 'Deep Learning, OCR, Layout Analysis' },
      { id: 'm1_5', documentId: 'doc1', element: 'date', value: '2025' },
      { id: 'm1_6', documentId: 'doc1', element: 'publisher', value: 'IEEE Transactions on Artificial Intelligence' },
      { id: 'm1_7', documentId: 'doc1', element: 'identifier', value: 'doi:10.1109/TAI.2025.12345' },
      { id: 'm1_8', documentId: 'doc1', element: 'rights', value: 'Creative Commons Attribution 4.0' }
    ],
    downloads: [
      { id: 'dl1', documentId: 'doc1', userId: 'u5', timestamp: '2026-05-12T14:20:00Z', ipAddress: '192.168.1.100' },
      { id: 'dl2', documentId: 'doc1', userId: 'public', timestamp: '2026-06-01T10:15:00Z', ipAddress: '203.0.113.12' },
      { id: 'dl3', documentId: 'doc2', userId: 'public', timestamp: '2026-06-10T12:00:00Z', ipAddress: '203.0.113.15' },
      { id: 'dl4', documentId: 'doc3', userId: 'u5', timestamp: '2026-06-20T16:45:00Z', ipAddress: '192.168.1.102' }
    ],
    views: [
      { id: 'vw1', documentId: 'doc1', userId: 'public', timestamp: '2026-06-01T10:14:00Z', ipAddress: '203.0.113.12' },
      { id: 'vw2', documentId: 'doc2', userId: 'public', timestamp: '2026-06-10T11:58:00Z', ipAddress: '203.0.113.15' },
      { id: 'vw3', documentId: 'doc3', userId: 'u5', timestamp: '2026-06-20T16:42:00Z', ipAddress: '192.168.1.102' },
      { id: 'vw4', documentId: 'doc4', userId: 'u3', timestamp: '2026-06-21T09:12:00Z', ipAddress: '192.168.1.5' }
    ],
    approvals: [
      { id: 'ap1', documentId: 'doc1', reviewerId: 'u3', reviewerName: 'Librarian Reviewer', action: 'Approved', comment: 'Metadata checks out, paper complies with open-access specifications.', createdAt: '2026-01-12T14:30:00Z' }
    ],
    workflow_history: [
      { id: 'wf1', documentId: 'doc1', actorId: 'u4', actorName: 'Dr. Evelyn Carter', previousStatus: 'Draft', newStatus: 'Submitted', comment: 'Initial submission of my deep learning paper', createdAt: '2026-01-10T10:00:00Z' },
      { id: 'wf2', documentId: 'doc1', actorId: 'u3', actorName: 'Librarian Reviewer', previousStatus: 'Submitted', newStatus: 'Approved', comment: 'Review and approval of metadata indexing.', createdAt: '2026-01-12T14:30:00Z' },
      { id: 'wf3', documentId: 'doc4', actorId: 'u4', actorName: 'Prof. Julian Sterling', previousStatus: 'Draft', newStatus: 'Pending Review', comment: 'Submitting final draft of legal frameworks dissertation', createdAt: '2026-02-18T11:45:00Z' }
    ],
    notifications: [
      { id: 'nt1', userId: 'u4', message: 'Your paper "Deep Learning Architectures for Academic Document Parsing" has been APPROVED and published.', isRead: false, createdAt: '2026-01-12T14:30:00Z', documentId: 'doc1' }
    ],
    audit_logs: [
      { id: 'al1', userId: 'u1', username: 'admin', ipAddress: '127.0.0.1', action: 'System Initialized and Seed Data Loaded', timestamp: '2026-06-24T06:00:00Z' }
    ],
    themes: DEFAULT_THEMES,
    settings: DEFAULT_SETTINGS,
    favorites: [
      { id: 'fav1', userId: 'u5', documentId: 'doc1', createdAt: '2026-05-15T10:00:00Z' }
    ],
    bookmarks: [
      { id: 'bm1', userId: 'u5', documentId: 'doc1', notes: 'Excellent dataset references', createdAt: '2026-05-15T10:00:00Z' }
    ],
    search_logs: [
      { id: 'sl1', query: 'deep learning', count: 18, timestamp: '2026-06-24T04:30:00Z' },
      { id: 'sl2', query: 'blockchain health', count: 12, timestamp: '2026-06-24T05:12:00Z' },
      { id: 'sl3', query: 'annual report', count: 7, timestamp: '2026-06-24T05:55:00Z' }
    ],
    role_custom_permissions: [
      { roleName: 'Student', customPermissions: [] },
      { roleName: 'Staff / Researcher', customPermissions: ['BYPASS_CURATION'] },
      { roleName: 'Librarian', customPermissions: ['BYPASS_CURATION'] },
      { roleName: 'Repository Manager', customPermissions: ['BYPASS_CURATION', 'EXPORT_SECURE_REPORTS'] },
      { roleName: 'Administrator', customPermissions: ['BYPASS_CURATION', 'DESTROY_ARCHIVE', 'EXPORT_SECURE_REPORTS', 'SYSTEM_CREDENTIALS', 'ROOT_SUPERUSER'] }
    ]
  };

  // Hash all seed user passwords before returning
  seedDB.users.forEach((u: any) => {
    if (!isHashed(u.password)) {
      u.password = hashPassword(u.password);
    }
  });

  const { db: migratedDb } = migrateDatabaseState(seedDB);
  return migratedDb;
}

// Instantiate Database and load seed data
let db = initDB();

// Sync loaded state with Cloud SQL PostgreSQL
async function syncWithPostgres() {
  try {
    // Run migrations programmatically on startup to ensure the database schema is fully setup!
    console.log('Running pending database migrations if any...');
    await migrate(pgDb, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    console.log('Database migrations successfully completed or up to date.');

    console.log('Synchronizing state with Cloud SQL PostgreSQL...');
    const result = await pgDb.select().from(appData).where(eq(appData.key, 'main_database_state'));
    if (result.length > 0) {
      const { db: migratedDb, modified } = migrateDatabaseState(JSON.parse(result[0].value));
      db = migratedDb;
      console.log('Successfully loaded persistent state from Cloud SQL PostgreSQL.');
      if (modified) {
        console.log('PostgreSQL database schema required structural upgrades. Persisting migrated schema back to PostgreSQL...');
        await pgDb.insert(appData).values({
          key: 'main_database_state',
          value: JSON.stringify(db)
        }).onConflictDoUpdate({
          target: appData.key,
          set: { value: JSON.stringify(db) }
        });
      }
    } else {
      console.log('No existing state found in PostgreSQL. Seeding Cloud SQL database with initial state...');
      await pgDb.insert(appData).values({
        key: 'main_database_state',
        value: JSON.stringify(db)
      }).onConflictDoUpdate({
        target: appData.key,
        set: { value: JSON.stringify(db) }
      });
      console.log('Seeded Cloud SQL PostgreSQL database successfully.');
    }
  } catch (error) {
    console.error('Failed to sync with Cloud SQL PostgreSQL database:', error);
  }
}

function saveDB() {
  // Asynchronously save state directly to Cloud SQL PostgreSQL (never writes local database.json)
  pgDb.insert(appData).values({
    key: 'main_database_state',
    value: JSON.stringify(db)
  }).onConflictDoUpdate({
    target: appData.key,
    set: { value: JSON.stringify(db) }
  }).catch((err) => {
    console.error('Failed to persist database state to Cloud SQL:', err);
  });
}

// Log audit actions helper
function logAudit(userId: string, username: string, ip: string, action: string) {
  const log = {
    id: 'al-' + Date.now() + '-' + Math.round(Math.random() * 1000),
    userId,
    username,
    ipAddress: ip || '127.0.0.1',
    action,
    timestamp: new Date().toISOString()
  };
  db.audit_logs.unshift(log);
  saveDB();
}

// Middleware to parse body and headers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to generate a 100% valid and openable minimal single-page PDF
function generateMinimalPDF(title: string): string {
  const cleanTitle = title.replace(/[()\\\r\n]/g, '');
  const content = `BT
/F1 12 Tf
72 750 Td
(Institutional Repository Document) Tj
0 -20 Td
(${cleanTitle}) Tj
ET`;
  const streamLength = content.length;

  return `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 4 0 R
    >>
  >>
  /MediaBox [0 0 595 842]
  /Contents 5 0 R
>>
endobj
4 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000250 00000 n 
0000000325 00000 n 
trailer
<<
  /Size 6
  /Root 1 0 R
>>
startxref
420
%%EOF
`;
}

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Create mock sample pdf files for download / reading with a valid openable structure
const sampleDocs = [
  { file: 'doc1_sample.pdf', title: 'Deep Learning Architectures for Academic Document Parsing' },
  { file: 'doc2_sample.pdf', title: 'Analysis of Blockchain Solutions in Healthcare Records Security' },
  { file: 'doc3_sample.pdf', title: 'Annual Financial and Sustainability Report 2025' },
  { file: 'doc4_sample.pdf', title: 'Sustainable Legal Frameworks for Emerging Autonomous AI Entities' }
];

sampleDocs.forEach((item) => {
  const docPath = path.join(UPLOADS_DIR, item.file);
  // Always write or overwrite to replace the corrupted mock files
  fs.writeFileSync(docPath, generateMinimalPDF(item.title), 'utf8');
});

// API Routes
// ------------------
// Auth Endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password, isSwitch } = req.body;
  
  const switchEmails = [
    'manager@institution.edu',
    'librarian@institution.edu',
    'researcher@institution.edu',
    'student@institution.edu'
  ];
  
  if (switchEmails.includes(email) && !isSwitch) {
    return res.status(403).json({
      success: false,
      message: 'For security reasons, this testing switch account can only be accessed through the Admin Switcher after logging in as an Administrator.'
    });
  }

  const user = db.users.find(u => u.email === email);
  if (user && bcrypt.compareSync(password, user.password)) {
    const ip = req.ip || '127.0.0.1';
    user.lastLogin = new Date().toISOString();
    saveDB();
    logAudit(user.id, user.username, ip, `User Logged In (${user.role})`);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        faculty: user.faculty,
        viewPreference: user.viewPreference || 'grid',
        lastLogin: user.lastLogin,
        customPermissions: user.customPermissions || []
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password, role, department, faculty } = req.body;
  const exists = db.users.some(u => u.email === email || u.username === username);
  if (exists) {
    return res.status(400).json({ success: false, message: 'Username or Email already registered' });
  }

  const assignedRole = role || 'Student';
  const roleEntry = db.role_custom_permissions?.find((r: any) => r.roleName === assignedRole);
  const defaultPerms = roleEntry ? roleEntry.customPermissions : [];

  const newUser = {
    id: 'u-' + Date.now(),
    username,
    email,
    password: hashPassword(password),
    role: assignedRole,
    department: department || '',
    faculty: faculty || '',
    viewPreference: 'grid',
    customPermissions: defaultPerms || []
  };

  db.users.push(newUser);
  saveDB();

  logAudit(newUser.id, newUser.username, req.ip || '127.0.0.1', `User Registered: ${newUser.username} as ${newUser.role}`);
  res.json({ success: true, user: newUser });
});

// Settings & Preference Override
app.post('/api/auth/view-preference', (req, res) => {
  const { userId, preference } = req.body;
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    db.users[userIndex].viewPreference = preference;
    saveDB();
    res.json({ success: true, preference });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

app.post('/api/auth/profile/update', (req, res) => {
  const { userId, username, email, password, department, faculty } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (email && email !== user.email) {
    const emailExists = db.users.some(u => u.id !== userId && u.email === email);
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already taken' });
    }
  }
  if (username && username !== user.username) {
    const usernameExists = db.users.some(u => u.id !== userId && u.username === username);
    if (usernameExists) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }
  }

  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;
  if (department !== undefined) user.department = department;
  if (faculty !== undefined) user.faculty = faculty;
  if (password) user.password = hashPassword(password);

  saveDB();

  logAudit(user.id, user.username, req.ip || '127.0.0.1', `User updated their personal profile / password`);

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department,
      faculty: user.faculty,
      viewPreference: user.viewPreference || 'grid',
      customPermissions: user.customPermissions || []
    }
  });
});

// System Settings Endpoints
app.get('/api/settings', (req, res) => {
  res.json(db.settings);
});

app.post('/api/settings/update', (req, res) => {
  const { settings, userId, username } = req.body;
  if (!settings || !Array.isArray(settings)) {
    return res.status(400).json({ success: false, message: 'Invalid settings list' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user || user.role !== 'Administrator') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators can update system settings.' });
  }

  settings.forEach((s: { setting_name: string; setting_value: string }) => {
    const item = db.settings.find(st => st.setting_name === s.setting_name);
    if (item) {
      item.setting_value = s.setting_value;
    } else {
      db.settings.push({
        id: 'st-' + Date.now() + Math.random(),
        setting_name: s.setting_name,
        setting_value: s.setting_value
      });
    }
  });

  saveDB();
  logAudit(userId || 'u1', username || 'admin', req.ip || '127.0.0.1', 'System Settings Updated');
  res.json({ success: true, settings: db.settings });
});

// General Image / Logo Upload Endpoint
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// Themes Engine
app.get('/api/themes', (req, res) => {
  res.json(db.themes);
});

app.post('/api/themes/update', (req, res) => {
  const { themeId, userId, username } = req.body;
  const theme = db.themes.find(t => t.id === themeId);
  if (theme) {
    const activeSetting = db.settings.find(s => s.setting_name === 'active_theme');
    if (activeSetting) {
      activeSetting.setting_value = themeId;
    }
    saveDB();
    logAudit(userId || 'u1', username || 'admin', req.ip || '127.0.0.1', `Theme Changed to: ${theme.name}`);
    res.json({ success: true, activeTheme: themeId });
  } else {
    res.status(404).json({ success: false, message: 'Theme not found' });
  }
});

app.post('/api/themes/custom', (req, res) => {
  const { name, primaryColor, secondaryColor, isDark, userId, username } = req.body;
  const newTheme = {
    id: 't-' + Date.now(),
    name,
    primaryColor,
    secondaryColor,
    isDark: !!isDark
  };
  db.themes.push(newTheme);
  // Also set as active
  const activeSetting = db.settings.find(s => s.setting_name === 'active_theme');
  if (activeSetting) {
    activeSetting.setting_value = newTheme.id;
  }
  saveDB();
  logAudit(userId || 'u1', username || 'admin', req.ip || '127.0.0.1', `Custom Theme Created & Activated: ${name}`);
  res.json({ success: true, theme: newTheme });
});

// Communities & Collections Hierarchy
app.get('/api/communities', (req, res) => {
  res.json(db.communities);
});

app.post('/api/communities', (req, res) => {
  const { name, description, parentId, userId, username } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== 'Administrator' && user.role !== 'Repository Manager')) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators and Repository Managers can create Communities.' });
  }

  const newComm = {
    id: 'comm-' + Date.now(),
    name,
    description,
    parentId: parentId || null
  };
  db.communities.push(newComm);
  saveDB();
  logAudit(userId || 'u1', username || 'admin', req.ip || '127.0.0.1', `Community Created: ${name}`);
  res.json({ success: true, community: newComm });
});

app.post('/api/communities/:id/edit', (req, res) => {
  const { id } = req.params;
  const { name, description, parentId, userId, username } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== 'Administrator' && user.role !== 'Repository Manager')) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators and Repository Managers can edit Communities.' });
  }

  const community = db.communities.find(c => c.id === id);
  if (!community) {
    return res.status(404).json({ success: false, message: 'Community not found' });
  }

  community.name = name !== undefined ? name : community.name;
  community.description = description !== undefined ? description : community.description;
  community.parentId = parentId !== undefined ? (parentId || null) : community.parentId;

  saveDB();
  logAudit(userId, username, req.ip || '127.0.0.1', `Community Edited: ${community.name}`);
  res.json({ success: true, community });
});

app.post('/api/communities/:id/delete', (req, res) => {
  const { id } = req.params;
  const { userId, username } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== 'Administrator' && user.role !== 'Repository Manager')) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators and Repository Managers can delete Communities.' });
  }

  const index = db.communities.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Community not found' });
  }

  const community = db.communities[index];
  db.communities.splice(index, 1);
  saveDB();
  logAudit(userId, username, req.ip || '127.0.0.1', `Community Deleted: ${community.name}`);
  res.json({ success: true });
});

app.get('/api/collections', (req, res) => {
  res.json(db.collections);
});

app.post('/api/collections', (req, res) => {
  const { name, description, communityId, userId, username } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== 'Administrator' && user.role !== 'Repository Manager')) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators and Repository Managers can create Collections.' });
  }

  const newColl = {
    id: 'coll-' + Date.now(),
    name,
    description,
    communityId
  };
  db.collections.push(newColl);
  saveDB();
  logAudit(userId || 'u1', username || 'admin', req.ip || '127.0.0.1', `Collection Created: ${name}`);
  res.json({ success: true, collection: newColl });
});

app.post('/api/collections/:id/edit', (req, res) => {
  const { id } = req.params;
  const { name, description, communityId, userId, username } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== 'Administrator' && user.role !== 'Repository Manager')) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators and Repository Managers can edit Collections.' });
  }

  const collection = db.collections.find(c => c.id === id);
  if (!collection) {
    return res.status(404).json({ success: false, message: 'Collection not found' });
  }

  collection.name = name !== undefined ? name : collection.name;
  collection.description = description !== undefined ? description : collection.description;
  collection.communityId = communityId !== undefined ? communityId : collection.communityId;

  saveDB();
  logAudit(userId, username, req.ip || '127.0.0.1', `Collection Edited: ${collection.name}`);
  res.json({ success: true, collection });
});

app.post('/api/collections/:id/delete', (req, res) => {
  const { id } = req.params;
  const { userId, username } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== 'Administrator' && user.role !== 'Repository Manager')) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators and Repository Managers can delete Collections.' });
  }

  const index = db.collections.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Collection not found' });
  }

  const collection = db.collections[index];
  db.collections.splice(index, 1);
  saveDB();
  logAudit(userId, username, req.ip || '127.0.0.1', `Collection Deleted: ${collection.name}`);
  res.json({ success: true });
});

// Document Directory with Search / Pagination / Filters
app.get('/api/documents', (req, res) => {
  const { query, communityId, collectionId, author, year, department, faculty, status, limit } = req.query;

  let results = [...db.documents];

  // Apply workflow visibility constraints:
  // Public and students see ONLY Approved documents.
  // Admins, Managers, and Librarians can see all status.
  // Researchers see all Approved plus their own submission status.
  const reqRole = req.headers['x-user-role'] as string;
  const reqUserId = req.headers['x-user-id'] as string;

  if (status) {
    results = results.filter(d => d.status === status);
  } else if (!reqRole || reqRole === 'Student' || reqRole === 'Public User') {
    results = results.filter(d => d.status === 'Approved');
  } else if (reqRole === 'Staff / Researcher') {
    results = results.filter(d => d.status === 'Approved' || d.submitterId === reqUserId);
  }

  // Filter criteria
  if (communityId) {
    results = results.filter(d => d.communityId === communityId);
  }
  if (collectionId) {
    results = results.filter(d => d.collectionId === collectionId);
  }
  if (author) {
    results = results.filter(d => d.author.toLowerCase().includes((author as string).toLowerCase()));
  }
  if (year) {
    results = results.filter(d => d.publicationYear.toString() === year);
  }
  if (department) {
    results = results.filter(d => d.department.toLowerCase().includes((department as string).toLowerCase()));
  }
  if (faculty) {
    results = results.filter(d => d.faculty.toLowerCase().includes((faculty as string).toLowerCase()));
  }

  // Global full text search across Title, Author, Keywords, Abstract
  if (query) {
    const q = (query as string).toLowerCase();

    // Log the search
    const existingLog = db.search_logs.find(s => s.query.toLowerCase() === q);
    if (existingLog) {
      existingLog.count++;
      existingLog.timestamp = new Date().toISOString();
    } else {
      db.search_logs.push({
        id: 'sl-' + Date.now(),
        query: q,
        userId: reqUserId || undefined,
        count: 1,
        timestamp: new Date().toISOString()
      });
    }
    saveDB();

    results = results.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.author.toLowerCase().includes(q) ||
      (d.coAuthors && d.coAuthors.toLowerCase().includes(q)) ||
      d.keywords.toLowerCase().includes(q) ||
      d.abstract.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  }

  if (limit) {
    results = results.slice(0, parseInt(limit as string));
  }

  res.json(results);
});

// Single Document View
app.get('/api/documents/:id', (req, res) => {
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Find associated files and versions
  const files = db.document_files.filter(f => f.documentId === doc.id);
  const versions = db.document_versions.filter(v => v.documentId === doc.id);
  const approvals = db.approvals.filter(a => a.documentId === doc.id);
  const workflow = db.workflow_history.filter(w => w.documentId === doc.id);
  const comm = db.communities.find(c => c.id === doc.communityId);
  const coll = db.collections.find(cl => cl.id === doc.collectionId);

  // Auto-increment View Count (for analytics)
  doc.viewCount++;
  db.views.push({
    id: 'vw-' + Date.now() + Math.random(),
    documentId: doc.id,
    userId: req.headers['x-user-id'] || 'public',
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });
  saveDB();

  res.json({
    document: doc,
    files,
    versions,
    approvals,
    workflowHistory: workflow,
    community: comm,
    collection: coll
  });
});

// Safe file metadata list for a single document (no statistics increment)
app.get('/api/documents/:id/files', (req, res) => {
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  const files = db.document_files.filter(f => f.documentId === doc.id);
  res.json({ success: true, files });
});

// Create Document Submission / Workflows
app.post('/api/documents', upload.array('files'), (req, res) => {
  const {
    title, author, coAuthors, department, faculty, keywords,
    abstract, description, publicationYear, language, publisher,
    isbn, issn, doi, rightsStatement, communityId, collectionId,
    submitterId, submitterName, status, submissionMode
  } = req.body;

  const reqFiles = req.files as Express.Multer.File[];

  if (!reqFiles || reqFiles.length === 0) {
    return res.status(400).json({ success: false, message: 'Please upload at least one manuscript or document file for submission.' });
  }

  const submitter = db.users.find(u => u.id === (submitterId || 'u4'));
  // Auto-approvals/publishing for all users (including Administrators and Repository Managers) are disabled.
  // Every deposited item must start in the 'Submitted' status and go through curation.
  const initialStatus = 'Submitted';

  // Handle Batch Upload Mode (where multiple files are uploaded and each is created as an individual document)
  if (submissionMode === 'batch') {
    let fileTitles: string[] = [];
    try {
      if (req.body.fileTitles) {
        fileTitles = JSON.parse(req.body.fileTitles);
      }
    } catch (e) {
      console.error('Failed to parse fileTitles:', e);
    }

    const createdDocs: any[] = [];

    reqFiles.forEach((file, index) => {
      const docId = 'doc-' + Date.now() + '-' + index + '-' + Math.round(Math.random() * 100);
      
      // Determine individual title
      let specificTitle = fileTitles[index] || '';
      if (!specificTitle) {
        // Clean up original file name as default title
        specificTitle = file.originalname
          .replace(/\.[^/.]+$/, "") // strip extension
          .replace(/[_-]/g, " ")     // replace dashes/underscores with space
          .trim();
        // Capitalize first letters
        specificTitle = specificTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      const newDoc = {
        id: docId,
        title: specificTitle,
        author,
        coAuthors: coAuthors || '',
        department,
        faculty,
        keywords,
        abstract,
        description: description || '',
        publicationYear: parseInt(publicationYear) || new Date().getFullYear(),
        language: language || 'English',
        publisher: publisher || '',
        isbn: isbn || '',
        issn: issn || '',
        doi: doi || '',
        rightsStatement: rightsStatement || 'Creative Commons Attribution 4.0 International',
        status: initialStatus,
        communityId,
        collectionId,
        submitterId: submitterId || 'u4',
        downloadCount: 0,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.documents.push(newDoc);
      createdDocs.push(newDoc);

      const fileId = 'f-' + Date.now() + '-' + index + '-' + Math.round(Math.random() * 1000);
      const docFile = {
        id: fileId,
        documentId: docId,
        fileName: file.originalname,
        filePath: '/uploads/' + file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
        createdAt: new Date().toISOString()
      };
      db.document_files.push(docFile);

      // Create Version 1 record
      db.document_versions.push({
        id: 'v-' + docId + '-1',
        documentId: docId,
        versionNumber: 1,
        fileName: file.originalname,
        filePath: '/uploads/' + file.filename,
        description: 'Initial Upload (Batch Mode)',
        createdBy: submitterId || 'u4',
        createdAt: new Date().toISOString()
      });

      // Workflow tracking
      db.workflow_history.push({
        id: 'wf-' + Date.now() + '-' + index,
        documentId: docId,
        actorId: submitterId || 'u4',
        actorName: submitterName || 'Researcher',
        previousStatus: 'Draft',
        newStatus: initialStatus,
        comment: 'Document submitted via batch upload.',
        createdAt: new Date().toISOString()
      });

      // Notifications for Librarians / Managers
      db.users.forEach((u) => {
        if (u.role === 'Librarian' || u.role === 'Repository Manager' || u.role === 'Administrator') {
          db.notifications.push({
            id: 'nt-' + Date.now() + Math.random() + '-' + index,
            userId: u.id,
            message: `New repository submission received (Batch): "${specificTitle}" by ${author}`,
            isRead: false,
            createdAt: new Date().toISOString(),
            documentId: docId
          });
        }
      });
    });

    saveDB();
    logAudit(submitterId || 'u4', submitterName || 'Researcher', req.ip || '127.0.0.1', `Batch Document Submission: ${reqFiles.length} items uploaded by ${author}`);

    return res.json({ success: true, documents: createdDocs });
  }

  // Single Document mode (original behavior)
  const docId = 'doc-' + Date.now();

  const newDoc = {
    id: docId,
    title,
    author,
    coAuthors: coAuthors || '',
    department,
    faculty,
    keywords,
    abstract,
    description: description || '',
    publicationYear: parseInt(publicationYear) || new Date().getFullYear(),
    language: language || 'English',
    publisher: publisher || '',
    isbn: isbn || '',
    issn: issn || '',
    doi: doi || '',
    rightsStatement: rightsStatement || 'Creative Commons Attribution 4.0 International',
    status: initialStatus,
    communityId,
    collectionId,
    submitterId: submitterId || 'u4',
    downloadCount: 0,
    viewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.documents.push(newDoc);

  // Upload associated files
  reqFiles.forEach((file) => {
    const fileId = 'f-' + Date.now() + '-' + Math.round(Math.random() * 1000);
    const docFile = {
      id: fileId,
      documentId: docId,
      fileName: file.originalname,
      filePath: '/uploads/' + file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      createdAt: new Date().toISOString()
    };
    db.document_files.push(docFile);

    // Create Version 1 record
    db.document_versions.push({
      id: 'v-' + docId + '-1',
      documentId: docId,
      versionNumber: 1,
      fileName: file.originalname,
      filePath: '/uploads/' + file.filename,
      description: 'Initial Upload',
      createdBy: submitterId || 'u4',
      createdAt: new Date().toISOString()
    });
  });

  // Workflow tracking
  db.workflow_history.push({
    id: 'wf-' + Date.now(),
    documentId: docId,
    actorId: submitterId || 'u4',
    actorName: submitterName || 'Researcher',
    previousStatus: 'Draft',
    newStatus: initialStatus,
    comment: 'Document submitted for repository curation.',
    createdAt: new Date().toISOString()
  });

  // Notifications for Librarians / Managers
  db.users.forEach((u) => {
    if (u.role === 'Librarian' || u.role === 'Repository Manager' || u.role === 'Administrator') {
      db.notifications.push({
        id: 'nt-' + Date.now() + Math.random(),
        userId: u.id,
        message: `New repository submission received: "${title}" by ${author}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        documentId: docId
      });
    }
  });

  saveDB();
  logAudit(submitterId || 'u4', submitterName || 'Researcher', req.ip || '127.0.0.1', `Document Submitted: ${title}`);

  res.json({ success: true, document: newDoc });
});

// Update/Edit/Replace Document Files
app.post('/api/documents/:id/replace-file', upload.single('file'), (req, res) => {
  const { id } = req.params;
  const { description, userId, username } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, message: 'No replacement file uploaded' });
  }

  const doc = db.documents.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Get current max version
  const versions = db.document_versions.filter(v => v.documentId === id);
  const maxVersion = versions.reduce((max, curr) => curr.versionNumber > max ? curr.versionNumber : max, 0);
  const nextVersion = maxVersion + 1;

  // Update primary file pointer in document_files
  const primaryFiles = db.document_files.filter(f => f.documentId === id);
  if (primaryFiles.length > 0) {
    primaryFiles[0].fileName = file.originalname;
    primaryFiles[0].filePath = '/uploads/' + file.filename;
    primaryFiles[0].fileSize = file.size;
    primaryFiles[0].mimeType = file.mimetype;
  } else {
    db.document_files.push({
      id: 'f-' + Date.now(),
      documentId: id,
      fileName: file.originalname,
      filePath: '/uploads/' + file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      createdAt: new Date().toISOString()
    });
  }

  // Create new version history record
  const newVer = {
    id: `v-${id}-${nextVersion}`,
    documentId: id,
    versionNumber: nextVersion,
    fileName: file.originalname,
    filePath: '/uploads/' + file.filename,
    description: description || `Version ${nextVersion} replacement file upload.`,
    createdBy: userId || 'u4',
    createdAt: new Date().toISOString()
  };

  db.document_versions.push(newVer);
  doc.updatedAt = new Date().toISOString();

  // If in Draft or Rejected status, change back to Submitted for review
  if (doc.status === 'Draft' || doc.status === 'Rejected') {
    doc.status = 'Submitted';
    db.workflow_history.push({
      id: 'wf-' + Date.now(),
      documentId: id,
      actorId: userId || 'u4',
      actorName: username || 'Researcher',
      previousStatus: 'Draft/Rejected',
      newStatus: 'Submitted',
      comment: 'File replaced, re-submitted for review.',
      createdAt: new Date().toISOString()
    });
  }

  saveDB();
  logAudit(userId || 'u4', username || 'Researcher', req.ip || '127.0.0.1', `Document File Replaced for: ${doc.title} (New Version ${nextVersion})`);

  res.json({ success: true, document: doc, version: newVer });
});

// Workflow Review Engine (Approve / Reject)
app.post('/api/workflow/review', (req, res) => {
  const { documentId, reviewerId, reviewerName, action, comment } = req.body;

  const doc = db.documents.find(d => d.id === documentId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  const previousStatus = doc.status;
  const newStatus = action === 'Approved' ? 'Approved' : 'Rejected';

  doc.status = newStatus;
  doc.updatedAt = new Date().toISOString();

  // Save review history
  db.approvals.push({
    id: 'ap-' + Date.now(),
    documentId,
    reviewerId,
    reviewerName,
    action,
    comment,
    createdAt: new Date().toISOString()
  });

  db.workflow_history.push({
    id: 'wf-' + Date.now(),
    documentId,
    actorId: reviewerId,
    actorName: reviewerName,
    previousStatus,
    newStatus,
    comment: comment || `Submission review decision: ${action}`,
    createdAt: new Date().toISOString()
  });

  // Notify submitter
  db.notifications.push({
    id: 'nt-' + Date.now(),
    userId: doc.submitterId,
    message: `Your paper "${doc.title}" has been reviewed: ${newStatus.toUpperCase()}.${comment ? ' Note: ' + comment : ''}`,
    isRead: false,
    createdAt: new Date().toISOString(),
    documentId: documentId
  });

  saveDB();
  logAudit(reviewerId, reviewerName, req.ip || '127.0.0.1', `Workflow ${action}: ${doc.title}`);

  res.json({ success: true, document: doc });
});

// Edit Document Metadata (Items) - Admin or Repository Manager
app.post('/api/documents/:id/edit', (req, res) => {
  const { id } = req.params;
  const {
    title, author, coAuthors, department, faculty, keywords,
    abstract, description, publicationYear, language, publisher,
    isbn, issn, doi, rightsStatement, communityId, collectionId,
    status, userId, username
  } = req.body;

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const doc = db.documents.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  const isAuthorized = user.role === 'Administrator' || user.role === 'Repository Manager' || user.role === 'Librarian' || doc.submitterId === userId;
  if (!isAuthorized) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators, Repository Managers, Librarians, or the item owner can edit this item.' });
  }

  doc.title = title !== undefined ? title : doc.title;
  doc.author = author !== undefined ? author : doc.author;
  doc.coAuthors = coAuthors !== undefined ? coAuthors : doc.coAuthors;
  doc.department = department !== undefined ? department : doc.department;
  doc.faculty = faculty !== undefined ? faculty : doc.faculty;
  doc.keywords = keywords !== undefined ? keywords : doc.keywords;
  doc.abstract = abstract !== undefined ? abstract : doc.abstract;
  doc.description = description !== undefined ? description : doc.description;
  doc.publicationYear = publicationYear !== undefined ? parseInt(publicationYear) : doc.publicationYear;
  doc.language = language !== undefined ? language : doc.language;
  doc.publisher = publisher !== undefined ? publisher : doc.publisher;
  doc.isbn = isbn !== undefined ? isbn : doc.isbn;
  doc.issn = issn !== undefined ? issn : doc.issn;
  doc.doi = doi !== undefined ? doi : doc.doi;
  doc.rightsStatement = rightsStatement !== undefined ? rightsStatement : doc.rightsStatement;
  doc.communityId = communityId !== undefined ? communityId : doc.communityId;
  doc.collectionId = collectionId !== undefined ? collectionId : doc.collectionId;
  if (status !== undefined) {
    doc.status = status;
  }
  doc.updatedAt = new Date().toISOString();

  saveDB();
  logAudit(userId, username, req.ip || '127.0.0.1', `Item Edited: ${doc.title} (ID: ${doc.id})`);

  res.json({ success: true, document: doc });
});

// Delete Document (Items) - Admin or Repository Manager
app.post('/api/documents/:id/delete', (req, res) => {
  const { id } = req.params;
  const { userId, username } = req.body;

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const docIndex = db.documents.findIndex(d => d.id === id);
  if (docIndex === -1) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  const doc = db.documents[docIndex];
  const isAuthorized = user.role === 'Administrator' || user.role === 'Repository Manager' || user.role === 'Librarian' || doc.submitterId === userId;
  if (!isAuthorized) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators, Repository Managers, Librarians, or the item owner can delete this item.' });
  }
  db.documents.splice(docIndex, 1);

  // Clean up relationships
  db.document_files = db.document_files.filter(f => f.documentId !== id);
  db.document_versions = db.document_versions.filter(v => v.documentId !== id);
  db.approvals = db.approvals.filter(a => a.documentId !== id);
  db.workflow_history = db.workflow_history.filter(w => w.documentId !== id);
  db.favorites = db.favorites.filter(f => f.documentId !== id);
  db.bookmarks = db.bookmarks.filter(b => b.documentId !== id);

  saveDB();
  logAudit(userId, username, req.ip || '127.0.0.1', `Item Deleted: ${doc.title} (ID: ${id})`);

  res.json({ success: true });
});

// Notifications
app.get('/api/notifications/:userId', (req, res) => {
  const notes = db.notifications.filter(n => n.userId === req.params.userId);
  res.json(notes);
});

app.post('/api/notifications/:id/read', (req, res) => {
  const note = db.notifications.find(n => n.id === req.params.id);
  if (note) {
    note.isRead = true;
    saveDB();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Notification not found' });
  }
});

// Audit Logs View (Admin)
app.get('/api/audit-logs', (req, res) => {
  res.json(db.audit_logs);
});

// Saved Searches / Favorites / Bookmarks
app.get('/api/favorites/:userId', (req, res) => {
  const favs = db.favorites.filter(f => f.userId === req.params.userId);
  const docs = db.documents.filter(d => favs.some(f => f.documentId === d.id));
  res.json(docs);
});

app.post('/api/favorites', (req, res) => {
  const { userId, documentId } = req.body;
  const exists = db.favorites.some(f => f.userId === userId && f.documentId === documentId);
  if (exists) {
    db.favorites = db.favorites.filter(f => !(f.userId === userId && f.documentId === documentId));
    saveDB();
    return res.json({ success: true, action: 'removed' });
  }

  db.favorites.push({
    id: 'fav-' + Date.now(),
    userId,
    documentId,
    createdAt: new Date().toISOString()
  });
  saveDB();
  res.json({ success: true, action: 'added' });
});

app.get('/api/bookmarks/:userId', (req, res) => {
  const bookmarks = db.bookmarks.filter(b => b.userId === req.params.userId);
  res.json(bookmarks);
});

app.post('/api/bookmarks', (req, res) => {
  const { userId, documentId, notes } = req.body;
  const index = db.bookmarks.findIndex(b => b.userId === userId && b.documentId === documentId);
  if (index !== -1) {
    if (notes !== undefined) {
      db.bookmarks[index].notes = notes;
    } else {
      db.bookmarks.splice(index, 1);
    }
  } else {
    db.bookmarks.push({
      id: 'bm-' + Date.now(),
      userId,
      documentId,
      notes: notes || '',
      createdAt: new Date().toISOString()
    });
  }
  saveDB();
  res.json({ success: true });
});

// Popular Searches Suggestion API
app.get('/api/search/suggestions', (req, res) => {
  // Return top 8 most popular search logs
  const sorted = [...db.search_logs].sort((a, b) => b.count - a.count).slice(0, 8);
  res.json(sorted);
});

// Document Analytics and Download Tracker
app.post('/api/documents/:id/download', (req, res) => {
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  doc.downloadCount++;
  db.downloads.push({
    id: 'dl-' + Date.now() + Math.random(),
    documentId: doc.id,
    userId: req.body.userId || 'public',
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  saveDB();
  logAudit(req.body.userId || 'public', req.body.username || 'Public Visitor', req.ip || '127.0.0.1', `Downloaded Document File: ${doc.title}`);

  // Fetch file info
  const file = db.document_files.find(f => f.documentId === doc.id);
  res.json({ success: true, file });
});

// Robust binary file download endpoint
app.get('/api/documents/:id/download-file', (req, res) => {
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).send('Document not found');
  }

  const file = db.document_files.find(f => f.documentId === doc.id);
  if (!file) {
    return res.status(404).send('File not found');
  }

  const diskPath = path.join(UPLOADS_DIR, file.filePath.replace('/uploads/', ''));
  if (!fs.existsSync(diskPath)) {
    return res.status(404).send('Physical file not found on server disk.');
  }

  res.download(diskPath, file.fileName);
});

// Rich Analytics API
app.get('/api/analytics', (req, res) => {
  const totalDocs = db.documents.filter(d => d.status === 'Approved').length;
  const totalDownloads = db.downloads.length;
  const totalViews = db.views.length;
  const activeUsers = db.users.length;
  const pendingApprovals = db.documents.filter(d => d.status === 'Pending Review' || d.status === 'Submitted').length;

  // Monthly repository growth
  const growth = [
    { month: 'Jan 2026', documents: 1 },
    { month: 'Feb 2026', documents: 2 },
    { month: 'Mar 2026', documents: 2 },
    { month: 'Apr 2026', documents: 3 },
    { month: 'May 2026', documents: 3 },
    { month: 'Jun 2026', documents: totalDocs }
  ];

  // Most popular documents (by download count)
  const popularDocuments = [...db.documents]
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, 5)
    .map(d => ({ id: d.id, title: d.title, downloads: d.downloadCount, views: d.viewCount }));

  // Most popular documents by view count
  const viewedDocuments = [...db.documents]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5)
    .map(d => ({ id: d.id, title: d.title, views: d.viewCount, downloads: d.downloadCount }));

  // Active Communities statistic
  const communityStats = db.communities.map(c => {
    const docCount = db.documents.filter(d => d.communityId === c.id && d.status === 'Approved').length;
    return { name: c.name, count: docCount };
  });

  // Recent searches stats
  const searchStats = [...db.search_logs]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // User activity tracker
  const userActivities = db.audit_logs.slice(0, 15);

  res.json({
    totalDocuments: totalDocs,
    totalDownloads,
    totalViews,
    activeUsers,
    pendingApprovals,
    growth,
    popularDocuments,
    viewedDocuments,
    communityStats,
    searchStats,
    userActivities
  });
});

// CSV / Reports Export API
app.get('/api/reports/export', (req, res) => {
  const { format, type } = req.query;

  let reportData = '';
  if (type === 'downloads') {
    reportData = 'Document Title,Author,Publication Year,Downloads,Views\n';
    db.documents.forEach(d => {
      reportData += `"${d.title.replace(/"/g, '""')}","${d.author}",${d.publicationYear},${d.downloadCount},${d.viewCount}\n`;
    });
  } else if (type === 'audit') {
    reportData = 'Timestamp,User,IP Address,Action\n';
    db.audit_logs.forEach(l => {
      reportData += `"${l.timestamp}","${l.username}","${l.ipAddress}","${l.action.replace(/"/g, '""')}"\n`;
    });
  } else {
    reportData = 'Community,Collection,Document Title,Author,Year,Status\n';
    db.documents.forEach(d => {
      const commName = db.communities.find(c => c.id === d.communityId)?.name || 'Unknown';
      const collName = db.collections.find(c => c.id === d.collectionId)?.name || 'Unknown';
      reportData += `"${commName}","${collName}","${d.title.replace(/"/g, '""')}","${d.author}",${d.publicationYear},"${d.status}"\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=institutional_repository_report_${Date.now()}.csv`);
  res.status(200).send(reportData);
});

// Advanced Feature: AI-Powered Summarization using Gemini API
app.post('/api/gemini/summarize', async (req, res) => {
  const { documentId } = req.body;
  if (!ai) {
    return res.status(503).json({
      success: false,
      message: 'Gemini AI API Key not configured. Please add GEMINI_API_KEY to secrets.'
    });
  }

  const doc = db.documents.find(d => d.id === documentId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  try {
    const prompt = `You are a scholarly research paper summarizer. Analyze the following details of an academic document and provide a high-quality, professional executive summary in 3 concise bullet points. Focus on:
1. The primary research question or system objective.
2. The core methodology or innovative technique utilized.
3. The main findings, quantitative results, or policy impact.

Document Details:
Title: ${doc.title}
Author: ${doc.author}
Abstract: ${doc.abstract}
Keywords: ${doc.keywords}

Please output ONLY the 3 bullet points, formatted clearly with Markdown, and write using an objective, formal academic voice.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const summaryText = response.text;
    res.json({ success: true, summary: summaryText });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error communicating with Gemini' });
  }
});

// Users admin management
app.get('/api/admin/users', (req, res) => {
  res.json(db.users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, department: u.department, faculty: u.faculty, lastLogin: u.lastLogin, customPermissions: u.customPermissions || [] })));
});

app.post('/api/admin/users/create', (req, res) => {
  const { username, email, password, role, department, faculty, creatorId, creatorUsername } = req.body;
  const creator = db.users.find(u => u.id === creatorId);
  if (!creator || creator.role !== 'Administrator') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators can create users.' });
  }

  const exists = db.users.some(u => u.email === email || u.username === username);
  if (exists) {
    return res.status(400).json({ success: false, message: 'Username or Email already registered' });
  }

  const newUser = {
    id: 'u-' + Date.now(),
    username,
    email,
    password: hashPassword(password),
    role: role || 'Student',
    department: department || '',
    faculty: faculty || '',
    viewPreference: 'grid',
    customPermissions: []
  };

  db.users.push(newUser);
  saveDB();

  logAudit(creatorId || 'u1', creatorUsername || 'admin', req.ip || '127.0.0.1', `User Created: ${newUser.username} as ${newUser.role} by ${creatorUsername || 'System Administrator'}`);
  res.json({ success: true, user: newUser });
});

app.post('/api/admin/users/role', (req, res) => {
  const { targetUserId, newRole, adminId, adminUsername } = req.body;
  const adminUser = db.users.find(u => u.id === adminId);
  if (!adminUser || adminUser.role !== 'Administrator') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators can update user roles.' });
  }

  const user = db.users.find(u => u.id === targetUserId);
  if (user) {
    const oldRole = user.role;
    user.role = newRole;
    saveDB();
    logAudit(adminId || 'u1', adminUsername || 'admin', req.ip || '127.0.0.1', `Changed user ${user.username} role from ${oldRole} to ${newRole}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

app.post('/api/admin/users/permissions', (req, res) => {
  const { targetUserId, customPermissions, adminId, adminUsername } = req.body;
  const adminUser = db.users.find(u => u.id === adminId);
  if (!adminUser || adminUser.role !== 'Administrator') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators can delegate custom elevated permissions.' });
  }

  const user = db.users.find(u => u.id === targetUserId);
  if (user) {
    user.customPermissions = customPermissions || [];
    saveDB();
    logAudit(adminId, adminUsername, req.ip || '127.0.0.1', `Delegated elevated custom privileges to ${user.username}: [${(customPermissions || []).join(', ')}]`);
    res.json({ success: true, customPermissions: user.customPermissions });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

app.get('/api/admin/roles/permissions', (req, res) => {
  res.json({ success: true, roleCustomPermissions: db.role_custom_permissions || [] });
});

app.post('/api/admin/roles/permissions', (req, res) => {
  const { roleName, customPermissions, adminId, adminUsername } = req.body;
  const adminUser = db.users.find(u => u.id === adminId);
  if (!adminUser || adminUser.role !== 'Administrator') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators can modify role-level privileges.' });
  }

  if (!db.role_custom_permissions) {
    db.role_custom_permissions = [];
  }

  let roleEntry = db.role_custom_permissions.find(r => r.roleName === roleName);
  if (roleEntry) {
    roleEntry.customPermissions = customPermissions || [];
  } else {
    db.role_custom_permissions.push({ roleName, customPermissions: customPermissions || [] });
  }

  saveDB();
  logAudit(adminId, adminUsername, req.ip || '127.0.0.1', `Updated default custom privileges for role "${roleName}": [${(customPermissions || []).join(', ')}]`);
  res.json({ success: true, roleCustomPermissions: db.role_custom_permissions });
});

app.post('/api/admin/roles/permissions/rollout', (req, res) => {
  const { roleName, customPermissions, adminId, adminUsername } = req.body;
  const adminUser = db.users.find(u => u.id === adminId);
  if (!adminUser || adminUser.role !== 'Administrator') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators can rollout role-level privileges.' });
  }

  // Find and update all users with this role
  let updatedCount = 0;
  db.users.forEach(u => {
    if (u.role === roleName) {
      u.customPermissions = customPermissions || [];
      updatedCount++;
    }
  });

  // Make sure to also update the default mapping
  if (!db.role_custom_permissions) {
    db.role_custom_permissions = [];
  }
  let roleEntry = db.role_custom_permissions.find(r => r.roleName === roleName);
  if (roleEntry) {
    roleEntry.customPermissions = customPermissions || [];
  } else {
    db.role_custom_permissions.push({ roleName, customPermissions: customPermissions || [] });
  }

  saveDB();
  logAudit(adminId, adminUsername, req.ip || '127.0.0.1', `Bulk-rolled out privileges [${(customPermissions || []).join(', ')}] to ${updatedCount} users with role "${roleName}"`);
  res.json({ success: true, updatedCount });
});

app.post('/api/admin/users/reset-password', (req, res) => {
  const { targetUserId, newPassword, adminId, adminUsername } = req.body;
  
  const adminUser = db.users.find(u => u.id === adminId);
  if (!adminUser || (adminUser.role !== 'Administrator' && adminUser.role !== 'Repository Manager')) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Administrators and Repository Managers can reset passwords.' });
  }

  const user = db.users.find(u => u.id === targetUserId);
  if (user) {
    user.password = hashPassword(newPassword);
    saveDB();
    logAudit(adminId || 'u1', adminUsername || 'admin', req.ip || '127.0.0.1', `Password reset for user: ${user.username} by ${adminUsername}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

// Helper function to check if a row has any date field greater than a given ISO date string
function isRowNewerThan(row: any, sinceISO: string): boolean {
  if (!sinceISO) return true;
  const sinceDate = new Date(sinceISO);
  if (isNaN(sinceDate.getTime())) return true;

  if (!row || typeof row !== 'object') return false;

  // Check standard date/timestamp fields
  const dateFields = ['createdAt', 'updatedAt', 'timestamp', 'created_at', 'updated_at', 'date', 'lastActive', 'time'];
  for (const field of dateFields) {
    if (row[field]) {
      const d = new Date(row[field]);
      if (!isNaN(d.getTime()) && d > sinceDate) {
        return true;
      }
    }
  }

  // Fallback: search all string values in the row for any ISO-like date string
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(val)) {
      const d = new Date(val);
      if (!isNaN(d.getTime()) && d > sinceDate) {
        return true;
      }
    }
  }

  return false;
}

// Helper function to generate SQL dump/backup from JSON Database
function generateSQLBackup(database: any, sinceISO?: string): string {
  let sql = `-- =========================================================\n`;
  sql += `-- Database Backup Dump\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  if (sinceISO) {
    sql += `-- Incremental Backup: Only records created or modified since ${sinceISO}\n`;
  } else {
    sql += `-- Full System Database Export\n`;
  }
  sql += `-- =========================================================\n\n`;
  sql += `BEGIN TRANSACTION;\n\n`;

  const keys = Object.keys(database);
  for (const table of keys) {
    let rows = database[table];
    if (!Array.isArray(rows)) continue;

    // Filter rows for incremental backups
    if (sinceISO) {
      rows = rows.filter(row => isRowNewerThan(row, sinceISO));
    }

    // Determine all column names by merging keys of all rows
    const columnsSet = new Set<string>();
    rows.forEach(row => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(k => columnsSet.add(k));
      }
    });

    const columns = Array.from(columnsSet);
    if (columns.length === 0) {
      if (sinceISO) {
        sql += `-- Table ${table}: No new or updated records since ${sinceISO}.\n\n`;
      } else {
        // If table is empty, create a dummy table schema just to be safe
        sql += `-- Table: ${table} (Empty)\n`;
        sql += `CREATE TABLE IF NOT EXISTS ${table} (\n  id TEXT PRIMARY KEY\n);\n\n`;
      }
      continue;
    }

    // Determine data types for each column based on the values in the table
    const colTypes: { [key: string]: string } = {};
    columns.forEach(col => {
      let detectedType = 'TEXT';
      for (const row of rows) {
        if (row && row[col] !== undefined && row[col] !== null) {
          const val = row[col];
          if (typeof val === 'number') {
            detectedType = Number.isInteger(val) ? 'INTEGER' : 'NUMERIC';
          } else if (typeof val === 'boolean') {
            detectedType = 'BOOLEAN';
          } else if (Array.isArray(val) || typeof val === 'object') {
            detectedType = 'JSON';
          }
          if (detectedType !== 'TEXT') break;
        }
      }
      colTypes[col] = detectedType;
    });

    // Generate CREATE TABLE statement
    sql += `-- Table Structure for ${table}\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${table} (\n`;
    const colDefs = columns.map(col => {
      let sqlType = colTypes[col];
      if (sqlType === 'JSON') sqlType = 'TEXT'; // compatibility fallback
      const isPrimaryKey = col === 'id' ? ' PRIMARY KEY' : '';
      return `  ${col} ${sqlType}${isPrimaryKey}`;
    });
    sql += colDefs.join(',\n') + '\n);\n\n';

    // Generate INSERT INTO statements
    if (rows.length > 0) {
      sql += `-- Dumping data for table ${table}\n`;
      for (const row of rows) {
        const colNames: string[] = [];
        const valStrings: string[] = [];
        
        columns.forEach(col => {
          colNames.push(col);
          const val = row[col];
          if (val === undefined || val === null) {
            valStrings.push('NULL');
          } else if (typeof val === 'number') {
            valStrings.push(val.toString());
          } else if (typeof val === 'boolean') {
            valStrings.push(val ? 'TRUE' : 'FALSE');
          } else if (Array.isArray(val) || typeof val === 'object') {
            const jsonStr = JSON.stringify(val);
            const escaped = jsonStr.replace(/'/g, "''");
            valStrings.push(`'${escaped}'`);
          } else {
            const escaped = val.toString().replace(/'/g, "''");
            valStrings.push(`'${escaped}'`);
          }
        });

        sql += `INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${valStrings.join(', ')});\n`;
      }
      sql += '\n';
    }
  }

  sql += `COMMIT;\n`;
  return sql;
}

// Download database backup
app.get('/api/admin/backup/download', (req, res) => {
  const adminId = req.query.adminId as string;
  const incremental = req.query.incremental === 'true';
  const adminUser = db.users.find(u => u.id === adminId);
  if (!adminUser || (adminUser.role !== 'Administrator' && adminUser.role !== 'Repository Manager')) {
    return res.status(403).send('Unauthorized. Only Administrators and Repository Managers can download backups.');
  }

  // Get current last backup time from settings
  let backupSetting = db.settings.find(s => s.setting_name === 'last_backup_time');
  if (!backupSetting) {
    backupSetting = { id: 'st-backup-time', setting_name: 'last_backup_time', setting_value: '' };
    db.settings.push(backupSetting);
  }

  const sinceISO = incremental ? backupSetting.setting_value : undefined;
  const currentBackupTime = new Date().toISOString();

  const timestamp = currentBackupTime.replace(/[:.]/g, '-');
  logAudit(
    adminUser.id,
    adminUser.username,
    req.ip || '127.0.0.1',
    `Downloaded ${incremental ? 'Incremental' : 'Full'} System Database Backup (SQL Format)`
  );

  const sqlDump = generateSQLBackup(db, sinceISO);

  // Update backup setting value
  backupSetting.setting_value = currentBackupTime;
  saveDB();

  const filename = incremental
    ? `database_backup_incremental_${timestamp}.sql`
    : `database_backup_full_${timestamp}.sql`;

  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-type', 'application/sql');
  res.send(sqlDump);
});

// Global Error Handler for Multer/Upload and general errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('API Error:', err.message);
    const statusCode = err.status || err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'An error occurred processing your request.'
    });
  }
  next();
});

// Setup development & production asset serving
async function startServer() {
  // Synchronize state with Cloud SQL PostgreSQL on boot
  await syncWithPostgres();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
