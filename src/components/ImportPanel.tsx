import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Trash2,
  Check,
  X,
  Edit2
} from 'lucide-react';
import { Member } from '../types';
import { normalizePhone, formatPhoneDisplay } from '../utils/currency';
import { fireFullConfetti } from '../utils/confetti';

interface ImportPanelProps {
  groupId: string;
  groupName: string;
  existingMembers?: Member[];
  onImportSuccess?: (count: number) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
}

interface PreviewRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'ready' | 'duplicate' | 'invalid';
  reason?: string;
  selected: boolean;
}

export const ImportPanel: React.FC<ImportPanelProps> = ({
  groupId,
  groupName,
  existingMembers = [],
  onImportSuccess,
  onClose,
  isEmbedded = false,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'contacts' | 'ai'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing roster sets for dedupe
  const existingPhones = new Set<string>();
  const existingEmails = new Set<string>();
  const existingNames = new Set<string>();

  existingMembers.forEach(m => {
    if (m.phone) existingPhones.add(m.phone.slice(-10));
    if (m.email) existingEmails.add(m.email.toLowerCase());
    existingNames.add(m.name.toLowerCase());
  });

  // Evaluate and deduplicate candidate rows
  const evaluateCandidates = (
    candidates: Array<{ name: string; email?: string | null; phone?: string | null }>
  ) => {
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const seenNames = new Set<string>();

    const rows: PreviewRow[] = [];

    candidates.forEach((c, idx) => {
      const name = String(c.name || '').trim();
      const email = c.email ? String(c.email).trim().toLowerCase() : '';
      const phoneNorm = normalizePhone(c.phone) || '';
      const phone10 = phoneNorm ? phoneNorm.slice(-10) : '';

      let status: 'ready' | 'duplicate' | 'invalid' = 'ready';
      let reason = '';

      if (!name || name.length < 2) {
        status = 'invalid';
        reason = 'Name must be at least 2 letters';
      } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status = 'invalid';
        reason = 'Invalid email address format';
      } else if (phone10 && (existingPhones.has(phone10) || seenPhones.has(phone10))) {
        status = 'duplicate';
        reason = 'Phone already exists in roster or batch';
      } else if (email && (existingEmails.has(email) || seenEmails.has(email))) {
        status = 'duplicate';
        reason = 'Email already exists in roster or batch';
      } else if (!phone10 && !email && (existingNames.has(name.toLowerCase()) || seenNames.has(name.toLowerCase()))) {
        status = 'duplicate';
        reason = 'Name already in roster or batch';
      }

      if (status !== 'invalid') {
        if (phone10) seenPhones.add(phone10);
        if (email) seenEmails.add(email);
        seenNames.add(name.toLowerCase());
      }

      rows.push({
        id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        name,
        email,
        phone: phoneNorm,
        status,
        reason,
        selected: status === 'ready', // Auto-uncheck duplicates & invalid
      });
    });

    setPreviewRows(rows);
  };

  // 1. Process Pasted Text (Regex Smart Parser)
  const handleParsePaste = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(?:\+?91[\-\s]?)?[6-9]\d{9}/;

    const parsed: Array<{ name: string; email?: string | null; phone?: string | null }> = [];

    lines.forEach(line => {
      if (/^(name|student name|full name|email|phone|contact|mobile)/i.test(line)) return;

      let cleanLine = line.replace(/^[\d\.\)\-\*\•\s]+/, '').trim();
      if (!cleanLine) return;

      let email: string | null = null;
      const emMatch = cleanLine.match(emailRegex);
      if (emMatch) {
        email = emMatch[0].toLowerCase();
        cleanLine = cleanLine.replace(emMatch[0], ' ');
      }

      let phone: string | null = null;
      const phMatch = cleanLine.match(phoneRegex);
      if (phMatch) {
        phone = phMatch[0].replace(/\D/g, '');
        cleanLine = cleanLine.replace(phMatch[0], ' ');
      }

      let name = cleanLine
        .replace(/[\(\)\[\]\<\>\|\,\;\-\:\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s\.\'-]/g, '')
        .trim();

      if (!name && email) name = email.split('@')[0];

      if (name && (name === name.toUpperCase() || name === name.toLowerCase())) {
        name = name.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }

      if (name && name.length >= 2) {
        parsed.push({ name, email, phone });
      }
    });

    evaluateCandidates(parsed);
  };

  // 2. Process File Upload (CSV, XLSX, XLS, TXT)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        if (!json || json.length === 0) {
          setErrorMsg('Uploaded file appears to be empty.');
          return;
        }

        let headerRow = json[0] as string[];
        let startRowIndex = 1;

        // Auto map header column indexes
        let nameCol = -1;
        let emailCol = -1;
        let phoneCol = -1;

        if (Array.isArray(headerRow)) {
          headerRow.forEach((col, idx) => {
            const h = String(col || '').toLowerCase().trim();
            if (/name|student|person|member/i.test(h) && nameCol === -1) nameCol = idx;
            if (/email|mail/i.test(h) && emailCol === -1) emailCol = idx;
            if (/phone|mobile|contact|cell|whatsapp/i.test(h) && phoneCol === -1) phoneCol = idx;
          });
        }

        // If no headers matched, column 0 is name, column 1 is email/phone
        if (nameCol === -1) {
          nameCol = 0;
          emailCol = 1;
          phoneCol = 2;
          startRowIndex = 0;
        }

        const candidates: Array<{ name: string; email?: string | null; phone?: string | null }> = [];
        for (let i = startRowIndex; i < json.length; i++) {
          const row = json[i] as any[];
          if (!row || row.length === 0) continue;

          const rawName = row[nameCol] !== undefined ? String(row[nameCol]).trim() : '';
          const rawEmail = emailCol !== -1 && row[emailCol] !== undefined ? String(row[emailCol]).trim() : '';
          const rawPhone = phoneCol !== -1 && row[phoneCol] !== undefined ? String(row[phoneCol]).trim() : '';

          if (rawName && rawName.length >= 2) {
            candidates.push({
              name: rawName,
              email: rawEmail || null,
              phone: rawPhone || null,
            });
          }
        }

        evaluateCandidates(candidates);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setErrorMsg('Failed to parse sheet file. Please check file format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3. Process AI Clean-up
  const handleAiCleanup = async () => {
    if (!pastedText.trim()) {
      setErrorMsg('Please paste messy roster text first in the box below.');
      return;
    }
    try {
      setLoadingAi(true);
      setErrorMsg(null);
      const res = await fetch('/api/ai/parse-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pastedText }),
      });
      const data = await res.json();
      if (data.members && Array.isArray(data.members)) {
        evaluateCandidates(data.members);
      } else {
        handleParsePaste();
      }
    } catch (err) {
      console.error('AI clean-up error:', err);
      handleParsePaste();
    } finally {
      setLoadingAi(false);
    }
  };

  // 4. Contact Picker API
  const handlePickContacts = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'email', 'tel'];
        const contacts = await (navigator as any).contacts.select(props, { multiple: true });
        if (contacts && contacts.length > 0) {
          const candidates = contacts.map((c: any) => ({
            name: c.name?.[0] || 'Contact',
            email: c.email?.[0] || null,
            phone: c.tel?.[0] || null,
          }));
          evaluateCandidates(candidates);
        }
      } catch (e) {
        console.warn('Contact picker cancelled or failed:', e);
      }
    } else {
      setErrorMsg('Contact Picker is supported on Android Chrome. Alternatively, use Paste or CSV Upload.');
    }
  };

  // Download Sample CSV
  const downloadSampleCSV = () => {
    const csvContent =
      'Name,Email,Phone\n' +
      'Aarav Sharma,aarav@college.edu,9876543210\n' +
      'Priya Patel,priya@college.edu,9876543211\n' +
      'Rohan Mehta,rohan@college.edu,9876543212\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_members_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Row selection helpers
  const readyCount = previewRows.filter(r => r.selected && r.status === 'ready').length;
  const duplicateCount = previewRows.filter(r => r.status === 'duplicate').length;
  const invalidCount = previewRows.filter(r => r.status === 'invalid').length;

  const toggleSelectAll = (select: boolean) => {
    setPreviewRows(prev =>
      prev.map(r => ({
        ...r,
        selected: select ? r.status === 'ready' : false,
      }))
    );
  };

  const removeDuplicates = () => {
    setPreviewRows(prev => prev.filter(r => r.status !== 'duplicate'));
  };

  const toggleRow = (id: string) => {
    setPreviewRows(prev =>
      prev.map(r => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleUpdateRow = (id: string, updates: Partial<PreviewRow>) => {
    setPreviewRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        // Revalidate on edit
        if (!updated.name || updated.name.length < 2) {
          updated.status = 'invalid';
          updated.reason = 'Name must be at least 2 letters';
        } else {
          updated.status = 'ready';
          updated.reason = '';
          updated.selected = true;
        }
        return updated;
      })
    );
    setEditingRowId(null);
  };

  const deleteRow = (id: string) => {
    setPreviewRows(prev => prev.filter(r => r.id !== id));
  };

  // Submit Ready Members
  const handleConfirmImport = async () => {
    const toSubmit = previewRows
      .filter(r => r.selected && r.status === 'ready')
      .map(r => ({
        name: r.name,
        email: r.email || null,
        phone: r.phone || null,
      }));

    if (toSubmit.length === 0) {
      setErrorMsg('No ready members selected for import.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/groups/${groupId}/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members: toSubmit,
          source: activeTab === 'ai' ? 'ai' : activeTab === 'upload' ? 'file' : 'paste',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        fireFullConfetti();
        setSuccessMsg(`🎉 Successfully added ${data.added} people to ${groupName}!`);
        setPreviewRows([]);
        setPastedText('');
        if (onImportSuccess) onImportSuccess(data.added);
        if (onClose) {
          setTimeout(onClose, 1600);
        }
      } else {
        setErrorMsg(data.error || 'Failed to import members.');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg('Network error while saving members.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`w-full ${isEmbedded ? '' : 'p-6 max-w-4xl mx-auto'}`}>
      <div className="flex items-center justify-between pb-4 border-b border-white/10 dark:border-white/10 light:border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-2">
            <span>Bulk Member Import</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Up to 5,000 members
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Add your batch, club, or festival attendees in seconds. We auto-format and deduplicate.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-2 mt-5 p-1 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200">
        <button
          onClick={() => setActiveTab('paste')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'paste'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span>Paste List</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'upload'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('contacts');
            handlePickContacts();
          }}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'contacts'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>📱 Contacts</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'ai'
              ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>✨ AI Clean-up</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste names, emails, phones from Excel, WhatsApp, or Google Sheets...&#10;e.g.&#10;Aarav Sharma, 9876543210, aarav@college.edu&#10;Priya Patel, priya@college.edu&#10;Rohan Mehta"
              rows={5}
              className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-y"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                Supports comma, tab, semicolon or newline separators.
              </span>
              <button
                onClick={handleParsePaste}
                disabled={!pastedText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-600/30"
              >
                Preview List
              </button>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-indigo-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white/5 hover:bg-white/[0.07]"
            >
              <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                Click or drag & drop CSV or Excel spreadsheet
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports .csv, .xlsx, .xls, .txt (Max 5,000 rows)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download sample CSV</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
            <Smartphone className="w-10 h-10 text-indigo-400 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">Pick from Phone Contacts</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Select members directly from your mobile contact address book.
            </p>
            <button
              onClick={handlePickContacts}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
            >
              Open Contact Selector
            </button>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-amber-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-purple-100">AI Clean-up Mode:</span>
                <p className="text-[11px] text-purple-300 mt-0.5">
                  Paste unstructured notes, WhatsApp groups messages, or emails. Gemini AI fixes capitalization, strips emojis/bullets, and structures into members.
                </p>
              </div>
            </div>
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste messy text:&#10;1) AARAV SHARMA (9876543210)&#10;2. Priya Patel - priya@college.edu&#10;• Rohan Mehta | 9876543212"
              rows={4}
              className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-y"
            />
            <div className="flex justify-end">
              <button
                onClick={handleAiCleanup}
                disabled={loadingAi || !pastedText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-purple-600/25"
              >
                {loadingAi ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gemini is cleaning list...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Clean with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error or Success Notice */}
      {errorMsg && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Preview Table */}
      {previewRows.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-200">
                Preview ({previewRows.length})
              </span>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-emerald-400 font-semibold">{readyCount} ready</span>
                <span className="text-slate-500">·</span>
                <span className="text-amber-400 font-semibold">{duplicateCount} duplicates</span>
                <span className="text-slate-500">·</span>
                <span className="text-rose-400 font-semibold">{invalidCount} invalid</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleSelectAll(true)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Select all
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => toggleSelectAll(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Select none
              </button>
              {duplicateCount > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={removeDuplicates}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove duplicates
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="border border-white/10 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white/5 text-slate-400 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-2.5 w-10 text-center">✓</th>
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Email</th>
                  <th className="p-2.5">Phone</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 w-16 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {previewRows.map(row => {
                  const isEditing = editingRowId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        row.status === 'duplicate' ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={row.status === 'invalid'}
                          onChange={() => toggleRow(row.id)}
                          className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      <td className="p-2.5 font-medium text-slate-200">
                        {isEditing ? (
                          <input
                            defaultValue={row.name}
                            onBlur={e => handleUpdateRow(row.id, { name: e.target.value })}
                            className="bg-white/10 px-2 py-0.5 rounded text-white text-xs w-full"
                            autoFocus
                          />
                        ) : (
                          <span>{row.name}</span>
                        )}
                      </td>

                      <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                        {isEditing ? (
                          <input
                            defaultValue={row.email}
                            onBlur={e => handleUpdateRow(row.id, { email: e.target.value })}
                            className="bg-white/10 px-2 py-0.5 rounded text-white text-xs w-full"
                          />
                        ) : (
                          <span>{row.email || '—'}</span>
                        )}
                      </td>

                      <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                        {isEditing ? (
                          <input
                            defaultValue={row.phone}
                            onBlur={e => handleUpdateRow(row.id, { phone: e.target.value })}
                            className="bg-white/10 px-2 py-0.5 rounded text-white text-xs w-full"
                          />
                        ) : (
                          <span>{formatPhoneDisplay(row.phone) || '—'}</span>
                        )}
                      </td>

                      <td className="p-2.5">
                        {row.status === 'ready' && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                        {row.status === 'duplicate' && (
                          <span
                            title={row.reason}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold"
                          >
                            <AlertTriangle className="w-3 h-3" /> Duplicate
                          </span>
                        )}
                        {row.status === 'invalid' && (
                          <span
                            title={row.reason}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold"
                          >
                            <XCircle className="w-3 h-3" /> Invalid
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingRowId(isEditing ? null : row.id)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                            title="Edit row"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRow(row.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Delete row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Confirm Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleConfirmImport}
              disabled={submitting || readyCount === 0}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding members...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Add {readyCount} people to {groupName}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
