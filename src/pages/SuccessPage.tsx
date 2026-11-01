import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Receipt, ArrowLeft } from 'lucide-react';
import { fireFullConfetti } from '../utils/confetti';
import { formatINR } from '../utils/currency';

export const SuccessPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const name = searchParams.get('name') || 'Supporter';
  const amount = Number(searchParams.get('amount')) || 500;
  const paymentId = searchParams.get('pid') || '';

  const [colTitle, setColTitle] = useState('Group Fund');

  useEffect(() => {
    fireFullConfetti();
    if (slug) {
      fetch(`/api/c/${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data.collection?.title) setColTitle(data.collection.title);
        })
        .catch(console.error);
    }
  }, [slug]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
        <CheckCircle2 className="w-12 h-12" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black text-white">Payment Received!</h1>
        <p className="text-sm text-slate-300">
          Thank you, <strong className="text-white">{name}</strong>! You contributed{' '}
          <strong className="text-emerald-400 font-mono text-base">{formatINR(amount)}</strong> to{' '}
          <strong className="text-white">"{colTitle}"</strong>.
        </p>
        <p className="text-xs text-slate-400 pt-1">
          Your contribution is recorded on the public ledger and verified.
        </p>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
        {paymentId && (
          <Link
            to={`/receipt/${paymentId}`}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center justify-center gap-1.5 transition-all"
          >
            <Receipt className="w-3.5 h-3.5 text-cyan-400" />
            <span>View Printable Receipt</span>
          </Link>
        )}

        <Link
          to={`/c/${slug}`}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Collection Page</span>
        </Link>
      </div>
    </div>
  );
};
