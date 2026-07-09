/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Community, Collection, Document, RepositoryStats } from '../types';
import { Search, FolderOpen, Files, Eye, Download, BookOpen, Star, Calendar, ArrowRight, LayoutGrid, List } from 'lucide-react';

interface PublicHomeProps {
  communities: Community[];
  collections: Collection[];
  documents: Document[];
  stats: RepositoryStats | null;
  onSelectDocument: (id: string) => void;
  onNavigateToSearch: (query: string, filters?: any) => void;
  viewMode: 'grid' | 'list';
  onSetViewMode: (mode: 'grid' | 'list') => void;
  primaryColor: string;
  secondaryColor: string;
  heroTitle?: string;
  heroDesc?: string;
  heroBgImage?: string;
  heroBgColor?: string;
  heroBgOpacity?: string;
  heroBgColorOpacity?: string;
}

export default function PublicHome({
  communities,
  collections,
  documents,
  stats,
  onSelectDocument,
  onNavigateToSearch,
  viewMode,
  onSetViewMode,
  primaryColor,
  secondaryColor,
  heroTitle,
  heroDesc,
  heroBgImage,
  heroBgColor,
  heroBgOpacity,
  heroBgColorOpacity
}: PublicHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);

  const featuredDocs = documents.filter(d => d.isFeatured && d.status === 'Approved');
  const recentDocs = [...documents]
    .filter(d => d.status === 'Approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateToSearch(searchQuery);
  };

  const handleCommunityClick = (commId: string) => {
    if (selectedCommunity === commId) {
      setSelectedCommunity(null);
    } else {
      setSelectedCommunity(commId);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden text-white px-6 py-16 md:py-24 shadow-2xl bg-slate-950">
        {/* Background Color Overlay */}
        <div className="absolute inset-0" style={{ backgroundColor: heroBgColor || '#0f172a', opacity: (Number(heroBgColorOpacity) ?? 100) / 100 }}></div>
        {/* Background Image Overlay */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroBgImage || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000"}')`, opacity: (Number(heroBgOpacity) ?? 10) / 100 }}></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-transparent"></div>
        
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <span className="font-mono text-xs uppercase tracking-widest px-3 py-1 bg-white/10 rounded-full inline-block backdrop-blur-sm" style={{ color: primaryColor }}>
            Global Knowledge Commons
          </span>
          <h1 className="text-3xl md:text-5xl font-sans font-bold tracking-tight text-white leading-tight">
            {heroTitle || (
              <>Institutional Knowledge, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-green-400">Open & Accessible</span> to All</>
            )}
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-sans">
            {heroDesc || 'Search and discover doctoral dissertations, academic theses, peer-reviewed articles, annual reports, and administrative guidelines curated by our academic faculty.'}
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto flex gap-2 p-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by Title, Author, Keyword, Department or DOI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-12 pr-4 py-3 text-white placeholder-slate-400 rounded-xl focus:outline-none focus:ring-0 text-sm md:text-base font-sans"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-semibold text-white transition-all transform active:scale-95 flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              Search
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Popular Search Badges */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <span className="text-xs text-slate-400 font-sans flex items-center">Popular Searches:</span>
            {stats?.searchStats.slice(0, 3).map((item) => (
              <button
                key={item.query}
                onClick={() => onNavigateToSearch(item.query)}
                className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-slate-200 font-sans transition-colors cursor-pointer"
              >
                {item.query}
              </button>
            )) || (
              ['Deep Learning', 'Blockchain', 'HIPAA'].map((term) => (
                <button
                  key={term}
                  onClick={() => onNavigateToSearch(term)}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-slate-200 font-sans transition-colors cursor-pointer"
                >
                  {term}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Numerical Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: Files, label: 'Curated Works', value: stats?.totalDocuments || documents.filter(d => d.status === 'Approved').length, color: primaryColor },
          { icon: Download, label: 'Fulltext Downloads', value: stats?.totalDownloads || 282, color: secondaryColor },
          { icon: Eye, label: 'Metadata Views', value: stats?.totalViews || 923, color: '#1976D2' },
          { icon: FolderOpen, label: 'Academic Sectors', value: communities.length, color: '#7B1FA2' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: stat.color }}></div>
            <div className="flex items-center justify-between">
              <div>
                <span className="block font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                  {stat.label}
                </span>
                <span className="block font-sans font-bold text-2xl sm:text-3xl text-gray-950 mt-1">
                  {stat.value}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 text-gray-500 group-hover:bg-gray-100 transition-colors">
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Communities Browser (Left) vs Featured/Recent (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Communities Hierarchy Browser (Left 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-sans font-bold text-lg text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-gray-500" />
              Sectors & Schools
            </h2>
            <p className="text-xs text-gray-500 font-sans mt-2 mb-4 leading-normal">
              Browse the library structure hierarchically. Expand any sector to discover child collections.
            </p>

            <div className="space-y-3">
              {communities.filter(c => !c.parentId).map((comm) => {
                const subCollections = collections.filter(c => c.communityId === comm.id);
                const isExpanded = selectedCommunity === comm.id;

                return (
                  <div key={comm.id} className="border border-gray-100 rounded-xl overflow-hidden transition-all duration-300">
                    <button
                      onClick={() => handleCommunityClick(comm.id)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100/75 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-sans font-semibold text-sm text-gray-900 block">{comm.name}</span>
                        <span className="font-mono text-[9px] text-gray-400 mt-0.5 block uppercase">
                          {subCollections.length} Collection{subCollections.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90 text-orange-500' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-white space-y-1 border-t border-gray-100 animate-fadeIn">
                        {subCollections.length === 0 ? (
                          <span className="text-xs text-gray-400 block px-3 py-1 font-sans">No collections assigned yet.</span>
                        ) : (
                          subCollections.map((coll) => (
                            <button
                              key={coll.id}
                              onClick={() => onNavigateToSearch('', { communityId: comm.id, collectionId: coll.id })}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-all cursor-pointer"
                            >
                              <span className="truncate">{coll.name}</span>
                              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-500">
                                Browse
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Featured and Recent Publications (Right 8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Featured Publications */}
          {featuredDocs.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-sans font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Featured Publications
                </h2>
                {/* Grid/List Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                  <button
                    onClick={() => onSetViewMode('grid')}
                    className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-950' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSetViewMode('list')}
                    className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-950' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {featuredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => onSelectDocument(doc.id)}
                      className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-xl hover:border-gray-300 transition-all cursor-pointer flex flex-col justify-between h-72 relative"
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
                        <h3 className="font-sans font-bold text-sm text-gray-900 line-clamp-2 hover:text-orange-600 transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-gray-500 font-sans font-medium line-clamp-1">
                          {doc.author}
                        </p>
                        <p className="text-xs text-gray-400 font-sans line-clamp-3 leading-relaxed">
                          {doc.abstract}
                        </p>
                      </div>
                      <div className="border-t border-gray-50 pt-3 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                        <div className="flex gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {doc.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" />
                            {doc.downloadCount}
                          </span>
                        </div>
                        <span className="font-semibold" style={{ color: primaryColor }}>View Record →</span>
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
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                        {featuredDocs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <span
                                  onClick={() => onSelectDocument(doc.id)}
                                  className="font-semibold text-gray-900 block hover:text-orange-600 cursor-pointer text-sm"
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
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => onSelectDocument(doc.id)}
                                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-100 rounded-lg text-gray-700 font-semibold transition-colors cursor-pointer"
                              >
                                View Record
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
          )}

          {/* Recent Publications */}
          <div className="space-y-4">
            <h2 className="font-sans font-bold text-lg text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Recently Uploaded
            </h2>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {recentDocs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm font-sans">
                  No documents found in public archive.
                </div>
              ) : (
                recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDocument(doc.id)}
                    className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer flex justify-between items-start gap-4"
                  >
                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded-full text-green-700 bg-green-50 font-bold uppercase border border-green-100">
                          {communities.find(c => c.id === doc.communityId)?.name || 'Research'}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">{doc.publicationYear}</span>
                      </div>
                      <h3 className="font-sans font-bold text-sm sm:text-base text-gray-950 hover:text-green-700 transition-colors line-clamp-1">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-gray-500 font-sans font-medium">
                        {doc.author} {doc.coAuthors && `· ${doc.coAuthors}`}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 mt-2 flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
