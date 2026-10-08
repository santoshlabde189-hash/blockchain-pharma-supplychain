import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

export function Dashboard({ user }: { user: any }) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [inv, ships] = await Promise.all([
          apiRequest('/inventory').catch(() => []),
          apiRequest('/shipments').catch(() => [])
        ]);
        setInventory(inv);
        setShipments(ships);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supply Chain Dashboard</h1>
          <p className="text-sm text-slate-500">
            Organization: <span className="font-semibold">{user.orgId}</span> | Role: <span className="font-semibold">{user.role}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Items in Custody</span>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">{inventory.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Active Shipments</span>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">
            {shipments.filter(s => s.status === 'IN_TRANSIT').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Completed Deliveries</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">
            {shipments.filter(s => s.status === 'RECEIVED').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Current Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-xs">
                <th className="px-6 py-3 font-semibold">Serial</th>
                <th className="px-6 py-3 font-semibold">Batch</th>
                <th className="px-6 py-3 font-semibold">Packaging Level</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map(item => (
                <tr key={item.serial} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-800">{item.serial}</td>
                  <td className="px-6 py-3 text-slate-600">{item.batchId}</td>
                  <td className="px-6 py-3 text-slate-600">{item.level}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No items in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
