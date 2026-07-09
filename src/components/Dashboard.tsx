/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Community, Collection, Document, AuditLog, ThemeConfig, SystemSetting } from '../types';
import {
  Shield, Settings, Palette, Database, Activity, FileUp, FileCheck,
  Plus, CheckCircle, XCircle, MessageSquare, Download, Check, RefreshCw, Trash2, Edit2, Key, UserRound,
  Menu, X, FileText, BookOpen, Info
} from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  communities: Community[];
  collections: Collection[];
  documents: Document[];
  allThemes: ThemeConfig[];
  systemSettings: SystemSetting[];
  onRefreshData: () => void;
  onSelectDocument: (id: string) => void;
  primaryColor: string;
  secondaryColor: string;
  onQuickLogin?: (email: string, pass: string) => void;
  onUpdateUser?: (user: User) => void;
}

export default function Dashboard({
  currentUser,
  communities,
  collections,
  documents,
  allThemes,
  systemSettings,
  onRefreshData,
  onSelectDocument,
  primaryColor,
  secondaryColor,
  onQuickLogin,
  onUpdateUser
}: DashboardProps) {
  // Navigation tabs within Dashboard
  const [activeTab, setActiveTab] = useState<string>('');

  // Set default tab based on user role
  useEffect(() => {
    if (currentUser.role === 'Administrator') {
      setActiveTab('stats');
    } else if (currentUser.role === 'Repository Manager') {
      setActiveTab('structure');
    } else if (currentUser.role === 'Staff / Researcher' || currentUser.role === 'Librarian / Moderator' || currentUser.role === 'Librarian') {
      setActiveTab('submissions');
    } else {
      setActiveTab('locker');
    }
  }, [currentUser]);

  // Admin states
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [viewModeSetting, setViewModeSetting] = useState('grid');
  const [overrideSetting, setOverrideSetting] = useState('true');
  const [activeThemeId, setActiveThemeId] = useState('1');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  
  // Site Customization Settings
  const [repositoryNameSetting, setRepositoryNameSetting] = useState('CORE Repository');
  const [repositorySubtitleSetting, setRepositorySubtitleSetting] = useState('Digital Library & Archive');
  const [heroTitleSetting, setHeroTitleSetting] = useState('Institutional Knowledge, Open & Accessible to All');
  const [heroDescSetting, setHeroDescSetting] = useState('');
  const [heroBgImageSetting, setHeroBgImageSetting] = useState('https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000');
  const [repositoryLogoIconSetting, setRepositoryLogoIconSetting] = useState('BookOpen');
  const [repositoryLogoImageSetting, setRepositoryLogoImageSetting] = useState('');
  const [heroBgColorSetting, setHeroBgColorSetting] = useState('#0f172a');
  const [heroBgOpacitySetting, setHeroBgOpacitySetting] = useState('10');
  const [heroBgColorOpacitySetting, setHeroBgColorOpacitySetting] = useState('100');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Image upload states & handlers
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setLogoUploadError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setRepositoryLogoImageSetting(data.url);
      } else {
        setLogoUploadError(data.message || 'Failed to upload logo.');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      setLogoUploadError('Failed to upload logo due to network error.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHeroUploading(true);
    setHeroUploadError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setHeroBgImageSetting(data.url);
      } else {
        setHeroUploadError(data.message || 'Failed to upload hero image.');
      }
    } catch (err) {
      console.error('Hero upload error:', err);
      setHeroUploadError('Failed to upload hero image due to network error.');
    } finally {
      setHeroUploading(false);
    }
  };

  // User creation states
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Student',
    department: 'Computer Science',
    faculty: 'School of ICT'
  });
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');

  // Password reset states
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');

  // Elevated Rights and Permission delegation states
  const [permissionTargetUser, setPermissionTargetUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Role-Level Privileges Mappings & User sub-tab
  const [userManagementSubTab, setUserManagementSubTab] = useState<'users' | 'roles'>('users');
  const [roleCustomPermissions, setRoleCustomPermissions] = useState<{ roleName: string; customPermissions: string[] }[]>([]);
  const [selectedMappingRole, setSelectedMappingRole] = useState<string>('Student');
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<string[]>([]);
  const [isUpdatingRolePermissions, setIsUpdatingRolePermissions] = useState(false);

  // Audit Logs Display Toggle
  const [showOnlyLatestLog, setShowOnlyLatestLog] = useState(true);

  // Mobile navigation drawer toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile Update States
  const [profileForm, setProfileForm] = useState({
    username: currentUser.username,
    email: currentUser.email,
    department: currentUser.department || '',
    faculty: currentUser.faculty || '',
    password: '',
    confirmPassword: ''
  });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Sync profile form when currentUser changes
  useEffect(() => {
    setProfileForm({
      username: currentUser.username,
      email: currentUser.email,
      department: currentUser.department || '',
      faculty: currentUser.faculty || '',
      password: '',
      confirmPassword: ''
    });
  }, [currentUser]);

  // Custom Theme Inputs
  const [customThemeName, setCustomThemeName] = useState('');
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#F57C00');
  const [customSecondaryColor, setCustomSecondaryColor] = useState('#2E7D32');

  // Submissions state (Researcher)
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [submissionForm, setSubmissionForm] = useState({
    title: '',
    author: currentUser.username,
    coAuthors: '',
    department: currentUser.department || '',
    faculty: currentUser.faculty || '',
    keywords: '',
    abstract: '',
    description: '',
    publicationYear: new Date().getFullYear().toString(),
    language: 'English',
    publisher: '',
    isbn: '',
    issn: '',
    doi: '',
    rightsStatement: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    communityId: '',
    collectionId: ''
  });

  const [submissionMode, setSubmissionMode] = useState<'single' | 'batch'>('single');
  const [batchTitles, setBatchTitles] = useState<string[]>([]);

  // Automatically keep batch titles synced with attached files count & names
  useEffect(() => {
    setBatchTitles((prev) => {
      return attachedFiles.map((file, idx) => {
        if (prev[idx] !== undefined) {
          return prev[idx]; // Keep edited title
        }
        // Generate a clean title from file name
        const cleaned = file.name
          .replace(/\.[^/.]+$/, "") // strip extension
          .replace(/[_-]/g, " ")     // replace dashes/underscores with space
          .trim();
        return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      });
    });
  }, [attachedFiles]);

  // Replacement File upload
  const [selectedDocForReplace, setSelectedDocForReplace] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceDesc, setReplaceDesc] = useState('');

  // Manager states
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [selectedCommunityIdForColl, setSelectedCommunityIdForColl] = useState('');

  // Editing sector & archive states
  const [editingCommunityId, setEditingCommunityId] = useState<string | null>(null);
  const [editCommunityName, setEditCommunityName] = useState('');
  const [editCommunityDesc, setEditCommunityDesc] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editCollectionName, setEditCollectionName] = useState('');
  const [editCollectionDesc, setEditCollectionDesc] = useState('');
  const [editCollectionCommunityId, setEditCollectionCommunityId] = useState('');

  // Review states
  const [selectedDocForReview, setSelectedDocForReview] = useState<Document | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewedDocFile, setReviewedDocFile] = useState<any>(null);
  const [isFetchingFile, setIsFetchingFile] = useState(false);

  useEffect(() => {
    if (selectedDocForReview) {
      setIsFetchingFile(true);
      fetch(`/api/documents/${selectedDocForReview.id}/files`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.files && data.files.length > 0) {
          setReviewedDocFile(data.files[0]);
        } else {
          setReviewedDocFile(null);
        }
        setIsFetchingFile(false);
      })
      .catch(e => {
        console.error('Error fetching file metadata for review', e);
        setReviewedDocFile(null);
        setIsFetchingFile(false);
      });
    } else {
      setReviewedDocFile(null);
    }
  }, [selectedDocForReview]);

  // Synchronize role permissions in UI when selecting a mapping role
  useEffect(() => {
    const mapping = roleCustomPermissions.find(r => r.roleName === selectedMappingRole);
    if (mapping) {
      setSelectedRolePermissions(mapping.customPermissions || []);
    } else {
      setSelectedRolePermissions([]);
    }
  }, [selectedMappingRole, roleCustomPermissions]);

  // Locker Favorites / Bookmarks (Student)
  const [lockerFavorites, setLockerFavorites] = useState<Document[]>([]);

  useEffect(() => {
    const isAllowedUsers = currentUser.role === 'Administrator' || currentUser.role === 'Repository Manager' || currentUser.role === 'Librarian / Moderator' || currentUser.role === 'Librarian';
    if (activeTab === 'stats' || currentUser.role === 'Administrator') {
      fetchAnalytics();
      fetchAuditLogs();
    }
    if (activeTab === 'users' || isAllowedUsers) {
      fetchAdminUsers();
    }
    if (activeTab === 'review') {
      onRefreshData();
    }
    if (activeTab === 'locker') {
      fetchLockerData();
    }
    // Load setting states
    const vm = systemSettings.find(s => s.setting_name === 'default_view_mode')?.setting_value || 'grid';
    const ov = systemSettings.find(s => s.setting_name === 'enable_user_override')?.setting_value || 'true';
    const th = systemSettings.find(s => s.setting_name === 'active_theme')?.setting_value || '1';
    const rName = systemSettings.find(s => s.setting_name === 'repository_name')?.setting_value || 'CORE Repository';
    const rSub = systemSettings.find(s => s.setting_name === 'repository_subtitle')?.setting_value || 'Digital Library & Archive';
    const hTitle = systemSettings.find(s => s.setting_name === 'hero_title')?.setting_value || '';
    const hDesc = systemSettings.find(s => s.setting_name === 'hero_desc')?.setting_value || '';
    const hBg = systemSettings.find(s => s.setting_name === 'hero_bg_image')?.setting_value || '';
    const rLogo = systemSettings.find(s => s.setting_name === 'repository_logo_icon')?.setting_value || 'BookOpen';
    const rLogoImg = systemSettings.find(s => s.setting_name === 'repository_logo_image')?.setting_value || '';
    const hColor = systemSettings.find(s => s.setting_name === 'hero_bg_color')?.setting_value || '#0f172a';
    const hOpacity = systemSettings.find(s => s.setting_name === 'hero_bg_opacity')?.setting_value || '10';
    const hColorOpacity = systemSettings.find(s => s.setting_name === 'hero_bg_color_opacity')?.setting_value || '100';

    setViewModeSetting(vm);
    setOverrideSetting(ov);
    setActiveThemeId(th);
    setRepositoryNameSetting(rName);
    setRepositorySubtitleSetting(rSub);
    setHeroTitleSetting(hTitle);
    setHeroDescSetting(hDesc);
    setHeroBgImageSetting(hBg);
    setRepositoryLogoIconSetting(rLogo);
    setRepositoryLogoImageSetting(rLogoImg);
    setHeroBgColorSetting(hColor);
    setHeroBgOpacitySetting(hOpacity);
    setHeroBgColorOpacitySetting(hColorOpacity);
  }, [activeTab, currentUser, systemSettings]);

  const fetchRoleCustomPermissions = async () => {
    try {
      const res = await fetch('/api/admin/roles/permissions');
      const data = await res.json();
      if (data.success && data.roleCustomPermissions) {
        setRoleCustomPermissions(data.roleCustomPermissions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setAdminUsers(data);
      fetchRoleCustomPermissions();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalyticsData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLockerData = async () => {
    try {
      const res = await fetch(`/api/favorites/${currentUser.id}`);
      const data = await res.json();
      setLockerFavorites(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateUserRole = async (targetUserId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          newRole,
          adminId: currentUser.id,
          adminUsername: currentUser.username
        })
      });
      if (res.ok) {
        fetchAdminUsers();
        fetchAuditLogs();
        alert('User role updated successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');
    setCreateUserSuccess('');
    
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUserForm.username,
          email: newUserForm.email,
          password: newUserForm.password,
          role: newUserForm.role,
          department: newUserForm.department,
          faculty: newUserForm.faculty,
          creatorId: currentUser.id,
          creatorUsername: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreateUserSuccess(`User "${newUserForm.username}" was created successfully as a ${newUserForm.role}.`);
        setNewUserForm({
          username: '',
          email: '',
          password: '',
          role: 'Student',
          department: 'Computer Science',
          faculty: 'School of ICT'
        });
        fetchAdminUsers();
        // Automatically close form after a short delay
        setTimeout(() => {
          setShowAddUserForm(false);
          setCreateUserSuccess('');
        }, 3000);
      } else {
        setCreateUserError(data.message || 'Failed to create user account.');
      }
    } catch (err) {
      setCreateUserError('Network or server error occurred while creating the user.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage('');
    setResetSuccessMessage('');
    if (!resettingUser) return;

    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: resettingUser.id,
          newPassword: newPasswordValue,
          adminId: currentUser.id,
          adminUsername: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccessMessage(`Password for user "${resettingUser.username}" was reset successfully.`);
        setNewPasswordValue('');
        setTimeout(() => {
          setResettingUser(null);
          setResetSuccessMessage('');
        }, 2500);
      } else {
        setResetErrorMessage(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setResetErrorMessage('Network or server error occurred while resetting the password.');
    }
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleUpdateUserPermissions = async (targetUserId: string, customPermissions: string[]) => {
    try {
      const res = await fetch('/api/admin/users/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          customPermissions,
          adminId: currentUser.id,
          adminUsername: currentUser.username
        })
      });
      if (res.ok) {
        fetchAdminUsers();
        fetchAuditLogs();
        setPermissionTargetUser(null);
        alert('Advanced permissions and privileges delegated successfully.');
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update custom permissions.');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating custom permissions.');
    }
  };

  const handleToggleRolePermission = (permId: string) => {
    setSelectedRolePermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleUpdateRolePermissionsDefault = async () => {
    setIsUpdatingRolePermissions(true);
    try {
      const res = await fetch('/api/admin/roles/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleName: selectedMappingRole,
          customPermissions: selectedRolePermissions,
          adminId: currentUser.id,
          adminUsername: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRoleCustomPermissions(data.roleCustomPermissions);
        fetchAuditLogs();
        alert(`Successfully saved default custom privileges for role "${selectedMappingRole}".`);
      } else {
        alert(data.message || 'Failed to update role privileges.');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating role privileges.');
    } finally {
      setIsUpdatingRolePermissions(false);
    }
  };

  const handleRolloutRolePermissionsToUsers = async () => {
    const confirmed = window.confirm(`Are you sure you want to BULK OVERWRITE and rollout these privileges to ALL users currently with the "${selectedMappingRole}" role? This action will overwrite their existing custom privileges with these defaults.`);
    if (!confirmed) return;

    setIsUpdatingRolePermissions(true);
    try {
      const res = await fetch('/api/admin/roles/permissions/rollout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleName: selectedMappingRole,
          customPermissions: selectedRolePermissions,
          adminId: currentUser.id,
          adminUsername: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Success! Successfully propagated privileges to ${data.updatedCount} users with the "${selectedMappingRole}" role.`);
        fetchAdminUsers();
        fetchAuditLogs();
      } else {
        alert(data.message || 'Failed to rollout role privileges.');
      }
    } catch (e) {
      console.error(e);
      alert('Error rolling out role privileges.');
    } finally {
      setIsUpdatingRolePermissions(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      setProfileError('Passwords do not match.');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          username: profileForm.username,
          email: profileForm.email,
          department: profileForm.department,
          faculty: profileForm.faculty,
          password: profileForm.password || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      setProfileSuccess('Profile and personal information updated successfully.');
      if (onUpdateUser) {
        onUpdateUser(data.user);
      }
      setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err: any) {
      setProfileError(err.message || 'An unexpected error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username,
          settings: [
            { setting_name: 'default_view_mode', setting_value: viewModeSetting },
            { setting_name: 'enable_user_override', setting_value: overrideSetting },
            { setting_name: 'repository_name', setting_value: repositoryNameSetting },
            { setting_name: 'repository_subtitle', setting_value: repositorySubtitleSetting },
            { setting_name: 'hero_title', setting_value: heroTitleSetting },
            { setting_name: 'hero_desc', setting_value: heroDescSetting },
            { setting_name: 'hero_bg_image', setting_value: heroBgImageSetting },
            { setting_name: 'repository_logo_icon', setting_value: repositoryLogoIconSetting },
            { setting_name: 'repository_logo_image', setting_value: repositoryLogoImageSetting },
            { setting_name: 'hero_bg_color', setting_value: heroBgColorSetting },
            { setting_name: 'hero_bg_opacity', setting_value: heroBgOpacitySetting },
            { setting_name: 'hero_bg_color_opacity', setting_value: heroBgColorOpacitySetting }
          ]
        })
      });
      if (res.ok) {
        onRefreshData();
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadDatabaseBackup = (isIncremental: boolean = false) => {
    const url = `/api/admin/backup/download?adminId=${currentUser.id}${isIncremental ? '&incremental=true' : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_backup_${isIncremental ? 'incremental' : 'full'}_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      onRefreshData();
    }, 1000);
  };

  const handleThemeChange = async (themeId: string) => {
    try {
      const res = await fetch('/api/themes/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId,
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        setActiveThemeId(themeId);
        onRefreshData();
        alert('Active system theme updated.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCustomTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customThemeName) return;
    try {
      const res = await fetch('/api/themes/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customThemeName,
          primaryColor: customPrimaryColor,
          secondaryColor: customSecondaryColor,
          isDark: false,
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        setCustomThemeName('');
        onRefreshData();
        alert('Custom Theme Created & Activated successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Drag & drop file handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAttachedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionForm.communityId || !submissionForm.collectionId) {
      alert('Please specify both Sector and Target Collection.');
      return;
    }

    if (attachedFiles.length === 0) {
      alert('Please upload/attach at least one manuscript or document file for your submission.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();

    // Append metadata
    Object.entries(submissionForm).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    formData.append('submitterId', currentUser.id);
    formData.append('submitterName', currentUser.username);
    formData.append('status', 'Submitted'); // Initial review state
    formData.append('submissionMode', submissionMode);
    formData.append('fileTitles', JSON.stringify(batchTitles));

    // Append files
    attachedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setSubmissionForm({
          title: '',
          author: currentUser.username,
          coAuthors: '',
          department: currentUser.department || '',
          faculty: currentUser.faculty || '',
          keywords: '',
          abstract: '',
          description: '',
          publicationYear: new Date().getFullYear().toString(),
          language: 'English',
          publisher: '',
          isbn: '',
          issn: '',
          doi: '',
          rightsStatement: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
          communityId: '',
          collectionId: ''
        });
        setAttachedFiles([]);
        onRefreshData();
        alert('Digital artifact submitted for review successfully.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplaceFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForReplace || !replaceFile) return;

    const formData = new FormData();
    formData.append('file', replaceFile);
    formData.append('description', replaceDesc);
    formData.append('userId', currentUser.id);
    formData.append('username', currentUser.username);

    try {
      const res = await fetch(`/api/documents/${selectedDocForReplace}/replace-file`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setSelectedDocForReplace(null);
        setReplaceFile(null);
        setReplaceDesc('');
        onRefreshData();
        alert('File replaced and document re-submitted successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommunityName) return;
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCommunityName,
          description: newCommunityDesc,
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        setNewCommunityName('');
        setNewCommunityDesc('');
        onRefreshData();
        alert('New Community sector created successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName || !selectedCommunityIdForColl) return;
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName,
          description: newCollectionDesc,
          communityId: selectedCommunityIdForColl,
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        setNewCollectionName('');
        setNewCollectionDesc('');
        setSelectedCommunityIdForColl('');
        onRefreshData();
        alert('New Collection archive created successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditCommunity = async (id: string) => {
    try {
      const res = await fetch(`/api/communities/${id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCommunityName,
          description: editCommunityDesc,
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        setEditingCommunityId(null);
        onRefreshData();
        alert('Community sector updated successfully.');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update community.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCommunity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this community sector? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/communities/${id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        onRefreshData();
        alert('Community sector deleted successfully.');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete community.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditCollection = async (id: string) => {
    try {
      const res = await fetch(`/api/collections/${id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCollectionName,
          description: editCollectionDesc,
          communityId: editCollectionCommunityId,
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        setEditingCollectionId(null);
        onRefreshData();
        alert('Archive collection updated successfully.');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update collection.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this archive collection? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/collections/${id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        onRefreshData();
        alert('Archive collection deleted successfully.');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete collection.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewDecision = async (action: 'Approved' | 'Rejected') => {
    if (!selectedDocForReview) return;
    try {
      const res = await fetch('/api/workflow/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocForReview.id,
          reviewerId: currentUser.id,
          reviewerName: currentUser.username,
          action,
          comment: reviewComment
        })
      });
      if (res.ok) {
        setSelectedDocForReview(null);
        setReviewComment('');
        onRefreshData();
        alert(`Workflow submission ${action.toUpperCase()} successfully.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportReport = (type: 'downloads' | 'audit' | 'general') => {
    window.open(`/api/reports/export?type=${type}`, '_blank');
  };

  // Helper arrays
  const reviewQueue = documents.filter(d => d.status === 'Submitted' || d.status === 'Pending Review');
  const mySubmissions = documents.filter(d => d.submitterId === currentUser.id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative w-full">
      {/* Mobile Floating / Sticky Menu trigger (only visible on small screens) */}
      <div className="md:hidden bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between mb-4 sticky top-16 z-30 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block leading-none mb-1">Control Console</span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {activeTab === 'stats' && 'System Analytics'}
              {activeTab === 'themes' && 'Theme Customizer'}
              {activeTab === 'settings' && 'System Settings'}
              {activeTab === 'audit' && 'System Audit Trail'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'structure' && 'Sectors & Archives'}
              {activeTab === 'review' && 'Review Submissions'}
              {activeTab === 'submissions' && 'Submit Scholarly Work'}
              {activeTab === 'my_list' && 'My Submissions'}
              {activeTab === 'locker' && 'My Study Locker'}
              {activeTab === 'profile' && 'Edit Profile'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 px-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer font-sans font-bold text-[11px] hover:scale-[1.02] active:scale-[0.98]"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>Console Menu</span>
        </button>
      </div>

      {/* Mobile Sidebar Navigation Drawer (backdrop & menu) */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 md:hidden transition-all animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sliding Drawer */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 z-55 md:hidden p-5 flex flex-col justify-between shadow-2xl animate-slideInLeft border-r border-gray-150 dark:border-slate-850">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="block text-[9px] font-mono text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Control Console</span>
                  <p className="text-xs text-gray-800 dark:text-gray-200 font-bold mt-0.5">{currentUser.role}</p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs list inside drawer */}
              <div className="space-y-1 overflow-y-auto max-h-[60vh] pr-1">
                {/* Admin Tabs */}
                {currentUser.role === 'Administrator' && (
                  <>
                    <button
                      onClick={() => { setActiveTab('stats'); setIsMobileMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === 'stats' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Activity className="w-4 h-4" /> System Analytics
                    </button>
                    <button
                      onClick={() => { setActiveTab('themes'); setIsMobileMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === 'themes' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Palette className="w-4 h-4" /> Theme Customizer
                    </button>
                    <button
                      onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === 'settings' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Settings className="w-4 h-4" /> System Settings
                    </button>
                    <button
                      onClick={() => { setActiveTab('audit'); setIsMobileMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === 'audit' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Database className="w-4 h-4" /> System Audit Trail
                    </button>
                  </>
                )}

                {/* Shared User Management */}
                {(currentUser.role === 'Administrator' ||
                  currentUser.role === 'Repository Manager' ||
                  currentUser.role === 'Librarian / Moderator' ||
                  currentUser.role === 'Librarian') && (
                  <button
                    onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === 'users' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Shield className="w-4 h-4" /> User Management
                  </button>
                )}

                {/* Manager & Librarian Tabs */}
                {(currentUser.role === 'Repository Manager' || currentUser.role === 'Administrator') && (
                  <button
                    onClick={() => { setActiveTab('structure'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === 'structure' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Database className="w-4 h-4" /> Manage Sectors & Archives
                  </button>
                )}

                {(currentUser.role === 'Repository Manager' || currentUser.role === 'Administrator' || currentUser.role === 'Librarian') && (
                  <button
                    onClick={() => { setActiveTab('review'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer relative ${
                      activeTab === 'review' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Review Submissions Queue</span>
                    {reviewQueue.length > 0 && (
                      <span className="absolute right-3.5 top-2.5 bg-red-500 text-white font-sans text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        {reviewQueue.length}
                      </span>
                    )}
                  </button>
                )}

                {/* Researcher & Staff Tabs */}
                {(currentUser.role === 'Staff / Researcher' || 
                  currentUser.role === 'Administrator' || 
                  (currentUser.customPermissions && currentUser.customPermissions.includes('SUBMISSION'))) && (
                  <>
                    <button
                      onClick={() => { setActiveTab('submissions'); setIsMobileMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === 'submissions' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <FileUp className="w-4 h-4" /> Submit Scholarly Work
                    </button>
                    <button
                      onClick={() => { setActiveTab('my_list'); setIsMobileMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                        activeTab === 'my_list' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <FileCheck className="w-4 h-4" /> My Submissions
                    </button>
                  </>
                )}

                {/* Student Tabs */}
                <button
                  onClick={() => { setActiveTab('locker'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'locker' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Shield className="w-4 h-4" /> My Study Locker
                </button>

                <button
                  onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'profile' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <UserRound className="w-4 h-4" /> Edit Profile & Password
                </button>
              </div>
            </div>

            {/* Quick Login Ingress in Mobile Drawer */}
            {(currentUser.role === 'Administrator' || localStorage.getItem('was_admin') === 'true') && onQuickLogin && (
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                <span className="block text-[10px] font-mono text-orange-700 dark:text-orange-500 font-bold uppercase tracking-wider">Admin Quick Test Switcher</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Admin', email: 'admin@institution.edu', pass: 'admin123' },
                    { label: 'Manager', email: 'manager@institution.edu', pass: 'manager123' },
                    { label: 'Librarian', email: 'librarian@institution.edu', pass: 'librarian123' },
                    { label: 'Researcher', email: 'researcher@institution.edu', pass: 'researcher123' },
                    { label: 'Student', email: 'student@institution.edu', pass: 'student123' }
                  ].map((cred) => (
                    <button
                      key={cred.label}
                      onClick={() => { onQuickLogin(cred.email, cred.pass); setIsMobileMenuOpen(false); }}
                      className={`px-2 py-1 border text-[10px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
                        currentUser.email === cred.email
                          ? 'bg-orange-500 text-white border-orange-600'
                          : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-755 border-gray-150 dark:border-slate-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {cred.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Desktop Sticky Left Navigation Rail (col-span-4 on md, col-span-3 on lg) */}
      <div className="hidden md:block md:col-span-4 lg:col-span-3 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2 sticky top-24 self-start">
        <div className="px-3 py-2 border-b border-gray-50 dark:border-slate-800">
          <span className="block text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Control Console</span>
          <p className="text-xs text-gray-500 font-sans mt-0.5">{currentUser.role}</p>
        </div>

        <div className="space-y-1 pt-2">
          {/* Admin Tabs */}
          {currentUser.role === 'Administrator' && (
            <>
              <button
                onClick={() => setActiveTab('stats')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'stats' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Activity className="w-4 h-4" /> System Analytics
              </button>
              <button
                onClick={() => setActiveTab('themes')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'themes' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Palette className="w-4 h-4" /> Theme Customizer
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'settings' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-4 h-4" /> System Settings
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'audit' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Database className="w-4 h-4" /> System Audit Trail
              </button>
            </>
          )}

          {/* Shared User Management for Admin, Repository Manager, Librarian / Moderator */}
          {(currentUser.role === 'Administrator' ||
            currentUser.role === 'Repository Manager' ||
            currentUser.role === 'Librarian / Moderator' ||
            currentUser.role === 'Librarian') && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'users' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-4 h-4" /> User Management
            </button>
          )}

          {/* Manager & Librarian Tabs */}
          {(currentUser.role === 'Repository Manager' || currentUser.role === 'Administrator') && (
            <button
              onClick={() => setActiveTab('structure')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'structure' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Database className="w-4 h-4" /> Manage Sectors & Archives
            </button>
          )}

          {(currentUser.role === 'Repository Manager' || currentUser.role === 'Administrator' || currentUser.role === 'Librarian') && (
            <button
              onClick={() => setActiveTab('review')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer relative ${
                activeTab === 'review' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileCheck className="w-4.5 h-4.5" />
              <span>Review Submissions Queue</span>
              {reviewQueue.length > 0 && (
                <span className="absolute right-3.5 top-2.5 bg-red-500 text-white font-sans text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {reviewQueue.length}
                </span>
              )}
            </button>
          )}

          {/* Researcher & Staff Tabs */}
          {(currentUser.role === 'Staff / Researcher' || 
            currentUser.role === 'Administrator' || 
            (currentUser.customPermissions && currentUser.customPermissions.includes('SUBMISSION'))) && (
            <>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'submissions' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileUp className="w-4 h-4" /> Submit Scholarly Work
              </button>
              <button
                onClick={() => setActiveTab('my_list')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'my_list' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileCheck className="w-4 h-4" /> My Submissions
              </button>
            </>
          )}

          {/* Student Tabs */}
          <button
            onClick={() => setActiveTab('locker')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'locker' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-4 h-4" /> My Study Locker
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'profile' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <UserRound className="w-4 h-4" /> Edit Profile & Password
          </button>
        </div>

        {(currentUser.role === 'Administrator' || localStorage.getItem('was_admin') === 'true') && onQuickLogin && (
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
            <span className="block text-[10px] font-mono text-orange-700 dark:text-orange-500 font-bold uppercase tracking-wider">Admin Quick Test Switcher</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Admin', email: 'admin@institution.edu', pass: 'admin123' },
                { label: 'Manager', email: 'manager@institution.edu', pass: 'manager123' },
                { label: 'Librarian', email: 'librarian@institution.edu', pass: 'librarian123' },
                { label: 'Researcher', email: 'researcher@institution.edu', pass: 'researcher123' },
                { label: 'Student', email: 'student@institution.edu', pass: 'student123' }
              ].map((cred) => (
                <button
                  key={cred.label}
                  onClick={() => onQuickLogin(cred.email, cred.pass)}
                  className={`px-2 py-1.5 border text-[10px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
                    currentUser.email === cred.email
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-755 border-gray-150 dark:border-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {cred.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Dashboard Body (col-span-8 on md, col-span-9 on lg) */}
      <div className="col-span-1 md:col-span-8 lg:col-span-9 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* TAB CONTENT: System Stats */}
        {activeTab === 'stats' && analyticsData && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">Institutional Repository Metrics</h2>
              <p className="text-xs text-gray-500 font-sans">Overview of archive collections growth and download distributions.</p>
            </div>

            {/* Quick Summary Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl">
                <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">System Publications</span>
                <span className="font-sans font-bold text-2xl text-gray-950 mt-1 block">{analyticsData.totalDocuments}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl">
                <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Total Downloads</span>
                <span className="font-sans font-bold text-2xl text-gray-950 mt-1 block">{analyticsData.totalDownloads}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl">
                <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Repository Views</span>
                <span className="font-sans font-bold text-2xl text-gray-950 mt-1 block">{analyticsData.totalViews}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl">
                <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Active Registrations</span>
                <span className="font-sans font-bold text-2xl text-gray-950 mt-1 block">{analyticsData.activeUsers}</span>
              </div>
            </div>

            {/* Excel / CSV Exporter Buttons */}
            <div className="p-4 bg-orange-500/5 rounded-xl border border-orange-500/10 flex flex-wrap gap-3 items-center justify-between">
              <div>
                <span className="font-sans font-bold text-xs text-gray-950">Curator Export Services</span>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">Export logs and monthly growth parameters as Excel-compatible spreadsheets.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportReport('general')}
                  className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-150 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> General Report (CSV)
                </button>
                <button
                  onClick={() => handleExportReport('downloads')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Downloads Audit
                </button>
              </div>
            </div>

            {/* Popular Publications lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-100 rounded-xl p-5 space-y-3">
                <h3 className="font-sans font-semibold text-sm text-gray-950">Most Downloaded Academic Assets</h3>
                <div className="divide-y divide-gray-50">
                  {analyticsData.popularDocuments.map((doc: any, i: number) => (
                    <div key={doc.id} className="py-2.5 flex justify-between items-center text-xs">
                      <span className="font-sans font-medium text-gray-700 truncate max-w-[200px] hover:text-orange-600 cursor-pointer" onClick={() => onSelectDocument(doc.id)}>{doc.title}</span>
                      <span className="font-mono bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full font-bold">{doc.downloads} dls</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl p-5 space-y-3">
                <h3 className="font-sans font-semibold text-sm text-gray-950">Most Viewed Publications</h3>
                <div className="divide-y divide-gray-50">
                  {analyticsData.viewedDocuments.map((doc: any, i: number) => (
                    <div key={doc.id} className="py-2.5 flex justify-between items-center text-xs">
                      <span className="font-sans font-medium text-gray-700 truncate max-w-[200px] hover:text-green-700 cursor-pointer" onClick={() => onSelectDocument(doc.id)}>{doc.title}</span>
                      <span className="font-mono bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-bold">{doc.views} views</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: User Role Management (RBAC) */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            {/* PASSWORD RESET MODAL */}
            {resettingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white border border-gray-150 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slideUp">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                      <div className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-orange-600" />
                        <div>
                          <h3 className="font-sans font-bold text-sm text-gray-950">Reset User Password</h3>
                          <p className="text-[10px] text-gray-400 font-sans">Authorized operation for Administrator & Repository Manager</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setResettingUser(null)}
                        className="text-gray-400 hover:text-gray-600 font-mono text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-xs text-gray-500 font-sans">
                        Target Account: <strong className="text-gray-900 font-bold">{resettingUser.username}</strong>
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">
                        Email: {resettingUser.email}
                      </div>
                    </div>

                    {resetErrorMessage && (
                      <div className="p-3 bg-red-50 border border-red-150 text-red-600 text-xs font-sans rounded-xl">
                        {resetErrorMessage}
                      </div>
                    )}

                    {resetSuccessMessage && (
                      <div className="p-3 bg-green-50 border border-green-150 text-green-700 text-xs font-sans rounded-xl">
                        {resetSuccessMessage}
                      </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">New Password</label>
                        <input
                          type="password"
                          required
                          placeholder="Enter strong secure password"
                          value={newPasswordValue}
                          onChange={(e) => setNewPasswordValue(e.target.value)}
                          className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setResettingUser(null)}
                          className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-xs text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-white rounded-xl font-semibold text-xs shadow-md transition-colors cursor-pointer"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Confirm Reset
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ADVANCED DELEGATION MODAL */}
            {permissionTargetUser && (() => {
              const allPrivilegesList = [
                {
                  id: 'SUBMISSION',
                  title: '📄 Create & Submit Manuscripts',
                  desc: 'Grants the explicit ability to create, edit, and submit new scholarly publications and research papers to the repository.'
                },
                {
                  id: 'BYPASS_CURATION',
                  title: '⚡ Bypass Curation Checkpoint',
                  desc: 'Allow immediate publishing and indexing of submitted papers directly into the archive without requiring librarian or manager workflow reviews.'
                },
                {
                  id: 'DESTROY_ARCHIVE',
                  title: '💀 Hard Destructive Purge',
                  desc: 'Grants raw power to permanently delete metadata records and physical PDF files from storage, completely bypassing archive retention rules.'
                },
                {
                  id: 'EXPORT_SECURE_REPORTS',
                  title: '📊 Export Secure Audits & Raw Backups',
                  desc: 'Grants access to run high-security analytics, export full user audit traces, and download unredacted server JSON databases.'
                },
                {
                  id: 'SYSTEM_CREDENTIALS',
                  title: '⚙️ Modify System-Wide Configurations',
                  desc: 'Grants access to edit institutional taxonomy schemas, override Dublin Core standards, and modify workspace settings.'
                },
                {
                  id: 'ROOT_SUPERUSER',
                  title: '👑 Root Superuser Override Access',
                  desc: 'Elevate this user to an unrestricted root status. Allows simulating all system roles and exercising administrative dominance.'
                }
              ];

              const allocatedList = allPrivilegesList.filter(p => selectedPermissions.includes(p.id));
              const unallocatedList = allPrivilegesList.filter(p => !selectedPermissions.includes(p.id));

              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white border border-gray-150 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-slideUp">
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-amber-600 animate-pulse" />
                          <div>
                            <h3 className="font-sans font-bold text-sm text-gray-950">Security Clearance & Rights Diagnostics</h3>
                            <p className="text-[10px] text-gray-400 font-sans">Check what rights this user has and allocate or revoke them on the fly</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setPermissionTargetUser(null)}
                          className="text-gray-400 hover:text-gray-600 font-mono text-sm cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-1.5 bg-amber-50/40 p-4 rounded-xl border border-amber-100 text-xs">
                        <div className="text-gray-700 font-sans">
                          Target Subject: <strong className="text-gray-950 font-bold">{permissionTargetUser.username}</strong>
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 flex gap-2">
                          <span>Role: {permissionTargetUser.role}</span>
                          <span>•</span>
                          <span>Email: {permissionTargetUser.email}</span>
                        </div>
                        <p className="text-[10px] text-amber-800 leading-relaxed font-sans mt-2 italic bg-white p-2 rounded-lg border border-amber-200/50">
                          Warning: Granting elevated custom rights bypasses standard Role-Based Access Controls (RBAC). Actions are permanently logged in the audit trail.
                        </p>
                      </div>

                      {/* Quick Auto-Allocate Options */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 gap-2">
                        <span className="text-[10px] text-gray-500 font-sans font-semibold">Clearance Quick Actions:</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const roleDef = roleCustomPermissions.find(r => r.roleName === permissionTargetUser.role)?.customPermissions || [];
                              setSelectedPermissions(roleDef);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Reset to Role Default
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPermissions(['BYPASS_CURATION', 'DESTROY_ARCHIVE', 'EXPORT_SECURE_REPORTS', 'SYSTEM_CREDENTIALS', 'ROOT_SUPERUSER'])}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-950 text-white text-[9px] font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Grant All (Superuser)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPermissions([])}
                            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-150 text-[9px] font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Revoke All
                          </button>
                        </div>
                      </div>

                      {/* Diagnostic Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ALLOCATED RIGHTS */}
                        <div className="border border-green-100 bg-green-50/10 p-3.5 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between border-b border-green-100 pb-1.5">
                            <span className="font-sans font-bold text-[10px] text-green-700 uppercase tracking-wider flex items-center gap-1">
                              🟢 Allocated Rights ({allocatedList.length})
                            </span>
                            <span className="text-[8px] text-green-600 font-mono font-bold bg-green-100/50 px-1.5 py-0.5 rounded">Active</span>
                          </div>
                          {allocatedList.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic py-6 text-center">No custom privileges allocated to this user.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                              {allocatedList.map(perm => (
                                <div
                                  key={perm.id}
                                  onClick={() => handleTogglePermission(perm.id)}
                                  className="p-2 bg-white border border-green-200/60 rounded-lg hover:border-red-300 hover:bg-red-50/30 transition-all cursor-pointer flex items-start gap-2 text-left group"
                                  title="Click to revoke this right"
                                >
                                  <span className="text-green-600 font-bold mt-0.5 text-xs group-hover:hidden">✓</span>
                                  <span className="text-red-500 font-bold mt-0.5 text-xs hidden group-hover:inline">✕</span>
                                  <div className="flex-1">
                                    <span className="font-sans font-bold text-[10px] text-gray-800 block leading-tight">{perm.title}</span>
                                    <span className="text-[9px] text-gray-500 font-sans block leading-snug mt-0.5">{perm.desc}</span>
                                    <span className="text-[8px] font-mono font-bold text-red-500 hidden group-hover:block mt-1">➔ Click to Revoke Right</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* UNALLOCATED / DENIED RIGHTS */}
                        <div className="border border-gray-200 bg-gray-50/30 p-3.5 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                            <span className="font-sans font-bold text-[10px] text-gray-600 uppercase tracking-wider flex items-center gap-1">
                              🔴 Denied / Unallocated ({unallocatedList.length})
                            </span>
                            <span className="text-[8px] text-gray-400 font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded">Restricted</span>
                          </div>
                          {unallocatedList.length === 0 ? (
                            <p className="text-[10px] text-green-700 font-semibold py-6 text-center">Fully Permitted! No unallocated rights.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                              {unallocatedList.map(perm => (
                                <div
                                  key={perm.id}
                                  onClick={() => handleTogglePermission(perm.id)}
                                  className="p-2 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/30 transition-all cursor-pointer flex items-start gap-2 text-left group"
                                  title="Click to allocate this right"
                                >
                                  <span className="text-gray-400 font-bold mt-0.5 text-xs group-hover:hidden">🔒</span>
                                  <span className="text-green-600 font-bold mt-0.5 text-xs hidden group-hover:inline">+</span>
                                  <div className="flex-1">
                                    <span className="font-sans font-bold text-[10px] text-gray-800 block leading-tight">{perm.title}</span>
                                    <span className="text-[9px] text-gray-500 font-sans block leading-snug mt-0.5">{perm.desc}</span>
                                    <span className="text-[8px] font-mono font-bold text-green-600 hidden group-hover:block mt-1">➔ Click to Allocate Right</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setPermissionTargetUser(null)}
                          className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-xs text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateUserPermissions(permissionTargetUser.id, selectedPermissions)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-semibold text-xs shadow-md transition-colors cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-sans font-bold text-lg text-gray-950">User Management & Role Configuration</h2>
                <p className="text-xs text-gray-500 font-sans">Manage institutional roles, default privileges, and register new accounts.</p>
              </div>
              {userManagementSubTab === 'users' && (
                <button
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer self-start sm:self-auto hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="w-4 h-4" />
                  {showAddUserForm ? 'Hide Form' : 'Register New User'}
                </button>
              )}
            </div>

            {/* USER MANAGEMENT SUB-TABS */}
            <div className="flex border-b border-gray-150 mb-4 gap-2">
              <button
                onClick={() => setUserManagementSubTab('users')}
                className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  userManagementSubTab === 'users'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                👥 User Accounts ({adminUsers.length})
              </button>
              <button
                onClick={() => setUserManagementSubTab('roles')}
                className={`pb-2 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  userManagementSubTab === 'roles'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🛡️ Role-Level Default Privileges
              </button>
            </div>

            {userManagementSubTab === 'users' ? (
              <div className="space-y-6">

            {showAddUserForm && (
              <form onSubmit={handleCreateUser} className="bg-gray-50 border border-gray-150 p-6 rounded-2xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <span className="font-sans font-bold text-sm text-gray-950">Add Institutional User Account</span>
                  <button
                    type="button"
                    onClick={() => setShowAddUserForm(false)}
                    className="text-gray-400 hover:text-gray-600 font-mono text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {createUserError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-sans rounded-xl">
                    {createUserError}
                  </div>
                )}

                {createUserSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs font-sans rounded-xl">
                    {createUserSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
                  {/* Username */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Account Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. evelyn_carter"
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. user@institution.edu"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Secure Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  {/* Role Select */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Assigned Role</label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs cursor-pointer text-slate-800"
                    >
                      <option value="Student">Student</option>
                      <option value="Staff / Researcher">Staff / Researcher</option>
                      <option value="Librarian / Moderator">Librarian / Moderator</option>
                      <option value="Repository Manager">Repository Manager</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Sector (Department)</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={newUserForm.department}
                      onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  {/* Faculty */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">School (Faculty)</label>
                    <input
                      type="text"
                      placeholder="e.g. School of ICT"
                      value={newUserForm.faculty}
                      onChange={(e) => setNewUserForm({ ...newUserForm, faculty: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUserForm(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-xs text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-semibold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Save User Account
                  </button>
                </div>
              </form>
            )}

            <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Account / Email</th>
                    <th className="px-6 py-3.5">Assigned Sector</th>
                    <th className="px-6 py-3.5">Assigned Role</th>
                    <th className="px-6 py-3.5">Last Login</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-gray-900 block">{user.username}</span>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{user.email}</span>
                          {user.customPermissions && user.customPermissions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {user.customPermissions.map(perm => {
                                let label = '';
                                if (perm === 'SUBMISSION') label = '📄 Submit Manuscripts';
                                if (perm === 'BYPASS_CURATION') label = '⚡ Auto-Publish';
                                if (perm === 'DESTROY_ARCHIVE') label = '💀 Hard Delete';
                                if (perm === 'EXPORT_SECURE_REPORTS') label = '📊 Backup/Audits';
                                if (perm === 'SYSTEM_CREDENTIALS') label = '⚙️ SysConfig';
                                if (perm === 'ROOT_SUPERUSER') label = '👑 Root Override';
                                return (
                                  <span key={perm} className="inline-flex items-center text-[8px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200/60 rounded px-1.5 py-0.2 tracking-tight uppercase">
                                    {label || perm}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{user.department || 'All Sectors'}</td>
                      <td className="px-6 py-4 font-mono font-bold text-[10px]">
                        <span className="bg-slate-100 px-2.5 py-1 rounded text-slate-700 uppercase">{user.role}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-gray-500 whitespace-nowrap">
                        {user.lastLogin ? (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md block w-fit">
                            {new Date(user.lastLogin).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic font-sans">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {(currentUser.role === 'Administrator' || currentUser.role === 'Repository Manager') && (
                            <button
                              onClick={() => {
                                setResettingUser(user);
                                setNewPasswordValue('');
                                setResetSuccessMessage('');
                                setResetErrorMessage('');
                              }}
                              title="Reset User Password"
                              className="p-1.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-gray-500 transition-colors cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {currentUser.role === 'Administrator' && (
                            <button
                              onClick={() => {
                                setPermissionTargetUser(user);
                                setSelectedPermissions(user.customPermissions || []);
                              }}
                              title="Delegate Advanced Permissions & Rights"
                              className="p-1.5 bg-gray-100 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-gray-500 transition-colors cursor-pointer flex items-center justify-center"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                            className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-sans font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                          >
                            <option value="Student">Student</option>
                            <option value="Staff / Researcher">Staff / Researcher</option>
                            <option value="Librarian / Moderator">Librarian / Moderator</option>
                            <option value="Repository Manager">Repository Manager</option>
                            <option value="Administrator">Administrator</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ROLE PRIVILEGES EDITOR PANEL */
          <div className="bg-slate-50 border border-gray-150 p-6 rounded-2xl space-y-6 animate-fadeIn">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-sans font-bold text-sm text-gray-950 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                Role-Level Security Clearance & Privilege Mapping
              </h3>
              <p className="text-[11px] text-gray-500 font-sans mt-1">
                Configure default custom permissions that apply automatically to entire institutional roles. You can also mass rollout these configurations to all current users assigned to the selected role.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Select Role Column */}
              <div className="space-y-3">
                <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Select Institutional Role</label>
                <div className="space-y-2">
                  {[
                    { name: 'Student', desc: 'Default student view access' },
                    { name: 'Staff / Researcher', desc: 'Self-submit & document management' },
                    { name: 'Librarian', desc: 'Curation reviews & metadata audits' },
                    { name: 'Repository Manager', desc: 'Structure, settings, collections configuration' },
                    { name: 'Administrator', desc: 'Full institutional sovereignty & settings overrides' }
                  ].map((role) => (
                    <div
                      key={role.name}
                      onClick={() => setSelectedMappingRole(role.name === 'Librarian / Moderator' ? 'Librarian' : role.name)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        (selectedMappingRole === role.name || (selectedMappingRole === 'Librarian' && role.name === 'Librarian / Moderator'))
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                          : 'bg-white border-gray-150 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-sans font-bold text-xs block">{role.name}</span>
                      <span className={`text-[10px] block mt-0.5 leading-snug ${
                        (selectedMappingRole === role.name || (selectedMappingRole === 'Librarian' && role.name === 'Librarian / Moderator')) ? 'text-gray-300' : 'text-gray-400'
                      }`}>
                        {role.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privilege checklist (Spans 2 columns) */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">
                    Configure Custom Default Privileges for "{selectedMappingRole}"
                  </label>
                  <span className="text-[9px] bg-slate-200 text-slate-800 font-mono font-bold px-2 py-0.5 rounded uppercase">
                    {selectedRolePermissions.length} Privileges Active
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      id: 'SUBMISSION',
                      title: '📄 Create & Submit Manuscripts',
                      desc: 'Grants the explicit ability to create, edit, and submit new scholarly publications and research papers to the repository.'
                    },
                    {
                      id: 'BYPASS_CURATION',
                      title: '⚡ Bypass Curation Checkpoint',
                      desc: 'Allow immediate publishing and indexing of submitted papers directly into the archive without requiring reviews.'
                    },
                    {
                      id: 'DESTROY_ARCHIVE',
                      title: '💀 Hard Destructive Purge',
                      desc: 'Grants raw power to permanently delete metadata records and physical PDF files from storage.'
                    },
                    {
                      id: 'EXPORT_SECURE_REPORTS',
                      title: '📊 Export Secure Audits & Raw Backups',
                      desc: 'Grants access to run high-security analytics, export full user audit traces, and download raw databases.'
                    },
                    {
                      id: 'SYSTEM_CREDENTIALS',
                      title: '⚙️ Modify System-Wide Configurations',
                      desc: 'Grants access to edit institutional schemas, override Dublin Core metadata standards, and modify system settings.'
                    },
                    {
                      id: 'ROOT_SUPERUSER',
                      title: '👑 Root Superuser Override Access',
                      desc: 'Elevate this user to an unrestricted root status. Allows simulating all system roles and exercising absolute governance.'
                    }
                  ].map((perm) => (
                    <div
                      key={perm.id}
                      onClick={() => handleToggleRolePermission(perm.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 text-left items-start ${
                        selectedRolePermissions.includes(perm.id)
                          ? 'bg-amber-500/5 border-amber-300/80 shadow-sm'
                          : 'bg-white border-gray-150 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRolePermissions.includes(perm.id)}
                        onChange={() => {}} // parent handle click
                        className="mt-0.5 rounded text-slate-900 focus:ring-slate-800 accent-slate-900 cursor-pointer h-3.5 w-3.5"
                      />
                      <div>
                        <span className="font-sans font-bold text-xs text-slate-900 block">{perm.title}</span>
                        <span className="text-[10px] text-gray-500 font-sans leading-relaxed block mt-0.5">{perm.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={handleUpdateRolePermissionsDefault}
                    disabled={isUpdatingRolePermissions}
                    className="px-4 py-2 border border-gray-300 hover:border-slate-400 rounded-xl font-semibold text-xs text-gray-700 bg-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    Save Default Mapping Only
                  </button>
                  <button
                    onClick={handleRolloutRolePermissionsToUsers}
                    disabled={isUpdatingRolePermissions}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isUpdatingRolePermissions ? 'Updating...' : `Save & Bulk Rollout to All ${selectedMappingRole} Users`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

        {/* TAB CONTENT: Themes Switcher */}
        {activeTab === 'themes' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">Active Theme Configuration</h2>
              <p className="text-xs text-gray-500 font-sans">Modify the application branding instantly using presets or hex values.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Presets */}
              <div className="space-y-4">
                <h3 className="font-sans font-semibold text-sm text-gray-950">Choose Visual Theme Preset</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allThemes.map((theme) => {
                    const isActive = activeThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`p-4 border rounded-xl flex flex-col text-left justify-between h-28 cursor-pointer relative overflow-hidden transition-all duration-300 ${
                          isActive
                            ? 'border-gray-900 shadow-md ring-1 ring-gray-900'
                            : 'border-gray-150 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <span className="font-sans font-bold text-xs text-gray-900 block">{theme.name}</span>
                          <span className="font-mono text-[9px] text-gray-400 mt-1 block">
                            {theme.isDark ? 'Dark Theme' : 'Light Theme'}
                          </span>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          <span className="w-5 h-5 rounded-full border border-gray-100" style={{ backgroundColor: theme.primaryColor }}></span>
                          <span className="w-5 h-5 rounded-full border border-gray-100" style={{ backgroundColor: theme.secondaryColor }}></span>
                        </div>
                        {isActive && (
                          <div className="absolute right-2 top-2 p-1 bg-gray-900 text-white rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex creation */}
              <form onSubmit={handleCreateCustomTheme} className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-4">
                <h3 className="font-sans font-semibold text-sm text-gray-950">Generate Custom Institution Colors</h3>
                
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-gray-400 font-bold uppercase">Theme Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Faculty of Health Colors"
                    value={customThemeName}
                    onChange={(e) => setCustomThemeName(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-gray-400 font-bold uppercase">Primary Hex</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customPrimaryColor}
                        onChange={(e) => setCustomPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customPrimaryColor}
                        onChange={(e) => setCustomPrimaryColor(e.target.value)}
                        className="w-full border border-gray-200 px-2 py-1 rounded text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-gray-400 font-bold uppercase">Secondary Hex</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customSecondaryColor}
                        onChange={(e) => setCustomSecondaryColor(e.target.value)}
                        className="w-8 h-8 rounded border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customSecondaryColor}
                        onChange={(e) => setCustomSecondaryColor(e.target.value)}
                        className="w-full border border-gray-200 px-2 py-1 rounded text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Palette className="w-4 h-4" /> Save Custom Theme
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB CONTENT: System Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">Administrative Control Panel</h2>
              <p className="text-xs text-gray-500 font-sans">Set defaults for catalog layouts, maximum file sizes, and metadata workflows.</p>
            </div>

            {settingsSuccess && (
              <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3.5 flex items-center gap-2 text-emerald-800 text-xs font-sans animate-fadeIn">
                <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>Site customization and configurations have been successfully saved and applied.</span>
              </div>
            )}

            <form onSubmit={handleUpdateSettings} className="space-y-6">
              {/* Section 1: Catalog & Layout Behavior */}
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-950 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-slate-500" /> Layout & Behavior Config
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold font-sans text-gray-900">Default Catalog View Mode</label>
                    <p className="text-[10px] text-gray-400 font-sans">Sets the fallback visual representation for anonymous searches.</p>
                    <select
                      value={viewModeSetting}
                      onChange={(e) => setViewModeSetting(e.target.value)}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-slate-500 cursor-pointer"
                    >
                      <option value="grid">Grid View (Bento Card Grid)</option>
                      <option value="list">List View (OAI-PMH Table List)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold font-sans text-gray-900">Allow User View Override</label>
                    <p className="text-[10px] text-gray-400 font-sans">Permit active users to toggle card/list layouts dynamically.</p>
                    <select
                      value={overrideSetting}
                      onChange={(e) => setOverrideSetting(e.target.value)}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-slate-500 cursor-pointer"
                    >
                      <option value="true">Enable Override (Recommended)</option>
                      <option value="false">Disable Override (Enforced Default)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Site Identity & Customization */}
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-950 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <Palette className="w-4.5 h-4.5 text-slate-500" /> Brand Identity & Logo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold font-sans text-gray-900">Repository Brand Name</label>
                    <p className="text-[10px] text-gray-400 font-sans">The main title of your repository shown in the header/footer.</p>
                    <input
                      type="text"
                      value={repositoryNameSetting}
                      onChange={(e) => setRepositoryNameSetting(e.target.value)}
                      placeholder="e.g. CORE Repository"
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold font-sans text-gray-900">Repository Subtitle / Tagline</label>
                    <p className="text-[10px] text-gray-400 font-sans">A short tagline displayed just underneath the repository brand name.</p>
                    <input
                      type="text"
                      value={repositorySubtitleSetting}
                      onChange={(e) => setRepositorySubtitleSetting(e.target.value)}
                      placeholder="e.g. Digital Library & Archive"
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold font-sans text-gray-900">Repository Logo Emblem Icon</label>
                    <p className="text-[10px] text-gray-400 font-sans">Pick an icon that matches your institution's theme.</p>
                    <select
                      value={repositoryLogoIconSetting}
                      onChange={(e) => setRepositoryLogoIconSetting(e.target.value)}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-slate-500 cursor-pointer"
                    >
                      <option value="BookOpen">📖 Book Open</option>
                      <option value="Library">🏛️ Library / Pantheon</option>
                      <option value="GraduationCap">🎓 Graduation Cap</option>
                      <option value="Archive">📁 Archive Box</option>
                      <option value="Award">🏆 Award Badge</option>
                      <option value="Globe">🌐 Global Network</option>
                      <option value="Bookmark">🔖 Bookmark</option>
                      <option value="FileText">📄 File Document</option>
                      <option value="Database">🗄️ Relational Database</option>
                      <option value="School">🏫 Academic School</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <label className="block text-xs font-bold font-sans text-gray-900">Custom Brand Logo Image</label>
                  <p className="text-[10px] text-gray-400 font-sans">Configure a custom logo image to display in the header instead of the icon + text. You can either paste an image URL or upload an image file from your device.</p>
                  
                  {repositoryLogoImageSetting && (
                    <div className="flex items-center gap-4 bg-gray-50 border border-gray-150 p-3 rounded-xl w-fit">
                      <div className="bg-white p-1 rounded-lg border border-gray-100 flex items-center justify-center">
                        <img src={repositoryLogoImageSetting} alt="Custom Logo Preview" className="h-8 max-w-[120px] object-contain" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-gray-700">Active Logo Image</span>
                        <span className="text-[9px] text-gray-400 font-mono truncate max-w-[200px]">{repositoryLogoImageSetting}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRepositoryLogoImageSetting('')}
                        className="text-[10px] text-red-600 hover:text-red-700 font-semibold ml-2 hover:underline cursor-pointer"
                      >
                        Remove Logo
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Option 1: URL Input */}
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-150 space-y-1.5">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Option A: Image URL</span>
                      <input
                        type="text"
                        value={repositoryLogoImageSetting}
                        onChange={(e) => setRepositoryLogoImageSetting(e.target.value)}
                        placeholder="e.g. https://example.com/logo.png or /uploads/custom_logo.png"
                        className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:border-slate-500"
                      />
                    </div>

                    {/* Option 2: Upload Input */}
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-150 space-y-1.5 flex flex-col justify-between">
                      <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Option B: Upload File</span>
                        <label className="mt-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg py-2.5 px-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer gap-2 text-xs text-gray-600 hover:text-gray-900">
                          <FileUp className="w-4 h-4 text-gray-400" />
                          <span>{logoUploading ? 'Uploading...' : 'Choose image...'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLogoUpload} 
                            disabled={logoUploading} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                      {logoUploadError && (
                        <p className="text-[10px] text-red-500 font-medium mt-1">{logoUploadError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Hero Banner Customizer */}
              <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-950 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-slate-500" /> Hero Section Customization
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold font-sans text-gray-900">Hero Main Title (HTML/JSX permitted)</label>
                    <p className="text-[10px] text-gray-400 font-sans">The primary large headline displayed on the homepage.</p>
                    <input
                      type="text"
                      value={heroTitleSetting}
                      onChange={(e) => setHeroTitleSetting(e.target.value)}
                      placeholder="Leave empty to use default"
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold font-sans text-gray-900">Hero Description Paragraph</label>
                    <p className="text-[10px] text-gray-400 font-sans">The body copy underneath the main title.</p>
                    <textarea
                      rows={3}
                      value={heroDescSetting}
                      onChange={(e) => setHeroDescSetting(e.target.value)}
                      placeholder="Leave empty to use default"
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-slate-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                    {/* Left Column: Background Color Controls */}
                    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-gray-150">
                      <h4 className="text-xs font-bold font-sans text-gray-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                        Hero Background Color
                      </h4>
                      
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold font-sans text-gray-700">Solid Base Color</label>
                        <p className="text-[10px] text-gray-400 font-sans">The custom solid background color beneath the image layer.</p>
                        <div className="flex gap-2.5 items-center">
                          <input
                            type="color"
                            value={heroBgColorSetting}
                            onChange={(e) => setHeroBgColorSetting(e.target.value)}
                            className="h-10 w-14 border border-gray-200 rounded-xl cursor-pointer p-1.5 bg-white shadow-sm flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={heroBgColorSetting}
                            onChange={(e) => setHeroBgColorSetting(e.target.value)}
                            placeholder="e.g. #0f172a"
                            className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-slate-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="block text-xs font-semibold font-sans text-gray-700">Color Overlay Opacity ({heroBgColorOpacitySetting}%)</label>
                        <p className="text-[10px] text-gray-400 font-sans font-medium">Control the opacity/strength of the solid color layer (0% to 100%).</p>
                        <div className="flex items-center gap-4 pt-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={heroBgColorOpacitySetting}
                            onChange={(e) => setHeroBgColorOpacitySetting(e.target.value)}
                            className="flex-grow h-2 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-slate-900"
                          />
                          <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 w-12 text-center">
                            {heroBgColorOpacitySetting}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Background Image Controls */}
                    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-gray-150">
                      <h4 className="text-xs font-bold font-sans text-gray-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                        Hero Background Image
                      </h4>

                      {heroBgImageSetting && (
                        <div className="flex items-center gap-3 bg-white border border-gray-150 p-2.5 rounded-xl">
                          <div className="bg-gray-100 p-0.5 rounded-lg border border-gray-150 flex items-center justify-center overflow-hidden w-12 h-10">
                            <img src={heroBgImageSetting} alt="Hero Banner Preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <span className="block text-[9px] font-bold text-gray-700">Active Banner Image</span>
                            <span className="block text-[8px] text-gray-400 font-mono truncate max-w-[120px]">{heroBgImageSetting}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHeroBgImageSetting('')}
                            className="text-[9px] text-red-600 hover:text-red-700 font-semibold hover:underline cursor-pointer flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">Option A: Image URL</label>
                          <input
                            type="text"
                            value={heroBgImageSetting}
                            onChange={(e) => setHeroBgImageSetting(e.target.value)}
                            placeholder="e.g. https://example.com/banner.jpg"
                            className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:border-slate-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">Option B: Upload File</label>
                          <label className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg py-2 px-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer gap-2 text-xs text-gray-600 hover:text-gray-900">
                            <FileUp className="w-4 h-4 text-gray-400" />
                            <span>{heroUploading ? 'Uploading...' : 'Choose image...'}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleHeroUpload} 
                              disabled={heroUploading} 
                              className="hidden" 
                            />
                          </label>
                          {heroUploadError && (
                            <p className="text-[10px] text-red-500 font-medium mt-1">{heroUploadError}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="block text-xs font-semibold font-sans text-gray-700">Image Layer Opacity ({heroBgOpacitySetting}%)</label>
                        <p className="text-[10px] text-gray-400 font-sans font-medium">Control the transparency of the background photo (0% = hidden, 100% = fully visible).</p>
                        <div className="flex items-center gap-4 pt-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={heroBgOpacitySetting}
                            onChange={(e) => setHeroBgOpacitySetting(e.target.value)}
                            className="flex-grow h-2 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-slate-900"
                          />
                          <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 w-12 text-center">
                            {heroBgOpacitySetting}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Save Configuration & Apply Live Customization
                </button>
              </div>
            </form>

            {/* Database Backup Section */}
            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-sans font-bold text-sm text-gray-950 flex items-center gap-2">
                    <Database className="w-4.5 h-4.5 text-orange-600 animate-pulse" /> System Database Backup & Recovery
                  </h3>
                  <p className="text-xs text-gray-600 font-sans leading-relaxed">
                    Download a comprehensive backup of the application state including all curators, scholars, sectors, collections, document metadata, audit logs, and custom system settings. Choose an incremental backup to retrieve only updates since your last backup action, or a full backup to fetch the entire database state.
                  </p>
                  
                  {(() => {
                    const lastBackupSetting = systemSettings.find(s => s.setting_name === 'last_backup_time')?.setting_value;
                    return (
                      <div className="mt-2 text-[11px] font-mono text-orange-800 bg-orange-100/60 px-3 py-1.5 rounded-lg w-fit flex items-center gap-2 border border-orange-200/50">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                        <span>Last Backup Timestamp: <strong className="font-sans">{lastBackupSetting ? new Date(lastBackupSetting).toLocaleString() : 'Never'}</strong></span>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 self-start sm:self-auto">
                  <button
                    onClick={() => handleDownloadDatabaseBackup(true)}
                    className="px-4.5 py-3 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <RefreshCw className="w-4 h-4 text-orange-600" /> Incremental Backup
                  </button>
                  <button
                    onClick={() => handleDownloadDatabaseBackup(false)}
                    className="px-4.5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" /> Full Backup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: Audit trail logs */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-sans font-bold text-lg text-gray-950">System Security Audit Logs</h2>
                <p className="text-xs text-gray-500 font-sans">Complete chronological tracking of logins, approvals, updates, and configuration edits.</p>
              </div>

              {/* Toggle controls for displaying only the latest log */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl w-fit self-start sm:self-auto shadow-xs border border-gray-150">
                <button
                  onClick={() => setShowOnlyLatestLog(true)}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold font-sans transition-all cursor-pointer ${
                    showOnlyLatestLog
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-gray-500 hover:text-slate-900'
                  }`}
                >
                  Only Latest Log
                </button>
                <button
                  onClick={() => setShowOnlyLatestLog(false)}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold font-sans transition-all cursor-pointer ${
                    !showOnlyLatestLog
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-gray-500 hover:text-slate-900'
                  }`}
                >
                  All Logs ({auditLogs.length})
                </button>
              </div>
            </div>

            <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm max-h-[480px] overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">User Context</th>
                    <th className="px-6 py-3.5">IP Location</th>
                    <th className="px-6 py-3.5">Operation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                  {(showOnlyLatestLog ? auditLogs.slice(0, 1) : auditLogs).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-mono text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-3 font-bold text-gray-900">{log.username}</td>
                      <td className="px-6 py-3 font-mono text-[10px] text-gray-500">{log.ipAddress}</td>
                      <td className="px-6 py-3 text-gray-600 font-medium">{log.action}</td>
                    </tr>
                  ))}
                  {(showOnlyLatestLog ? auditLogs.slice(0, 1) : auditLogs).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">No audit logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {showOnlyLatestLog && auditLogs.length > 1 && (
              <p className="text-[10px] text-slate-500 font-sans italic text-right">
                Currently displaying only the latest system log entry. Switch toggle above to view all {auditLogs.length} historical logs.
              </p>
            )}
          </div>
        )}

        {/* TAB CONTENT: Manage Communities and Collections Hierarchy */}
        {activeTab === 'structure' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">Institutional Sectors Structuring</h2>
              <p className="text-xs text-gray-500 font-sans">Define hierarchical Sectors and child Collections for the metadata tree.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Add Community Form */}
              <form onSubmit={handleCreateCommunity} className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-orange-500" />
                  Add New Sector (Community)
                </h3>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Sector Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. School of Law"
                    value={newCommunityName}
                    onChange={(e) => setNewCommunityName(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Brief description</label>
                  <textarea
                    rows={3}
                    placeholder="Description of scholarly focus..."
                    value={newCommunityDesc}
                    onChange={(e) => setNewCommunityDesc(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500 resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Create Community Sector
                </button>
              </form>

              {/* Add Collection Form */}
              <form onSubmit={handleCreateCollection} className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-green-600" />
                  Add Collection Archive
                </h3>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Parent Community Sector</label>
                  <select
                    required
                    value={selectedCommunityIdForColl}
                    onChange={(e) => setSelectedCommunityIdForColl(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Select Target Sector...</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Collection Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master's Theses"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Collection guidelines..."
                    value={newCollectionDesc}
                    onChange={(e) => setNewCollectionDesc(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500 resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Create Archive Collection
                </button>
              </form>
            </div>

            {/* Manage Communities and Collections Lists */}
            <div className="space-y-6 pt-6 border-t border-gray-150">
              <h3 className="font-sans font-bold text-sm text-gray-950 flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-500" />
                Existing Sectors (Communities)
              </h3>
              <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-mono text-gray-400 font-bold uppercase">
                      <th className="px-6 py-3.5 w-1/4">Sector Name</th>
                      <th className="px-6 py-3.5 w-2/4">Description</th>
                      <th className="px-6 py-3.5 text-right w-1/4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                    {communities.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3.5 font-bold text-gray-900">
                          {editingCommunityId === c.id ? (
                            <input
                              type="text"
                              value={editCommunityName}
                              onChange={(e) => setEditCommunityName(e.target.value)}
                              className="w-full bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-sans focus:outline-none focus:border-orange-500"
                            />
                          ) : (
                            c.name
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-gray-500">
                          {editingCommunityId === c.id ? (
                            <textarea
                              rows={2}
                              value={editCommunityDesc}
                              onChange={(e) => setEditCommunityDesc(e.target.value)}
                              className="w-full bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-sans focus:outline-none focus:border-orange-500 resize-none"
                            />
                          ) : (
                            c.description
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {editingCommunityId === c.id ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEditCommunity(c.id)}
                                className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white font-semibold text-[11px] rounded-xl cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCommunityId(null)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] rounded-xl cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingCommunityId(c.id);
                                  setEditCommunityName(c.name);
                                  setEditCommunityDesc(c.description);
                                }}
                                className="p-1.5 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-gray-400 transition-colors cursor-pointer"
                                title="Edit Community"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCommunity(c.id)}
                                className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 transition-colors cursor-pointer"
                                title="Delete Community"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="font-sans font-bold text-sm text-gray-950 pt-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-green-600" />
                Existing Archive Collections
              </h3>
              <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-mono text-gray-400 font-bold uppercase">
                      <th className="px-6 py-3.5 w-1/4">Collection Title</th>
                      <th className="px-6 py-3.5 w-1/4">Parent Sector</th>
                      <th className="px-6 py-3.5 w-1/4">Description</th>
                      <th className="px-6 py-3.5 text-right w-1/4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                    {collections.map((coll) => {
                      const parentComm = communities.find(comm => comm.id === coll.communityId);
                      return (
                        <tr key={coll.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3.5 font-bold text-gray-900">
                            {editingCollectionId === coll.id ? (
                              <input
                                type="text"
                                value={editCollectionName}
                                onChange={(e) => setEditCollectionName(e.target.value)}
                                className="w-full bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-sans focus:outline-none focus:border-orange-500"
                              />
                            ) : (
                              coll.name
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-gray-600">
                            {editingCollectionId === coll.id ? (
                              <select
                                value={editCollectionCommunityId}
                                onChange={(e) => setEditCollectionCommunityId(e.target.value)}
                                className="w-full bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-sans focus:outline-none focus:border-orange-500 cursor-pointer"
                              >
                                {communities.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            ) : (
                              parentComm?.name || 'Unknown Sector'
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-gray-500">
                            {editingCollectionId === coll.id ? (
                              <textarea
                                rows={2}
                                value={editCollectionDesc}
                                onChange={(e) => setEditCollectionDesc(e.target.value)}
                                className="w-full bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-sans focus:outline-none focus:border-orange-500 resize-none"
                              />
                            ) : (
                              coll.description
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {editingCollectionId === coll.id ? (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleEditCollection(coll.id)}
                                  className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white font-semibold text-[11px] rounded-xl cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingCollectionId(null)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] rounded-xl cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setEditingCollectionId(coll.id);
                                    setEditCollectionName(coll.name);
                                    setEditCollectionDesc(coll.description);
                                    setEditCollectionCommunityId(coll.communityId);
                                  }}
                                  className="p-1.5 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-gray-400 transition-colors cursor-pointer"
                                  title="Edit Collection"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCollection(coll.id)}
                                  className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 transition-colors cursor-pointer"
                                  title="Delete Collection"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: Review Submissions Queue (Librarian) */}
        {activeTab === 'review' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">Submissions Moderation Worklist</h2>
              <p className="text-xs text-gray-500 font-sans">Review scholarly metadata indexing quality and verify accompanying manuscripts.</p>
            </div>

            {selectedDocForReview ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Custom Review Panel Header */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500 text-white uppercase tracking-wider">
                      Pending Institutional Moderation
                    </span>
                    <h3 className="font-sans font-extrabold text-lg text-white leading-tight mt-1">{selectedDocForReview.title}</h3>
                    <p className="text-xs text-gray-300">
                      Author: <span className="font-bold text-white">{selectedDocForReview.author}</span> · Submitter ID: <span className="font-mono text-[11px] text-orange-400">{selectedDocForReview.submitterId}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDocForReview(null)}
                    className="text-xs font-mono text-gray-800 hover:text-black bg-white hover:bg-gray-50 border border-transparent px-4 py-2 rounded-xl font-bold shadow-sm transition-all cursor-pointer self-start md:self-auto"
                  >
                    ← Back to Worklist
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Extensive Manuscript Metadata & Interactive Cover Sheet Preview (7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Interactive File & Cover Sheet Visual Preview */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                        <h4 className="font-sans font-bold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-500" /> Interactive Cover Sheet & Manuscript
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">PDF Cover Sheet Generator</span>
                      </div>

                      {/* Cover Sheet Mockup Container */}
                      <div className="border border-dashed border-gray-250 dark:border-slate-750 bg-gray-50/50 dark:bg-slate-850/40 rounded-xl p-6 font-sans space-y-5 text-gray-800 dark:text-gray-200 relative overflow-hidden shadow-xs">
                        {/* Institutional Watermark stamp */}
                        <div className="absolute right-4 top-4 border-2 border-emerald-500/20 text-emerald-600/20 text-[10px] font-bold font-mono px-2 py-1 uppercase rounded-lg rotate-12 select-none pointer-events-none">
                          NIPA Institutional Index
                        </div>

                        <div className="text-center space-y-2 border-b border-gray-200/60 dark:border-slate-800 pb-5">
                          <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest block">
                            Academic & Scholarly Repository
                          </span>
                          <h1 className="font-sans font-bold text-base text-gray-900 dark:text-gray-100 leading-tight">
                            {selectedDocForReview.title}
                          </h1>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            By {selectedDocForReview.author} {selectedDocForReview.coAuthors ? `& ${selectedDocForReview.coAuthors}` : ''}
                          </p>
                          <span className="text-[10px] font-mono text-gray-500 block">
                            {selectedDocForReview.department} · {selectedDocForReview.faculty}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] font-bold font-mono text-gray-400 uppercase tracking-wider block">
                              Abstract Context Summary
                            </span>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed text-justify mt-1">
                              {selectedDocForReview.abstract}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200/40 dark:border-slate-800 text-[11px]">
                            <div>
                              <span className="text-[9px] font-bold font-mono text-gray-400 uppercase">Indexing Sector</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100 block mt-0.5">
                                {communities.find(c => c.id === selectedDocForReview.communityId)?.name || 'General Sector'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold font-mono text-gray-400 uppercase">Archive Target</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100 block mt-0.5">
                                {collections.find(col => col.id === selectedDocForReview.collectionId)?.name || 'General Collection'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* File Action Row inside cover sheet */}
                        <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center font-bold font-sans text-xs">
                              PDF
                            </div>
                            <div>
                              {isFetchingFile ? (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1.5 font-mono">
                                  <RefreshCw className="w-3 h-3 animate-spin text-orange-500" /> Resolving attachment metadata...
                                </span>
                              ) : reviewedDocFile ? (
                                <>
                                  <span className="block font-bold text-xs text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={reviewedDocFile.fileName}>
                                    {reviewedDocFile.fileName}
                                  </span>
                                  <span className="block text-[10px] text-gray-500 font-mono">
                                    Size: {(reviewedDocFile.fileSize / 1024).toFixed(1)} KB · PDF Manuscript
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="block font-bold text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5 text-amber-500" /> No physical PDF attached
                                  </span>
                                  <span className="block text-[10px] text-gray-400 font-mono">
                                    Metadata-only indexing submission
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {reviewedDocFile && (
                            <a
                              href={`/api/documents/${selectedDocForReview.id}/download-file`}
                              download
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-950 dark:bg-slate-800 dark:hover:bg-slate-750 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download & Inspect</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Extended Metadata Fields Card */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="border-b border-gray-100 dark:border-slate-800 pb-3">
                        <h4 className="font-sans font-bold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                          Scholarly Metadata Dictionary
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">Language</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 block">{selectedDocForReview.language || 'English'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">Publication Year</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 block">{selectedDocForReview.publicationYear}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">Publisher</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 block truncate" title={selectedDocForReview.publisher || 'Institutional Press'}>
                            {selectedDocForReview.publisher || 'Institutional Press'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">Rights Statement</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 block truncate" title={selectedDocForReview.rightsStatement}>
                            {selectedDocForReview.rightsStatement || 'All Rights Reserved'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">ISBN / ISSN</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 block font-mono">
                            {selectedDocForReview.isbn || selectedDocForReview.issn || 'N/A'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">Digital Object Identifier (DOI)</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 block font-mono text-[10px] truncate" title={selectedDocForReview.doi}>
                            {selectedDocForReview.doi || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {selectedDocForReview.keywords && (
                        <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase block">Indexed Indexing Keywords</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDocForReview.keywords.split(',').map((kw, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-semibold">
                                #{kw.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Interactive Evaluation Console (5 cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5 sticky top-24">
                      <div className="border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                        <h4 className="font-sans font-bold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                          Moderator Decision Console
                        </h4>
                        <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-[9px] font-bold font-mono rounded">
                          STAGE 1
                        </span>
                      </div>

                      <div className="space-y-4 font-sans">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                            Evaluator Moderation Comments
                          </label>
                          <textarea
                            rows={6}
                            required
                            placeholder="Provide feedback on scholarly format, copyright checks, manuscript validation, indexing fields completeness, or required modifications..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-gray-250 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 resize-none leading-relaxed text-gray-900 dark:text-white"
                          ></textarea>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                            These notes will be delivered to the submitter's inbox, recorded in audit logs, and appended to the workflow timeline.
                          </p>
                        </div>

                        {/* Interactive Large Action Buttons */}
                        <div className="space-y-2.5 pt-2">
                          <button
                            onClick={() => handleReviewDecision('Approved')}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-emerald-600/10"
                          >
                            <CheckCircle className="w-4.5 h-4.5" /> Approve, Publish & Index Paper
                          </button>
                          <button
                            onClick={() => handleReviewDecision('Rejected')}
                            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-rose-600/10"
                          >
                            <XCircle className="w-4.5 h-4.5" /> Decline Submission (Return Draft)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Submission Item</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                    {reviewQueue.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                          Submissions queue is empty. There are no documents awaiting moderation.
                        </td>
                      </tr>
                    ) : (
                      reviewQueue.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4">
                            <div>
                              <span className="font-bold text-gray-900 block truncate max-w-sm">{doc.title}</span>
                              <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Author: {doc.author}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-medium">{doc.department}</td>
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedDocForReview(doc)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                            >
                              Evaluate Item
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: Submit Scholarly Work (Researcher Form) */}
        {activeTab === 'submissions' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">Deposit New Digital Work</h2>
              <p className="text-xs text-gray-500 font-sans">Index research datasets, peer-reviewed manuscripts, or publications using compliant Dublin Core elements.</p>
            </div>

            <form onSubmit={handleSubmissionSubmit} className="space-y-6 text-xs font-sans">
              
              {/* Submission Mode Selection */}
              <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="font-sans font-bold text-sm text-gray-950 flex items-center gap-2">
                  <FileUp className="w-4.5 h-4.5 text-slate-500" /> Choose Upload Mode
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    className={`border rounded-xl p-4 flex flex-col gap-1 cursor-pointer transition-all ${
                      submissionMode === 'single' 
                        ? 'border-slate-850 bg-slate-50 ring-1 ring-slate-800' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setSubmissionMode('single')}
                  >
                    <span className="font-bold text-xs text-gray-900">Single Catalog Item</span>
                    <span className="text-[10px] text-gray-500 leading-normal">All uploaded files are bundled under a single title & metadata record (ideal for a paper + attachments).</span>
                  </div>
                  <div 
                    className={`border rounded-xl p-4 flex flex-col gap-1 cursor-pointer transition-all ${
                      submissionMode === 'batch' 
                        ? 'border-slate-850 bg-slate-50 ring-1 ring-slate-800' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setSubmissionMode('batch')}
                  >
                    <span className="font-bold text-xs text-gray-900">Batch Upload / Split files</span>
                    <span className="text-[10px] text-gray-500 leading-normal">Each uploaded file creates its own distinct, individually searchable & accessible document in the repository.</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-950">Basic Metadata Fields (Shared Dublin Core)</h3>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">
                    {submissionMode === 'single' ? 'Title *' : 'Common Title Prefix (Optional)'}
                  </label>
                  <input
                    type="text"
                    required={submissionMode === 'single'}
                    placeholder={submissionMode === 'single' ? "Full scholarly title of the deposited item..." : "Optional: e.g. 'Past Exam Paper' to prefix all titles, otherwise file name will be used"}
                    value={submissionForm.title}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, title: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Author / Creator *</label>
                    <input
                      type="text"
                      required
                      value={submissionForm.author}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, author: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Co-Authors / Contributors</label>
                    <input
                      type="text"
                      placeholder="Separate with commas..."
                      value={submissionForm.coAuthors}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, coAuthors: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Target Sector (Community) *</label>
                    <select
                      required
                      value={submissionForm.communityId}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, communityId: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="">Select Sector...</option>
                      {communities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Target Collection *</label>
                    <select
                      required
                      disabled={!submissionForm.communityId}
                      value={submissionForm.collectionId}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, collectionId: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">Select Collection...</option>
                      {collections.filter(c => c.communityId === submissionForm.communityId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Rights Statement / License *</label>
                    <select
                      required
                      value={submissionForm.rightsStatement}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, rightsStatement: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="Creative Commons Attribution 4.0 International (CC BY 4.0)">Creative Commons Attribution 4.0 (CC BY)</option>
                      <option value="Public Domain (CC0)">Public Domain (CC0)</option>
                      <option value="All Rights Reserved">All Rights Reserved (Proprietary)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Faculty / Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={submissionForm.department}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, department: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Keywords / Subjects *</label>
                    <input
                      type="text"
                      required
                      placeholder="Separate with commas: e.g. OCR, Layout, Transformers"
                      value={submissionForm.keywords}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, keywords: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Abstract Context *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Scholarly abstract or summary of contents..."
                    value={submissionForm.abstract}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, abstract: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Optional Dublin Core parameters */}
              <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-950">Identifiers & Publications (Optional Dublin Core Fields)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Publication Year</label>
                    <input
                      type="number"
                      value={submissionForm.publicationYear}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, publicationYear: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Publisher</label>
                    <input
                      type="text"
                      placeholder="Journal/University publisher"
                      value={submissionForm.publisher}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, publisher: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Language</label>
                    <input
                      type="text"
                      value={submissionForm.language}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, language: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">DOI Code</label>
                    <input
                      type="text"
                      placeholder="10.1000/xyz123"
                      value={submissionForm.doi}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, doi: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Drag and Drop File Section */}
              <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-950">Upload Manuscript / Associated Datasets</h3>
                
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive ? 'border-orange-500 bg-orange-500/5' : 'border-gray-250 bg-gray-50 hover:bg-gray-100/50'
                  }`}
                >
                  <FileUp className="w-10 h-10 mx-auto text-gray-400 animate-bounce" />
                  <p className="mt-2 text-xs text-gray-600 font-semibold">Drag and drop your manuscript files here</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">Accepts PDF, DOCX, XLSX, ZIP (Max 50MB per file)</p>
                  <label className="mt-4 inline-block bg-slate-900 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-950 transition-colors">
                    Browse Files
                    <input type="file" multiple onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                {attachedFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="block text-[10px] font-mono text-gray-400 font-bold uppercase">
                        Staged Upload List ({attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''})
                      </span>
                      {submissionMode === 'batch' && (
                        <span className="text-[10px] text-orange-600 font-bold font-sans animate-pulse">
                          Batch Mode: Specify distinct titles below
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {attachedFiles.map((file, i) => (
                        <div key={i} className="bg-gray-50 p-3.5 rounded-xl border border-gray-150 space-y-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="font-bold text-gray-700 truncate max-w-[200px] sm:max-w-[300px]" title={file.name}>
                                {file.name}
                              </span>
                              <span className="font-mono text-[10px] text-gray-400">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextFiles = [...attachedFiles];
                                nextFiles.splice(i, 1);
                                setAttachedFiles(nextFiles);
                                const nextTitles = [...batchTitles];
                                nextTitles.splice(i, 1);
                                setBatchTitles(nextTitles);
                              }}
                              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer text-[10px] transition-colors"
                            >
                              Remove
                            </button>
                          </div>

                          {submissionMode === 'batch' && (
                            <div className="space-y-1">
                              <label className="block text-[9px] font-mono text-gray-450 font-bold uppercase">Document Title for this file *</label>
                              <input
                                type="text"
                                required
                                placeholder="Enter specific document title..."
                                value={batchTitles[i] || ''}
                                onChange={(e) => {
                                  const nextTitles = [...batchTitles];
                                  nextTitles[i] = e.target.value;
                                  setBatchTitles(nextTitles);
                                }}
                                className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-slate-500"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting Manuscript...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" /> Deposit Work for Moderation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB CONTENT: My Submissions tracking & File Replacement (Researcher) */}
        {activeTab === 'my_list' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">My Scholarly Submissions Tracker</h2>
              <p className="text-xs text-gray-500 font-sans">Track review workflows and resolve curation notes by uploading updated manuscripts.</p>
            </div>

            {selectedDocForReplace ? (
              <form onSubmit={handleReplaceFile} className="bg-gray-50 border border-gray-150 p-6 rounded-2xl space-y-4 text-xs font-sans">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <h3 className="font-sans font-bold text-sm text-gray-950">Replace Manuscript File</h3>
                  <button
                    onClick={() => setSelectedDocForReplace(null)}
                    type="button"
                    className="text-xs font-mono text-gray-400 bg-white border px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Select Replacement Manuscript File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReplaceFile(e.target.files[0]);
                      }
                    }}
                    className="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Change Revision Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fixed grammar error and updated bibliography"
                    value={replaceDesc}
                    onChange={(e) => setReplaceDesc(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow" /> Re-Submit Updated Manuscript
                </button>
              </form>
            ) : (
              <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Deposited Article</th>
                      <th className="px-6 py-3.5">Review Status</th>
                      <th className="px-6 py-3.5">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                    {mySubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                          You have not deposited any academic artifacts yet. Click "Submit Scholarly Work" to deposit.
                        </td>
                      </tr>
                    ) : (
                      mySubmissions.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4">
                            <div>
                              <span className="font-bold text-gray-900 block truncate max-w-sm">{doc.title}</span>
                              <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Year: {doc.publicationYear} · DOI: {doc.doi || 'None'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-[10px]">
                            {doc.status === 'Approved' && <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded border border-green-200 uppercase">Published</span>}
                            {doc.status === 'Submitted' && <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200 uppercase">Awaiting Curation</span>}
                            {doc.status === 'Rejected' && <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded border border-red-200 uppercase">Revise & Resubmit</span>}
                            {doc.status === 'Pending Review' && <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded border border-orange-200 uppercase">In Review</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => onSelectDocument(doc.id)}
                                className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-100 rounded text-[11px] font-semibold text-gray-700 cursor-pointer"
                              >
                                View Index
                              </button>
                              {(doc.status === 'Draft' || doc.status === 'Rejected') && (
                                <button
                                  onClick={() => setSelectedDocForReplace(doc.id)}
                                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Replace File
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: Edit Profile & Password */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">My Account Settings</h2>
              <p className="text-xs text-gray-500 font-sans">Manage your personal profile details, institutional affiliations, and security settings.</p>
            </div>

            {profileSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Personal Information */}
              <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-950 border-b border-gray-50 pb-2 flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-orange-500" /> Personal Profile
                </h3>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Username / Public Display Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      className="w-full text-xs font-sans px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full text-xs font-sans px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Department</label>
                      <input
                        type="text"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                        className="w-full text-xs font-sans px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="e.g. Computer Science"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Faculty</label>
                      <input
                        type="text"
                        value={profileForm.faculty}
                        onChange={(e) => setProfileForm({ ...profileForm, faculty: e.target.value })}
                        className="w-full text-xs font-sans px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="e.g. School of ICT"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">System Privilege Level (Read-Only)</label>
                    <div className="w-full text-xs font-sans px-3.5 py-2.5 bg-gray-50 border border-gray-150 rounded-lg text-gray-500 font-semibold select-none">
                      {currentUser.role}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Change Password */}
              <div className="space-y-6">
                <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4">
                  <h3 className="font-sans font-bold text-sm text-gray-950 border-b border-gray-50 pb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-orange-500" /> Access Credentials
                  </h3>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">New Password</label>
                      <input
                        type="password"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full text-xs font-sans px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        minLength={6}
                      />
                      <p className="text-[9px] text-gray-400 mt-1">Leave empty to keep your current password.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full text-xs font-sans px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Panel */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[11px] text-gray-500 font-sans leading-snug">
                    Confirm edits to your academic profile. Updates take effect immediately.
                  </p>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-700 text-white font-sans text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    {profileLoading ? 'Saving Changes...' : 'Save Profile Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB CONTENT: Study Locker (Student) */}
        {activeTab === 'locker' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-sans font-bold text-lg text-gray-950">My Study Locker</h2>
              <p className="text-xs text-gray-500 font-sans">Access your saved papers, dissertations, and reading notes locker.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Saved papers */}
              <div className="border border-gray-150 rounded-2xl p-5 space-y-4">
                <h3 className="font-sans font-bold text-sm text-gray-950">Saved Publications ({lockerFavorites.length})</h3>
                
                {lockerFavorites.length === 0 ? (
                  <p className="text-xs text-gray-400 font-sans py-4">Your reading list is empty. Click the Star icon on any publication to bookmark it here.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {lockerFavorites.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => onSelectDocument(doc.id)}
                        className="p-3 bg-gray-50 hover:bg-gray-100/70 rounded-xl cursor-pointer transition-colors flex justify-between items-center border border-gray-100"
                      >
                        <div className="space-y-0.5 truncate max-w-[200px]">
                          <span className="font-sans font-bold text-xs text-gray-950 block truncate">{doc.title}</span>
                          <span className="text-[10px] text-gray-500 block truncate">{doc.author} · {doc.publicationYear}</span>
                        </div>
                        <span className="text-[10px] text-orange-600 font-bold font-sans flex-shrink-0">Study →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Research logs info */}
              <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl space-y-4 text-xs text-gray-600 font-sans leading-relaxed">
                <h3 className="font-sans font-bold text-sm text-gray-950">Locker Information</h3>
                <p>The **Study Locker** serves as an off-canvas directory tracking your saved research artifacts and reading progress.</p>
                <p>All items stored in your locker preserve your individual view preferences, citation copies, and bookmark references instantly.</p>
                <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-200">
                  Secure Institutional Sandbox
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
