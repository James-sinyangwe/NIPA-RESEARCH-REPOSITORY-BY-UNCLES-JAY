/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PublicHome from './components/PublicHome';
import DocumentDetail from './components/DocumentDetail';
import Dashboard from './components/Dashboard';
import { User, Community, Collection, Document, ThemeConfig, SystemSetting, Notification } from './types';
import { Search, SlidersHorizontal, LayoutGrid, List, FileText, CheckCircle, ShieldAlert, LogIn, Lock, Mail, UserPlus, RefreshCw } from 'lucide-react';

export default function App() {
  // Navigation & Views
  const [activeView, setActiveView] = useState<'home' | 'search' | 'dashboard' | 'detail'>('home');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Authentication
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wasAdmin, setWasAdmin] = useState(() => localStorage.getItem('was_admin') === 'true');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Student',
    department: 'Computer Science',
    faculty: 'School of ICT'
  });
  const [authError, setAuthError] = useState('');
  const [showIdleTimeoutBanner, setShowIdleTimeoutBanner] = useState(false);

  // Main Datastore
  const [communities, setCommunities] = useState<Community[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    communityId: '',
    collectionId: '',
    author: '',
    year: '',
    department: '',
    status: ''
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Active Theme Configs
  const [primaryColor, setPrimaryColor] = useState('#F57C00'); // Orange default
  const [secondaryColor, setSecondaryColor] = useState('#2E7D32'); // Green default
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Load baseline configuration and repository structure
  useEffect(() => {
    fetchMetadataTree();
    fetchSystemSettings();
    fetchThemes();
    fetchDocuments();
  }, []);

  // Poll for user notifications if logged in
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // 10s polling
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Sync theme colors dynamically based on settings table
  useEffect(() => {
    if (settings.length > 0 && themes.length > 0) {
      const activeThemeId = settings.find(s => s.setting_name === 'active_theme')?.setting_value || '1';
      const activeTheme = themes.find(t => t.id === activeThemeId);
      if (activeTheme) {
        setPrimaryColor(activeTheme.primaryColor);
        setSecondaryColor(activeTheme.secondaryColor);
        setIsDarkTheme(activeTheme.isDark);
      }

      // Sync Default View Mode
      const defaultVM = settings.find(s => s.setting_name === 'default_view_mode')?.setting_value || 'grid';
      const enableOverride = settings.find(s => s.setting_name === 'enable_user_override')?.setting_value || 'true';

      if (enableOverride === 'false') {
        setViewMode(defaultVM as 'grid' | 'list');
      } else if (currentUser?.viewPreference) {
        setViewMode(currentUser.viewPreference as 'grid' | 'list');
      } else {
        setViewMode(defaultVM as 'grid' | 'list');
      }
    }
  }, [settings, themes, currentUser]);

  // Idle session timeout monitor: 30 minutes of inactivity auto logout to protect sensitive institutional data
  useEffect(() => {
    if (!currentUser) return;

    const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        setShowIdleTimeoutBanner(true);
      }, TIMEOUT_DURATION);
    };

    // Events that signify user interaction activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initialize timer
    resetTimer();

    // Attach listeners to detect user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup on unmount or user change
    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser]);

  const fetchMetadataTree = async () => {
    try {
      const [commRes, collRes] = await Promise.all([
        fetch('/api/communities'),
        fetch('/api/collections')
      ]);
      const comms = await commRes.json();
      const colls = await collRes.json();
      setCommunities(comms);
      setCollections(colls);
    } catch (e) {
      console.error('Error fetching catalog tree metadata', e);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/themes');
      const data = await res.json();
      setThemes(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocuments = async (customQuery = '', customFilters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (customQuery) queryParams.append('query', customQuery);

      const activeFilters = Object.keys(customFilters).length > 0 ? customFilters : searchFilters;
      Object.entries(activeFilters).forEach(([key, val]) => {
        if (val) queryParams.append(key, val as string);
      });

      const headers: any = {};
      if (currentUser) {
        headers['x-user-id'] = currentUser.id;
        headers['x-user-role'] = currentUser.role;
      }

      const res = await fetch(`/api/documents?${queryParams.toString()}`, { headers });
      const docs = await res.json();
      setDocuments(docs);
    } catch (e) {
      console.error('Error fetching publications', e);
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications/${currentUser.id}`);
      const notes = await res.json();
      setNotifications(notes);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchNavigate = (query: string, filters = {}) => {
    setSearchQuery(query);
    setSearchFilters(prev => ({ ...prev, ...filters }));
    fetchDocuments(query, filters);
    setActiveView('search');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    const cleared = {
      communityId: '',
      collectionId: '',
      author: '',
      year: '',
      department: '',
      status: ''
    };
    setSearchFilters(cleared);
    fetchDocuments('', cleared);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('was_admin');
        setWasAdmin(false);
        setCurrentUser(data.user);
        setAuthModalOpen(false);
        setShowIdleTimeoutBanner(false); // Clear banner on successful manual login
        // Sync custom view preference if configured
        if (data.user.viewPreference) {
          setViewMode(data.user.viewPreference);
        }
        setAuthForm({
          username: '',
          email: '',
          password: '',
          role: 'Student',
          department: 'Computer Science',
          faculty: 'School of ICT'
        });
      } else {
        setAuthError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      setAuthError('Connection error to auth engine.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setAuthModalOpen(false);
        setAuthForm({
          username: '',
          email: '',
          password: '',
          role: 'Student',
          department: 'Computer Science',
          faculty: 'School of ICT'
        });
      } else {
        setAuthError(data.message || 'Unable to register user.');
      }
    } catch (err) {
      setAuthError('Connection error to auth registration engine.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView('home');
    setNotifications([]);
    localStorage.removeItem('was_admin');
    setWasAdmin(false);
  };

  // Change view mode with persistence override save
  const handleToggleViewMode = async (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (currentUser) {
      try {
        await fetch('/api/auth/view-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, preference: mode })
        });
        // Update local session
        setCurrentUser(prev => prev ? { ...prev, viewPreference: mode } : null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSelectDocument = (id: string) => {
    setSelectedDocumentId(id);
    setActiveView('detail');
  };

  const handleQuickCredentialLogin = async (email: string, pass: string) => {
    setAuthForm(prev => ({ ...prev, email, password: pass }));
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, isSwitch: true })
      });
      const data = await res.json();
      if (data.success) {
        if (currentUser?.role === 'Administrator' || wasAdmin) {
          if (data.user.role !== 'Administrator') {
            localStorage.setItem('was_admin', 'true');
            setWasAdmin(true);
          } else {
            localStorage.removeItem('was_admin');
            setWasAdmin(false);
          }
        } else {
          localStorage.removeItem('was_admin');
          setWasAdmin(false);
        }

        setCurrentUser(data.user);
        setAuthModalOpen(false);
        setShowIdleTimeoutBanner(false); // Clear banner on switch login
        if (data.user.viewPreference) {
          setViewMode(data.user.viewPreference);
        }
      } else {
        setAuthError(data.message);
      }
    } catch (e) {
      setAuthError('Quick auth failed.');
    }
  };

  const repoName = settings.find(s => s.setting_name === 'repository_name')?.setting_value || 'CORE Repository';
  const repoSubtitle = settings.find(s => s.setting_name === 'repository_subtitle')?.setting_value || 'Digital Library & Archive';
  const heroTitleSetting = settings.find(s => s.setting_name === 'hero_title')?.setting_value || '';
  const heroDescSetting = settings.find(s => s.setting_name === 'hero_desc')?.setting_value || '';
  const heroBgImageSetting = settings.find(s => s.setting_name === 'hero_bg_image')?.setting_value || '';
  const heroBgColorSetting = settings.find(s => s.setting_name === 'hero_bg_color')?.setting_value || '#0f172a';
  const heroBgOpacitySetting = settings.find(s => s.setting_name === 'hero_bg_opacity')?.setting_value || '10';
  const heroBgColorOpacitySetting = settings.find(s => s.setting_name === 'hero_bg_color_opacity')?.setting_value || '100';
  const repoLogoIconSetting = settings.find(s => s.setting_name === 'repository_logo_icon')?.setting_value || 'BookOpen';
  const repoLogoImageSetting = settings.find(s => s.setting_name === 'repository_logo_image')?.setting_value || '';

  return (
    <div className={`min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800 ${isDarkTheme ? 'dark bg-slate-950 text-slate-100' : ''}`}>
      {showIdleTimeoutBanner && (
        <div className="bg-red-600 text-white text-xs px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between font-sans gap-2 animate-fadeIn z-50 sticky top-0 border-b border-red-700 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
            <span>
              <strong>Security Alert:</strong> You have been automatically logged out due to 30 minutes of inactivity to protect sensitive institutional data.
            </span>
          </div>
          <button
            onClick={() => setShowIdleTimeoutBanner(false)}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-2.5 py-1 rounded text-xs transition-all cursor-pointer border border-white/20"
          >
            Dismiss
          </button>
        </div>
      )}
      {wasAdmin && currentUser?.role !== 'Administrator' && (
        <div className="bg-orange-600 text-white text-xs px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between font-sans gap-2 animate-fadeIn z-50 sticky top-0 border-b border-orange-700 shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-mono bg-orange-700 font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase border border-orange-500 shadow-sm animate-pulse">
              Impersonation Active
            </span>
            <span className="text-xs">
              Viewing system as <strong>{currentUser?.role}</strong> ({currentUser?.email})
            </span>
          </div>
          <button
            onClick={() => handleQuickCredentialLogin('admin@institution.edu', 'admin123')}
            className="bg-white text-orange-700 hover:bg-orange-50 font-bold px-3.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            Switch back to Administrator
          </button>
        </div>
      )}
      {/* Dynamic style variable injector */}
      <Header
        currentUser={currentUser}
        onNavigate={(view) => {
          setActiveView(view as any);
          if (view === 'home') handleClearFilters();
        }}
        activeView={activeView}
        onLogout={handleLogout}
        onOpenLogin={() => {
          setAuthMode('login');
          setAuthModalOpen(true);
        }}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onSelectDocument={handleSelectDocument}
        primaryColor={primaryColor}
        repositoryName={repoName}
        repositorySubtitle={repoSubtitle}
        repositoryLogoIcon={repoLogoIconSetting}
        repositoryLogoImage={repoLogoImageSetting}
      />

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* PUBLIC HOME VIEW */}
        {activeView === 'home' && (
          <PublicHome
            communities={communities}
            collections={collections}
            documents={documents}
            stats={null} // Pulled inside component dynamically
            onSelectDocument={handleSelectDocument}
            onNavigateToSearch={handleSearchNavigate}
            viewMode={viewMode}
            onSetViewMode={handleToggleViewMode}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            heroTitle={heroTitleSetting}
            heroDesc={heroDescSetting}
            heroBgImage={heroBgImageSetting}
            heroBgColor={heroBgColorSetting}
            heroBgOpacity={heroBgOpacitySetting}
            heroBgColorOpacity={heroBgColorOpacitySetting}
          />
        )}

        {/* SEARCH DIRECTORY RESULTS VIEW */}
        {activeView === 'search' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Search Header Banner */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="space-y-1 text-center sm:text-left">
                <h1 className="font-sans font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  Repository Directory Catalog
                </h1>
                <p className="text-xs text-gray-500 font-sans">
                  Found {documents.length} publication{documents.length !== 1 ? 's' : ''} matching your filter criteria.
                </p>
              </div>

              {/* Layout togglers */}
              <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                <button
                  onClick={() => handleToggleViewMode('grid')}
                  className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-950' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleViewMode('list')}
                  className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-950' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Catalog Layout Grid & Sidebar Filter */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sidebar Filters (3 cols) */}
              <div className="lg:col-span-3 bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <span className="font-sans font-bold text-xs text-gray-900 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                    Archive Filters
                  </span>
                  <button
                    onClick={handleClearFilters}
                    className="text-[10px] font-mono text-orange-600 font-bold uppercase hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  {/* Community Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Sector (Community)</label>
                    <select
                      value={searchFilters.communityId}
                      onChange={(e) => {
                        const next = { ...searchFilters, communityId: e.target.value, collectionId: '' };
                        setSearchFilters(next);
                        fetchDocuments(searchQuery, next);
                      }}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="">All Sectors...</option>
                      {communities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Collection Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Archive Collection</label>
                    <select
                      disabled={!searchFilters.communityId}
                      value={searchFilters.collectionId}
                      onChange={(e) => {
                        const next = { ...searchFilters, collectionId: e.target.value };
                        setSearchFilters(next);
                        fetchDocuments(searchQuery, next);
                      }}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-orange-500 disabled:opacity-55 cursor-pointer"
                    >
                      <option value="">All Collections...</option>
                      {collections.filter(cl => cl.communityId === searchFilters.communityId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Year of Issue</label>
                    <input
                      type="number"
                      placeholder="e.g. 2025"
                      value={searchFilters.year}
                      onChange={(e) => {
                        const next = { ...searchFilters, year: e.target.value };
                        setSearchFilters(next);
                        fetchDocuments(searchQuery, next);
                      }}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Author Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Lead Author</label>
                    <input
                      type="text"
                      placeholder="Search author..."
                      value={searchFilters.author}
                      onChange={(e) => {
                        const next = { ...searchFilters, author: e.target.value };
                        setSearchFilters(next);
                        fetchDocuments(searchQuery, next);
                      }}
                      className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Main Directory List / Card panels (9 cols) */}
              <div className="lg:col-span-9">
                {documents.length === 0 ? (
                  <div className="bg-white border border-gray-150 rounded-2xl p-12 text-center text-gray-500 text-sm font-sans space-y-2">
                    <FileText className="w-10 h-10 mx-auto text-gray-300" />
                    <p>No repository documents match your active catalog filters.</p>
                    <button onClick={handleClearFilters} className="text-xs font-semibold px-3 py-1.5 border rounded-lg mt-2 cursor-pointer bg-gray-50 hover:bg-gray-100">
                      Clear Search & Filters
                    </button>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleSelectDocument(doc.id)}
                        className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-lg hover:border-gray-250 transition-all cursor-pointer flex flex-col justify-between h-64 relative"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                              {doc.department}
                            </span>
                            <span className="font-mono text-xs px-2.5 py-0.5 bg-orange-50 text-orange-700 rounded-full font-semibold border border-orange-100">
                              {doc.publicationYear}
                            </span>
                          </div>
                          <h3 className="font-sans font-bold text-sm text-gray-900 line-clamp-2">
                            {doc.title}
                          </h3>
                          <p className="text-xs text-gray-500 font-sans font-medium line-clamp-1">
                            {doc.author}
                          </p>
                          <p className="text-xs text-gray-400 font-sans line-clamp-2 leading-relaxed">
                            {doc.abstract}
                          </p>
                        </div>
                        <div className="border-t border-gray-50 pt-3 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                          <div className="flex gap-2.5">
                            <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-500 uppercase">{doc.status}</span>
                          </div>
                          <span className="font-bold text-orange-600">Review Item →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                            <th className="px-6 py-3.5">Title / Subject</th>
                            <th className="px-6 py-3.5">Author</th>
                            <th className="px-6 py-3.5">Year</th>
                            <th className="px-6 py-3.5">Workflow</th>
                            <th className="px-6 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                          {documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div>
                                  <span
                                    onClick={() => handleSelectDocument(doc.id)}
                                    className="font-semibold text-gray-950 block hover:text-orange-600 cursor-pointer text-sm"
                                  >
                                    {doc.title}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{doc.department}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-gray-600">{doc.author}</td>
                              <td className="px-6 py-4">
                                <span className="font-mono text-[11px] font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                  {doc.publicationYear}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded uppercase font-bold border border-gray-150">
                                  {doc.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleSelectDocument(doc.id)}
                                  className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-100 rounded-lg text-gray-700 font-semibold transition-colors cursor-pointer"
                                >
                                  View Item
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SINGLE RECORD METADATA & PDF.JS PREVIEW VIEW */}
        {activeView === 'detail' && selectedDocumentId && (
          <DocumentDetail
            documentId={selectedDocumentId}
            onBack={() => {
              setActiveView('search');
              fetchDocuments();
            }}
            onSelectDocument={handleSelectDocument}
            currentUser={currentUser}
            allDocuments={documents}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onRefreshData={() => {
              fetchDocuments();
            }}
          />
        )}

        {/* WORKFLOWS & CONSOLE DASHBOARDS */}
        {activeView === 'dashboard' && currentUser && (
          <Dashboard
            currentUser={currentUser}
            communities={communities}
            collections={collections}
            documents={documents}
            allThemes={themes}
            systemSettings={settings}
            onRefreshData={() => {
              fetchDocuments();
              fetchMetadataTree();
              fetchSystemSettings();
            }}
            onSelectDocument={handleSelectDocument}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onQuickLogin={handleQuickCredentialLogin}
            onUpdateUser={setCurrentUser}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-850 py-8 text-slate-400 text-xs font-sans mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left space-y-1">
            <span className="block font-bold text-white text-sm">{repoName} Institutional System</span>
            <span className="block text-[10px] font-mono text-slate-500">OAI-PMH & Dublin Core Metadata Compliant Digital Library Platform</span>
          </div>
          <div className="flex gap-4 text-slate-400 font-semibold">
            <span>Public Commons Archive</span>
            <span>·</span>
            <span>Administrative Charter</span>
            <span>·</span>
            <span>Curator Standards</span>
          </div>
        </div>
      </footer>

      {/* AUTHENTICATION LIGHTBOX MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 border border-gray-100 shadow-2xl space-y-6 relative">
            <button
              onClick={() => {
                setAuthModalOpen(false);
                setAuthError('');
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 font-mono font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center space-y-1.5">
              <h2 className="font-sans font-bold text-lg sm:text-xl text-gray-950">
                {authMode === 'login' ? 'Institutional Account Login' : 'Register New Curator Account'}
              </h2>
              <p className="text-xs text-gray-500 font-sans">
                {authMode === 'login' ? 'Access metadata indexing and workflow review consoles.' : 'Submit scholarly assets and dissertation manuscripts.'}
              </p>
            </div>

            {/* Error banner */}
            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-sans rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={authMode === 'login' ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4 text-xs font-sans">
              {authMode === 'register' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Account Username</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. evelyn_carter"
                      value={authForm.username}
                      onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                      className="w-full bg-white border border-gray-200 pl-10 pr-3.5 py-2.5 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    placeholder="name@institution.edu"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="w-full bg-white border border-gray-200 pl-10 pr-3.5 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full bg-white border border-gray-200 pl-10 pr-3.5 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Cyber Security"
                      value={authForm.department}
                      onChange={(e) => setAuthForm({ ...authForm, department: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Role Registration</label>
                    <select
                      value={authForm.role}
                      onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                      className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs cursor-pointer"
                    >
                      <option value="Student">Student (Default)</option>
                      <option value="Staff / Researcher">Staff / Researcher</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <LogIn className="w-4 h-4" />
                {authMode === 'login' ? 'Authenticate Sign In' : 'Register New Curator'}
              </button>
            </form>

            <div className="text-center text-[11px] text-gray-500 font-sans pt-2 border-t border-gray-100">
              Account registration is restricted. Authorized staff will provision all system accounts.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
