/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Notification } from '../types';
import { 
  BookOpen, Award, Archive, GraduationCap, Library, Globe, Bookmark, FileText, Database, School,
  User as UserIcon, LogIn, LogOut, Bell, Shield, Settings, Menu, X 
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  onNavigate: (view: string) => void;
  activeView: string;
  onLogout: () => void;
  onOpenLogin: () => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onSelectDocument?: (id: string) => void;
  primaryColor: string;
  repositoryName?: string;
  repositorySubtitle?: string;
  repositoryLogoIcon?: string;
  repositoryLogoImage?: string;
}

export default function Header({
  currentUser,
  onNavigate,
  activeView,
  onLogout,
  onOpenLogin,
  notifications,
  onMarkNotificationRead,
  onSelectDocument,
  primaryColor,
  repositoryName,
  repositorySubtitle,
  repositoryLogoIcon,
  repositoryLogoImage
 }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getLogoIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Award': return <Award className="w-6 h-6" />;
      case 'Archive': return <Archive className="w-6 h-6" />;
      case 'GraduationCap': return <GraduationCap className="w-6 h-6" />;
      case 'Library': return <Library className="w-6 h-6" />;
      case 'Globe': return <Globe className="w-6 h-6" />;
      case 'Bookmark': return <Bookmark className="w-6 h-6" />;
      case 'FileText': return <FileText className="w-6 h-6" />;
      case 'Database': return <Database className="w-6 h-6" />;
      case 'School': return <School className="w-6 h-6" />;
      case 'BookOpen':
      default:
        return <BookOpen className="w-6 h-6" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('home')}>
            {repositoryLogoImage ? (
              <img 
                src={repositoryLogoImage} 
                alt={repositoryName || 'Logo'} 
                className="h-12 w-12 rounded-full object-contain bg-white border border-gray-100 p-0.5 shadow-sm transition-transform hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-2.5 rounded-xl text-white flex items-center justify-center shadow-md transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                {getLogoIcon(repositoryLogoIcon)}
              </div>
            )}
            <div className="hidden lg:block">
              <span className="font-sans font-bold text-lg sm:text-xl text-gray-900 tracking-tight block">
                {repositoryName || 'CORE Repository'}
              </span>
              <span className="font-mono text-[10px] text-gray-500 tracking-wider uppercase block">
                {repositorySubtitle || 'Digital Library & Archive'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1 items-center">
            <button
              onClick={() => onNavigate('home')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'home' || activeView === 'search'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Browse Public Archive
            </button>
            {currentUser && (
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                  activeView === 'dashboard'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Shield className="w-4 h-4 text-gray-500" />
                {currentUser.role === 'Administrator' && 'Admin Console'}
                {currentUser.role === 'Repository Manager' && 'Manager Console'}
                {currentUser.role === 'Librarian / Moderator' && 'Librarian Workspace'}
                {currentUser.role === 'Staff / Researcher' && 'Researcher Submissions'}
                {currentUser.role === 'Student' && 'Student Locker'}
              </button>
            )}
          </nav>

          {/* User Controls / Right actions */}
          <div className="flex items-center space-x-3">
            {/* Notification Tray */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white font-sans font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                      <span className="font-sans font-semibold text-sm text-gray-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="font-mono text-[10px] text-gray-500 uppercase font-semibold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-400 text-xs font-sans">
                        No notifications found.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) onMarkNotificationRead(n.id);
                            if (n.documentId && onSelectDocument) {
                              onSelectDocument(n.documentId);
                              setShowNotifications(false);
                            }
                          }}
                          className={`px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0 flex gap-3 ${
                            !n.isRead 
                              ? 'bg-orange-50/40 border-l-3 border-orange-500' 
                              : 'bg-white border-l-3 border-transparent opacity-75'
                          }`}
                        >
                          {/* Unread status dot indicator */}
                          <div className="mt-1 flex-shrink-0">
                            {!n.isRead ? (
                              <div className="w-2.5 h-2.5 bg-orange-600 rounded-full ring-4 ring-orange-100" />
                            ) : (
                              <div className="w-2.5 h-2.5 bg-gray-300 rounded-full" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-normal font-sans ${
                              !n.isRead ? 'text-gray-950 font-semibold' : 'text-gray-500'
                            }`}>
                              {n.message}
                            </p>
                            <div className="flex justify-between items-center mt-1.5">
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(n.createdAt).toLocaleString()}
                              </span>
                              {n.documentId && (
                                <span className={`text-[10px] font-semibold ${
                                  !n.isRead ? 'text-orange-600 hover:underline' : 'text-gray-400 hover:text-gray-600 hover:underline'
                                }`}>
                                  View Item →
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Auth Buttons */}
            {currentUser ? (
              <div className="flex items-center space-x-3 border-l border-gray-100 pl-3">
                <div className="hidden lg:block text-right">
                  <span className="block text-xs font-semibold text-gray-900 font-sans">
                    {currentUser.username}
                  </span>
                  <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-600">
                  <UserIcon className="w-4.5 h-4.5" />
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-100 text-gray-700 bg-white shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-2">
          <button
            onClick={() => {
              onNavigate('home');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium block ${
              activeView === 'home' || activeView === 'search'
                ? 'bg-gray-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50/50'
            }`}
          >
            Browse Public Archive
          </button>
          {currentUser && (
            <>
              <button
                onClick={() => {
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 block ${
                  activeView === 'dashboard' ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50/50'
                }`}
              >
                <Shield className="w-4.5 h-4.5 text-gray-500" />
                <span>Dashboard Console</span>
              </button>
              
              <div className="pt-4 mt-2 border-t border-gray-100 space-y-3">
                <div className="px-4">
                  <span className="block text-xs font-semibold text-gray-900">
                    {currentUser.username}
                  </span>
                  <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
