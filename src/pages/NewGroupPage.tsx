import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Sparkles, ArrowRight } from 'lucide-react';
import { GroupType } from '../types';

const EMOJI_OPTIONS = ['🎓', '🏠', '🚀', '🏖️', '🎟️', '🎉', '⚽', '🍕', '💻', '💼', '🎸', '🌟'];
const GROUP_TYPES: GroupType[] = ['Class', 'Friends', 'Club', 'Community', 'Fest'];

export const NewGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('Class');
  const [emoji, setEmoji] = useState('🎓');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError('Group name must be at least 2 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          emoji,
          description: description.trim(),
        }),
      });

      if (res.ok) {
        const group = await res.json();
        // Navigate to group page with import tab opened
        navigate(`/group/${group.id}?tab=members&import=1`);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create group.');
      }
    } catch (err: any) {
      setError('Network error while creating group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="p-8 glass-panel space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>Create New Group</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Groups organize members and collections for your class, roommates, or festival.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Group Name & Emoji */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Group Name</label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  className="w-12 h-11 rounded-xl bg-white/5 border border-white/10 text-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  {emoji}
                </button>
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. CS Batch 2026, Roommates 4B, TechFest Team"
                required
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            {/* Quick Emoji Picker */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EMOJI_OPTIONS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                    emoji === em ? 'bg-indigo-600 scale-110 shadow-md' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Group Type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Group Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {GROUP_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                    type === t
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Official money collection channel for our department events & dinners."
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Continue to Add Members'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
