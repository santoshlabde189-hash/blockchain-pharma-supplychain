import React, { useState } from 'react';
import { apiRequest } from '../services/api';

export function PublicVerify() {
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await apiRequest(`/verify?serial=${encodeURIComponent(serial.trim())}`);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GENUINE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISPENSED': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'RECALLED': return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'EXPIRED': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 text-white rounded-2xl shadow-md mb-4">
            <span className="text-2xl font-bold tracking-tight">PT</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">PharmaTrace Authenticity Verification</h1>
          <p className="text-slate-500 mt-2">Enter drug pack serial number or scan DataMatrix QR</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="serial" className="block text-sm font-medium text-slate-700 mb-1">
                Serial Number
              </label>
              <input
                id="serial"
                type="text"
                placeholder="e.g. LOT2026A01-SN-000001"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition duration-150 disabled:opacity-50"
            >
              {loading ? 'Verifying on Ledger...' : 'Verify Product'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 border-t border-slate-100 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(result.status)}`}>
                  {result.status}
                </span>
              </div>

              {result.status !== 'UNKNOWN' && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                    <div>
                      <span className="block text-xs text-slate-400">Product Name</span>
                      <span className="font-semibold text-slate-800">{result.product || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400">Manufacturer</span>
                      <span className="font-semibold text-slate-800">{result.manufacturer || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400">Batch / Lot ID</span>
                      <span className="font-semibold text-slate-800">{result.batchId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400">Expiry Date</span>
                      <span className="font-semibold text-slate-800">{result.expDate || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                    <span>Verified on Hyperledger Fabric</span>
                    <span className="font-mono font-semibold">Ledger Block Verified</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
