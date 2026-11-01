import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  QrCode,
  Copy,
  Check,
  Share2,
  Trash2,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { Group, Collection, Member, CollectionTheme } from '../types';
import { THEMES } from '../utils/theme';
import { formatINR, formatPhoneDisplay } from '../utils/currency';
import { ImportPanel } from '../components/ImportPanel';

export const GroupPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [collections, setCollections] = useState<Array<Collection & { raised: number; target: number; percent: number; supportersCount: number }>>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab = searchParams.get('tab') === 'members' ? 'members' : 'collections';
  const showImport = searchParams.get('import') === '1';

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const fetchGroupData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${id}`);
      if (res.ok) {
        const json = await res.json();
        setGroup(json.group);
        setCollections(json.collections || []);
        setMembers(json.members || []);
      }
    } catch (e) {
      console.error('Fetch group error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const handleTabChange = (tab: 'collections' | 'members') => {
    setSearchParams({ tab });
  };

  const handleToggleImport = (open: boolean) => {
    if (open) {
      setSearchParams({ tab: 'members', import: '1' });
    } else {
      setSearchParams({ tab: 'members' });
    }
  };

  const handleToggleJoinOpen = async () => {
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/join-toggle`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setGroup({ ...group, joinOpen: json.joinOpen });
      }
    } catch (e) {
      console.error('Toggle join error:', e);
    }
  };

  const handleLoadSampleRoster = async () => {
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/members/sample`, { method: 'POST' });
      if (res.ok) {
        await fetchGroupData();
      }
    } catch (e) {
      console.error('Sample roster error:', e);
    }
  };

  const handleDeleteMembers = async (ids: string[]) => {
    if (!group || ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected member(s)?`)) return;

    try {
      const res = await fetch(`/api/groups/${group.id}/members/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: ids }),
      });
      if (res.ok) {
        setSelectedMemberIds(new Set());
        await fetchGroupData();
      }
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleUpdateMember = async (mid: string, updates: Partial<Member>) => {
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${mid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setEditingMemberId(null);
        await fetchGroupData();
      }
    } catch (e) {
      console.error('Update member error:', e);
    }
  };

  const copyJoinLink = () => {
    if (!group) return;
    const url = `${window.location.origin}/join/${group.joinCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareJoinWhatsApp = () => {
    if (!group) return;
    const url = `${window.location.origin}/join/${group.joinCode}`;
    const text = encodeURIComponent(`Join our group "${group.name}" on CollectIt: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Filter & Paginate Members
  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q))
    );
  });

  const pageSize = 50;
  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelectMember = (mid: string) => {
    const next = new Set(selectedMemberIds);
    if (next.has(mid)) next.delete(mid);
    else next.add(mid);
    setSelectedMemberIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.size === paginatedMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(paginatedMembers.map(m => m.id)));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-40 bg-white/5 rounded-3xl" />
        <div className="h-96 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Group not found</h2>
        <Link to="/dashboard" className="text-xs text-indigo-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/join/${group.joinCode}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl relative overflow-hidden glass-panel border border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-600/20 via-purple-600/10 to-transparent pointer-events-none -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
              {group.emoji}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{group.name}</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {group.type}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                {group.description || 'No description provided.'}
              </p>
              <div className="flex items-center gap-4 pt-2 text-xs text-slate-300 font-mono">
                <span className="font-bold text-white text-sm">{members.length} members</span>
                <span>·</span>
                <span>{collections.length} collections</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowQrModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Invite Link & QR</span>
            </button>
            <Link
              to={`/group/${group.id}/collection/new`}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Collection</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('collections')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'collections'
                ? 'bg-white/10 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Collections ({collections.length})
          </button>
          <button
            onClick={() => handleTabChange('members')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'members'
                ? 'bg-white/10 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Members ({members.length})
          </button>
        </div>

        {activeTab === 'members' && (
          <button
            onClick={() => handleToggleImport(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add People</span>
          </button>
        )}
      </div>

      {/* Tab 1: Collections */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          {collections.length === 0 ? (
            <div className="p-12 glass-panel text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto text-2xl">
                💰
              </div>
              <h3 className="font-bold text-white">No collections in this group yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Use our AI Collection Creator or templates to start gathering funds in seconds.
              </p>
              <div className="pt-2">
                <Link
                  to={`/group/${group.id}/collection/new`}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Create with AI</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.map(col => {
                const themeConfig = THEMES[col.theme] || THEMES.aurora;
                return (
                  <div
                    key={col.id}
                    onClick={() => navigate(`/manage/${col.id}`)}
                    className="p-5 glass-panel hover:border-indigo-500/40 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${themeConfig.gradient}`} />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10">
                          {col.emoji}
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                            {col.title}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {col.mode === 'fixed' ? `₹${col.fixedAmount}/head` : `₹${col.goalAmount} goal`}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        {col.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono font-bold text-white">{formatINR(col.raised)}</span>
                        <span className="text-slate-400 font-mono text-[11px]">of {formatINR(col.target)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${themeConfig.gradient}`}
                          style={{ width: `${col.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                        <span>{col.percent}% · {col.supportersCount} paid</span>
                        <span className="text-indigo-400 group-hover:underline flex items-center gap-1">
                          Manage <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Members */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Self-join link card */}
          <div className="p-5 glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-500/20 bg-indigo-950/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>Self-Join Link & QR for Attendees</span>
                </span>
                <button
                  onClick={handleToggleJoinOpen}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                    group.joinOpen
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {group.joinOpen ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Active (Click to Pause)</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Paused (Click to Open)</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Share this link or display the QR code at student registration desks to let members add themselves.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyJoinLink}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={shareJoinWhatsApp}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => setShowQrModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-all"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>QR Code</span>
              </button>
            </div>
          </div>

          {/* Members Table Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, email, or phone..."
                className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {selectedMemberIds.size > 0 && (
                <button
                  onClick={() => handleDeleteMembers(Array.from(selectedMemberIds))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedMemberIds.size})</span>
                </button>
              )}

              <a
                href={`/api/groups/${group.id}/members/export.csv`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>

              {members.length === 0 && (
                <button
                  onClick={handleLoadSampleRoster}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load Sample Roster (50)</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Table */}
          {members.length === 0 ? (
            <div className="p-12 glass-panel text-center space-y-3">
              <Users className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="font-bold text-white">No members yet in this group</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add members by pasting from WhatsApp/Excel, uploading a CSV, or loading a sample batch of 50 students.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleLoadSampleRoster}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white"
                >
                  Load Sample Roster (50)
                </button>
                <button
                  onClick={() => handleToggleImport(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Add People
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-white/10 rounded-2xl overflow-hidden glass-panel">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            paginatedMembers.length > 0 &&
                            selectedMemberIds.size === paginatedMembers.length
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Source</th>
                      <th className="p-3 w-16 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedMembers.map(member => {
                      const isEditing = editingMemberId === member.id;
                      const isSelected = selectedMemberIds.has(member.id);
                      return (
                        <tr
                          key={member.id}
                          className={`hover:bg-white/[0.02] transition-colors ${
                            isSelected ? 'bg-indigo-500/5' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectMember(member.id)}
                              className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-semibold text-white">
                            {isEditing ? (
                              <input
                                defaultValue={member.name}
                                onBlur={e => handleUpdateMember(member.id, { name: e.target.value })}
                                className="bg-white/10 px-2 py-0.5 rounded text-white text-xs w-full"
                                autoFocus
                              />
                            ) : (
                              <span>{member.name}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {isEditing ? (
                              <input
                                defaultValue={member.email || ''}
                                onBlur={e => handleUpdateMember(member.id, { email: e.target.value })}
                                className="bg-white/10 px-2 py-0.5 rounded text-white text-xs w-full"
                              />
                            ) : (
                              <span>{member.email || '—'}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {isEditing ? (
                              <input
                                defaultValue={member.phone || ''}
                                onBlur={e => handleUpdateMember(member.id, { phone: e.target.value })}
                                className="bg-white/10 px-2 py-0.5 rounded text-white text-xs w-full"
                              />
                            ) : (
                              <span>{formatPhoneDisplay(member.phone) || '—'}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-400">
                              {member.source}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingMemberId(isEditing ? null : member.id)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                                title="Edit inline"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMembers([member.id])}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                title="Delete member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, filteredMembers.length)} of{' '}
                    {filteredMembers.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-mono">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import Drawer Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
            <ImportPanel
              groupId={group.id}
              groupName={group.name}
              existingMembers={members}
              onClose={() => handleToggleImport(false)}
              onImportSuccess={() => {
                fetchGroupData();
                handleToggleImport(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Self-join QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel max-w-sm w-full p-6 text-center space-y-4 border border-white/20">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">Self-Join QR Code</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl mx-auto inline-block shadow-lg">
              <img
                src={`/api/qr/join/${group.joinCode}.png`}
                alt="Join QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <p className="text-xs text-slate-300">
              Anyone scanning this QR will be added directly to{' '}
              <span className="font-semibold text-white">{group.name}</span>.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={`/api/qr/join/${group.joinCode}.png?download=1`}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Print QR (PNG)</span>
              </a>
              <button
                onClick={copyJoinLink}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Join Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
