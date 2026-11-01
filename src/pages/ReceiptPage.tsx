import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { formatINR } from '../utils/currency';

export const ReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/receipt/${id}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center animate-pulse space-y-4">
        <div className="h-6 w-48 bg-white/10 rounded mx-auto" />
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (!data || !data.payment) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Receipt Not Found</h2>
        <Link to="/" className="text-xs text-indigo-400 hover:underline">
          Go Home
        </Link>
      </div>
    );
  }

  const { payment, collection, group } = data;

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
      <div className="flex justify-between items-center print:hidden">
        {collection?.slug ? (
          <Link
            to={`/c/${collection.slug}`}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Collection</span>
          </Link>
        ) : (
          <div />
        )}
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center gap-1.5 transition-all shadow-md"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Printable Receipt Card */}
      <div className="p-8 rounded-3xl glass-panel border border-slate-200 dark:border-white/15 shadow-2xl bg-white dark:bg-[#0c1022] print:bg-white print:text-black print:border-black print:shadow-none space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-white/10 print:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white print:text-black">
                CollectIt
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold print:text-emerald-700">
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
              Official Payment Contribution Receipt
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 print:text-slate-600 block">Status</span>
            <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 print:text-emerald-700 uppercase">
              {payment.status}
            </span>
          </div>
        </div>

        {/* Primary Amount */}
        <div className="text-center py-4 space-y-1 bg-slate-50 dark:bg-white/[0.03] print:bg-slate-50 rounded-2xl border border-slate-200 dark:border-white/5 print:border-slate-200">
          <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 uppercase font-semibold">
            Amount Contributed
          </p>
          <p className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white print:text-black">
            {formatINR(payment.amount)}
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-300 print:text-indigo-700 font-mono">
            Charged via PayPal: ${payment.chargedAmount.toFixed(2)}{' '}
            <span className="text-slate-500">(@ ₹{payment.fxRate}/$1)</span>
          </p>
        </div>

        {/* Details List */}
        <div className="space-y-3 text-xs divide-y divide-white/5 print:divide-slate-200">
          <div className="flex justify-between pt-2">
            <span className="text-slate-400 print:text-slate-600">Contributor:</span>
            <strong className="text-white print:text-black">{payment.payerName}</strong>
          </div>
          {payment.payerEmail && (
            <div className="flex justify-between pt-2">
              <span className="text-slate-400 print:text-slate-600">Email:</span>
              <span className="font-mono text-slate-300 print:text-slate-700">{payment.payerEmail}</span>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <span className="text-slate-400 print:text-slate-600">Collection:</span>
            <span className="font-semibold text-white print:text-black">{collection?.title}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-slate-400 print:text-slate-600">Group:</span>
            <span className="text-slate-300 print:text-slate-700">{group?.name}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-slate-400 print:text-slate-600">Order ID:</span>
            <span className="font-mono text-[11px] text-slate-400 print:text-slate-600">
              {payment.paypalOrderId || payment.id}
            </span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-slate-400 print:text-slate-600">Capture ID:</span>
            <span className="font-mono text-[11px] text-slate-400 print:text-slate-600">
              {payment.paypalCaptureId || 'COMPLETED'}
            </span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-slate-400 print:text-slate-600">Date:</span>
            <span className="font-mono text-slate-300 print:text-slate-700">
              {new Date(payment.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-white/10 print:border-slate-300 text-center text-[10px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-700" />
            <span>Verified PayPal sandbox payment transaction on CollectIt.</span>
          </p>
          <p>Thank you for contributing to your group collection!</p>
        </div>
      </div>
    </div>
  );
};
