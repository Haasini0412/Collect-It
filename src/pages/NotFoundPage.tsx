import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-3xl">
        🔍
      </div>
      <h1 className="text-3xl font-extrabold text-white">404 — Page Not Found</h1>
      <p className="text-xs text-slate-400">
        The link you followed may be incorrect, or the collection page has been moved.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
};
