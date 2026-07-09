/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Document, DocumentFile, DocumentVersion } from '../types';
import { Download, Eye, FileText, Calendar, Shield, Share2, Clipboard, RefreshCw, Cpu, Star, ArrowLeft, Edit2, Trash2, Database, Save, X, CheckCircle, XCircle } from 'lucide-react';

interface DocumentDetailProps {
  documentId: string;
  onBack: () => void;
  onSelectDocument: (id: string) => void;
  currentUser: { id: string; username: string; role: string } | null;
  allDocuments: Document[];
  primaryColor: string;
  secondaryColor: string;
  onRefreshData?: () => void;
}

export default function DocumentDetail({
  documentId,
  onBack,
  onSelectDocument,
  currentUser,
  allDocuments,
  primaryColor,
  secondaryColor,
  onRefreshData
}: DocumentDetailProps) {
  const [docDetail, setDocDetail] = useState<{
    document: Document;
    files: DocumentFile[];
    versions: DocumentVersion[];
    community: { name: string } | null;
    collection: { name: string } | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [citationFormat, setCitationFormat] = useState<'APA' | 'Harvard' | 'IEEE' | 'MLA' | 'Chicago'>('APA');
  const [citationText, setCitationText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Moderation Review States
  const [detailReviewComment, setDetailReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleDetailReviewDecision = async (action: 'Approved' | 'Rejected') => {
    if (!currentUser) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/workflow/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          reviewerId: currentUser.id,
          reviewerName: currentUser.username,
          action,
          comment: detailReviewComment
        })
      });
      if (res.ok) {
        setDetailReviewComment('');
        fetchDocumentData();
        if (onRefreshData) onRefreshData();
        alert(`Workflow submission ${action.toUpperCase()} completed successfully.`);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit review decision.');
      }
    } catch (e) {
      console.error(e);
      alert('Error submitting review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // AI Summary States
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // PDF Preview State
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 4;

  // Edit / Delete Item (Document) States & Handlers
  const [isEditing, setIsEditing] = useState(false);
  const [communitiesList, setCommunitiesList] = useState<{ id: string; name: string }[]>([]);
  const [collectionsList, setCollectionsList] = useState<{ id: string; name: string; communityId: string }[]>([]);
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    coAuthors: '',
    department: '',
    faculty: '',
    keywords: '',
    abstract: '',
    description: '',
    publicationYear: 2026,
    language: 'English',
    publisher: '',
    isbn: '',
    issn: '',
    doi: '',
    rightsStatement: 'Creative Commons Attribution 4.0 International',
    communityId: '',
    collectionId: '',
    status: 'Approved'
  });

  useEffect(() => {
    if (isEditing) {
      fetch('/api/communities')
        .then(r => r.json())
        .then(data => setCommunitiesList(data))
        .catch(err => console.error(err));
      fetch('/api/collections')
        .then(r => r.json())
        .then(data => setCollectionsList(data))
        .catch(err => console.error(err));
    }
  }, [isEditing]);

  const handleStartEditing = () => {
    if (!docDetail?.document) return;
    const d = docDetail.document;
    setEditForm({
      title: d.title || '',
      author: d.author || '',
      coAuthors: d.coAuthors || '',
      department: d.department || '',
      faculty: d.faculty || '',
      keywords: d.keywords || '',
      abstract: d.abstract || '',
      description: d.description || '',
      publicationYear: d.publicationYear || new Date().getFullYear(),
      language: d.language || 'English',
      publisher: d.publisher || '',
      isbn: d.isbn || '',
      issn: d.issn || '',
      doi: d.doi || '',
      rightsStatement: d.rightsStatement || 'Creative Commons Attribution 4.0 International',
      communityId: d.communityId || '',
      collectionId: d.collectionId || '',
      status: d.status || 'Approved'
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        setIsEditing(false);
        fetchDocumentData();
        if (onRefreshData) onRefreshData();
        alert('Document metadata updated successfully.');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update document.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async () => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to permanently delete this item from the repository? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username
        })
      });
      if (res.ok) {
        alert('Document deleted successfully.');
        if (onRefreshData) onRefreshData();
        onBack(); // Go back to search list
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete document.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocumentData();
  }, [documentId]);

  const fetchDocumentData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'x-user-id': currentUser?.id || 'public',
          'x-user-role': currentUser?.role || 'Public User'
        }
      });
      const data = await response.json();
      setDocDetail(data);

      // Check favorite status
      if (currentUser) {
        const favRes = await fetch(`/api/favorites/${currentUser.id}`);
        const favs: Document[] = await favRes.json();
        setIsFavorited(favs.some(f => f.id === documentId));
      }

      // Generate initial citation
      if (data.document) {
        generateCitation(data.document, 'APA');
      }
    } catch (e) {
      console.error('Error fetching document details', e);
    } finally {
      setLoading(false);
    }
  };

  const generateCitation = (doc: Document, format: typeof citationFormat) => {
    const authors = doc.author;
    const year = doc.publicationYear;
    const title = doc.title;
    const publisher = doc.publisher || 'CORE Academic Press';
    const doiStr = doc.doi ? `, doi:${doc.doi}` : '';

    let citation = '';
    switch (format) {
      case 'APA':
        citation = `${authors}. (${year}). ${title}. ${publisher}.${doiStr}`;
        break;
      case 'Harvard':
        citation = `${authors}, ${year}. ${title}. ${publisher}. Available at: institutional-repository/doc/${doc.id}.`;
        break;
      case 'IEEE':
        citation = `${authors}, "${title}," ${publisher}, ${year}.${doc.doi ? ` DOI: ${doc.doi}` : ''}`;
        break;
      case 'MLA':
        citation = `${authors}. "${title}." ${publisher}, ${year}.`;
        break;
      case 'Chicago':
        citation = `${authors}. "${title}." ${publisher}, ${year}.${doc.doi ? ` https://doi.org/${doc.doi}` : ''}`;
        break;
    }
    setCitationText(citation);
  };

  const handleCitationChange = (format: typeof citationFormat) => {
    setCitationFormat(format);
    if (docDetail?.document) {
      generateCitation(docDetail.document, format);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFavorite = async () => {
    if (!currentUser) {
      alert('Please log in to save favorites.');
      return;
    }
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, documentId })
      });
      const data = await res.json();
      setIsFavorited(data.action === 'added');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = async () => {
    if (!docDetail) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'public',
          username: currentUser?.username || 'Public Visitor'
        })
      });
      const data = await res.json();

      // Trigger robust file download from express using our new download-file endpoint
      if (data.success && data.file) {
        const link = document.createElement('a');
        link.href = `/api/documents/${documentId}/download-file`;
        link.setAttribute('download', data.file.fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Refresh download count in view
        setDocDetail(prev => {
          if (!prev) return null;
          return {
            ...prev,
            document: {
              ...prev.document,
              downloadCount: prev.document.downloadCount + 1
            }
          };
        });
      }
    } catch (e) {
      console.error('Error launching file download', e);
    }
  };

  // Triggers server-side Gemini summary endpoint
  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    setSummaryError('');
    try {
      const res = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      });
      const data = await res.json();
      if (data.success) {
        setAiSummary(data.summary);
      } else {
        setSummaryError(data.message || 'Unable to communicate with AI model.');
      }
    } catch (e) {
      setSummaryError('Network error connecting to Gemini summarizer service.');
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        <span className="text-sm text-gray-500 font-mono">Loading digital collection artifact...</span>
      </div>
    );
  }

  if (!docDetail) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-gray-500 text-sm">Failed to locate document record.</p>
        <button onClick={onBack} className="px-4 py-2 border rounded-xl font-medium text-xs">Back to Search</button>
      </div>
    );
  }

  const { document: doc, files, versions, community, collection } = docDetail;

  // Gather related documents from same collection
  const relatedDocs = allDocuments
    .filter(d => d.collectionId === doc.collectionId && d.id !== doc.id && d.status === 'Approved')
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Back Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-150 rounded-xl text-gray-700 font-semibold text-xs shadow-sm cursor-pointer transition-all active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Archive Directory
      </button>

      {/* Main Grid: Document Metadata/Abstract/AI vs PDF Preview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Metadata, Abstract, AI Summary, Citations (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {currentUser && (currentUser.role === 'Administrator' || currentUser.role === 'Repository Manager' || currentUser.role === 'Librarian') && (
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-5 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500 text-white uppercase tracking-wider">
                    Institutional Moderation Console
                  </span>
                  <h3 className="font-sans font-extrabold text-sm text-white mt-1">Curation Workflow Control</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-mono">Current Status</span>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-0.5 uppercase ${
                    doc.status === 'Approved' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                    doc.status === 'Rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                    'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Review / Curation Comments & Feedback
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter review feedback, copyright clearance notes, indexing corrections, or revision suggestions for the submitter..."
                    value={detailReviewComment}
                    onChange={(e) => setDetailReviewComment(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 text-white resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={isSubmittingReview}
                    onClick={() => handleDetailReviewDecision('Approved')}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-900/10"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve & Index
                  </button>
                  <button
                    disabled={isSubmittingReview}
                    onClick={() => handleDetailReviewDecision('Rejected')}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-rose-900/10"
                  >
                    <XCircle className="w-4 h-4" /> Decline & Return
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full text-orange-700 bg-orange-50 font-bold uppercase border border-orange-100">
                  {community?.name || 'Academic School'}
                </span>
                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full text-green-700 bg-green-50 font-bold uppercase border border-green-100">
                  {collection?.name || 'Research Papers'}
                </span>
                <span className="font-mono text-xs text-gray-400 font-semibold">
                  Published {doc.publicationYear}
                </span>
              </div>

              <h1 className="font-sans font-bold text-xl sm:text-2xl text-gray-950 leading-tight">
                {doc.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-gray-500 pt-1">
                <span className="font-semibold text-gray-900">Lead Author: {doc.author}</span>
                {doc.coAuthors && <span className="text-gray-400">Co-Authors: {doc.coAuthors}</span>}
              </div>
            </div>

            {/* Metrics HUD */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-center">
                <span className="block font-mono text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Views</span>
                <span className="font-sans font-bold text-base sm:text-lg text-gray-900 flex items-center justify-center gap-1 mt-0.5">
                  <Eye className="w-4 h-4 text-gray-400" />
                  {doc.viewCount}
                </span>
              </div>
              <div className="text-center border-x border-gray-150">
                <span className="block font-mono text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Downloads</span>
                <span className="font-sans font-bold text-base sm:text-lg text-gray-900 flex items-center justify-center gap-1 mt-0.5">
                  <Download className="w-4 h-4 text-gray-400" />
                  {doc.downloadCount}
                </span>
              </div>
              <div className="text-center">
                <span className="block font-mono text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Version</span>
                <span className="font-sans font-bold text-base sm:text-lg text-gray-900 flex items-center justify-center gap-1 mt-0.5">
                  <Shield className="w-4 h-4 text-gray-400" />
                  v{versions.length || 1}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownload}
                className="flex-grow sm:flex-grow-0 px-6 py-3 rounded-xl font-semibold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <Download className="w-5 h-5" />
                Download Fulltext File
              </button>

              <button
                onClick={toggleFavorite}
                className={`px-4 py-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isFavorited
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Star className={`w-5 h-5 ${isFavorited ? 'fill-amber-500 text-amber-500' : ''}`} />
                {isFavorited ? 'Favourited' : 'Add to Locker'}
              </button>

              {currentUser && (currentUser.role === 'Administrator' || currentUser.role === 'Repository Manager' || currentUser.role === 'Librarian' || doc.submitterId === currentUser.id) && (
                <>
                  <button
                    onClick={handleStartEditing}
                    className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-5 h-5 text-orange-500" />
                    Edit Metadata
                  </button>

                  <button
                    onClick={handleDeleteDocument}
                    className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Item
                  </button>
                </>
              )}
            </div>

            {/* Abstract */}
            <div className="space-y-2 pt-4 border-t border-gray-50">
              <h3 className="font-sans font-bold text-sm text-gray-900">Abstract</h3>
              <p className="text-xs sm:text-sm text-gray-600 font-sans leading-relaxed text-justify">
                {doc.abstract}
              </p>
            </div>

            {/* Keywords */}
            <div className="space-y-1 pt-2">
              <h4 className="font-sans font-bold text-xs text-gray-500">Subject Keywords</h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {doc.keywords.split(',').map((kw, i) => (
                  <span key={i} className="text-[10px] font-sans px-2.5 py-1 bg-gray-100 rounded-lg text-gray-600 font-medium">
                    {kw.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>



          {/* Citation Generator */}
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-sans font-bold text-sm text-gray-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-gray-500" />
                Scholarly Citation Generator
              </h3>
              <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">5 Formats</span>
            </div>

            <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-xl border border-gray-150">
              {(['APA', 'Harvard', 'IEEE', 'MLA', 'Chicago'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleCitationChange(fmt)}
                  className={`flex-grow px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer ${
                    citationFormat === fmt
                      ? 'bg-white shadow-sm text-gray-950 border border-gray-100'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <div className="relative p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <p className="text-xs font-mono text-gray-700 leading-relaxed pr-8">{citationText}</p>
              <button
                onClick={copyToClipboard}
                title="Copy Citation"
                className="absolute right-2 top-2 p-1.5 bg-white border border-gray-150 rounded-lg text-gray-500 hover:text-gray-900 transition-colors shadow-sm cursor-pointer"
              >
                <Clipboard className="w-4 h-4" />
              </button>
              {copied && (
                <span className="absolute bottom-2 right-2 font-mono text-[10px] bg-green-500 text-white px-2 py-0.5 rounded font-bold animate-fadeIn">
                  Copied!
                </span>
              )}
            </div>
          </div>

          {/* Dublin Core Metadata Table */}
          <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-sans font-bold text-sm text-gray-900 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-gray-500" />
                Dublin Core Metadata Schema
              </h3>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-gray-150 text-gray-600 font-bold uppercase">
                OAI-PMH Compliant
              </span>
            </div>

            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-gray-100 text-xs font-sans text-gray-700">
                {[
                  { label: 'dc.title', val: doc.title },
                  { label: 'dc.creator', val: doc.author },
                  { label: 'dc.contributor', val: doc.coAuthors || 'None Specified' },
                  { label: 'dc.subject', val: doc.keywords },
                  { label: 'dc.description.abstract', val: doc.abstract },
                  { label: 'dc.date.issued', val: doc.publicationYear.toString() },
                  { label: 'dc.language.iso', val: doc.language },
                  { label: 'dc.publisher', val: doc.publisher || 'Not Published' },
                  { label: 'dc.identifier.doi', val: doc.doi || 'None' },
                  { label: 'dc.identifier.isbn', val: doc.isbn || 'None' },
                  { label: 'dc.identifier.issn', val: doc.issn || 'None' },
                  { label: 'dc.rights', val: doc.rightsStatement },
                  { label: 'dc.department', val: doc.department },
                  { label: 'dc.faculty', val: doc.faculty }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-mono text-[10px] text-gray-400 font-bold bg-gray-50/20 w-44">{row.label}</td>
                    <td className="px-6 py-3 text-gray-700">{row.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Live Document Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
          <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[450px] sm:h-[640px]">
            {/* Document Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-sans font-bold text-xs text-gray-900 truncate" title={files[0]?.fileName || 'manuscript_document.pdf'}>
                  {files[0]?.fileName || 'manuscript_document.pdf'}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                {files[0]?.mimeType?.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
              </span>
            </div>

            {/* Live PDF/Document Content Viewer */}
            <div className="flex-grow bg-slate-100 relative">
              {files && files[0] ? (
                <iframe
                  src={files[0].filePath}
                  className="w-full h-full border-none bg-white"
                  title="Academic Manuscript Viewer"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <FileText className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-xs font-semibold">No manuscript file associated with this item.</p>
                </div>
              )}
            </div>

            {/* Document Footer Controls */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-400">
                Size: {files[0]?.fileSize ? `${(files[0].fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
              </span>

              <button
                onClick={handleDownload}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download File
              </button>
            </div>
          </div>

          {/* Related Documents */}
          {relatedDocs.length > 0 && (
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-sans font-bold text-sm text-gray-900 border-b border-gray-50 pb-2">
                Related Documents in Collection
              </h3>
              <div className="space-y-3">
                {relatedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDocument(doc.id)}
                    className="p-3 bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-xl cursor-pointer transition-colors space-y-1 block"
                  >
                    <h4 className="font-sans font-bold text-xs text-gray-950 line-clamp-1 hover:text-orange-600">
                      {doc.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-sans line-clamp-1">{doc.author} · {doc.publicationYear}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-150 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-orange-500" />
                <h3 className="font-sans font-bold text-base text-gray-950">Edit Item Metadata</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Item Title</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Author */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Primary Author</label>
                  <input
                    type="text"
                    required
                    value={editForm.author}
                    onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Co-Authors */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Co-Authors</label>
                  <input
                    type="text"
                    value={editForm.coAuthors}
                    onChange={(e) => setEditForm({ ...editForm, coAuthors: e.target.value })}
                    placeholder="e.g. Dr. Jane Doe, Prof. Alan Smith"
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Community (Sector) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Community Sector</label>
                  <select
                    required
                    value={editForm.communityId}
                    onChange={(e) => setEditForm({ ...editForm, communityId: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Select Community...</option>
                    {communitiesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Collection (Archive) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Collection Archive</label>
                  <select
                    required
                    value={editForm.collectionId}
                    onChange={(e) => setEditForm({ ...editForm, collectionId: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Select Collection...</option>
                    {collectionsList
                      .filter(coll => !editForm.communityId || coll.communityId === editForm.communityId)
                      .map(coll => (
                        <option key={coll.id} value={coll.id}>{coll.name}</option>
                      ))}
                  </select>
                </div>

                {/* Abstract */}
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Abstract</label>
                  <textarea
                    rows={4}
                    required
                    value={editForm.abstract}
                    onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500 resize-none"
                  ></textarea>
                </div>

                {/* Description */}
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Description / Scope Notes</label>
                  <textarea
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500 resize-none"
                  ></textarea>
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Department</label>
                  <input
                    type="text"
                    required
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Faculty */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Faculty / Division</label>
                  <input
                    type="text"
                    required
                    value={editForm.faculty}
                    onChange={(e) => setEditForm({ ...editForm, faculty: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Keywords */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Keywords (Comma Separated)</label>
                  <input
                    type="text"
                    required
                    value={editForm.keywords}
                    onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Publication Year */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Publication Year</label>
                  <input
                    type="number"
                    required
                    value={editForm.publicationYear}
                    onChange={(e) => setEditForm({ ...editForm, publicationYear: parseInt(e.target.value) || 2026 })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Language */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Language</label>
                  <input
                    type="text"
                    required
                    value={editForm.language}
                    onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Publisher */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Publisher</label>
                  <input
                    type="text"
                    value={editForm.publisher}
                    onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* ISBN */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">ISBN</label>
                  <input
                    type="text"
                    value={editForm.isbn}
                    onChange={(e) => setEditForm({ ...editForm, isbn: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* ISSN */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">ISSN</label>
                  <input
                    type="text"
                    value={editForm.issn}
                    onChange={(e) => setEditForm({ ...editForm, issn: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* DOI */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">DOI URI Identifier</label>
                  <input
                    type="text"
                    value={editForm.doi}
                    onChange={(e) => setEditForm({ ...editForm, doi: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Rights Statement */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Rights / License Statement</label>
                  <input
                    type="text"
                    required
                    value={editForm.rightsStatement}
                    onChange={(e) => setEditForm({ ...editForm, rightsStatement: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-gray-400 font-bold uppercase">Curation Status</label>
                  <select
                    required
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-sans focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="Submitted">Submitted (Pending Moderation)</option>
                    <option value="Approved">Approved (Published)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl cursor-pointer transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
