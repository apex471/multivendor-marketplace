'use client';

import { useState, useEffect, useCallback } from 'react';

interface TicketResponse {
  from: 'customer' | 'admin';
  authorName: string;
  message: string;
  timestamp: string;
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  category: 'payment' | 'order' | 'product' | 'account' | 'other';
  responses: TicketResponse[];
  createdAt: string;
  updatedAt: string;
}

interface Counts { open: number; inProgress: number; resolved: number; closed: number; }

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-cool-gray-700 text-cool-gray-300',
  medium: 'bg-blue-900/40 text-blue-300',
  high: 'bg-orange-900/40 text-orange-300',
  urgent: 'bg-red-900/40 text-red-300',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-900/40 text-yellow-300',
  'in-progress': 'bg-blue-900/40 text-blue-300',
  resolved: 'bg-green-900/40 text-green-300',
  closed: 'bg-gray-700 text-cool-gray-300',
};

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts>({ open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchTickets = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/support?${p}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTickets(data.data.tickets);
      const c = data.data.counts;
      setCounts({ open: c.open, inProgress: c.inProgress, resolved: c.resolved, closed: c.closed });
    } catch { setError('Failed to load tickets.'); }
    finally { setLoading(false); }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const updateTicket = async () => {
    if (!selected) return;
    setActionLoading(selected._id);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ticketId: selected._id, status: newStatus || undefined, reply: reply || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast(data.message || 'Ticket updated');
      setReply('');
      setSelected(null);
      fetchTickets();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-charcoal-800 border border-gold-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Customer Support</h1>
        <p className="text-cool-gray-400 text-sm mt-1">Manage and respond to support tickets</p>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { key: 'open', label: 'Open', value: counts.open, color: 'text-yellow-300' },
          { key: 'in-progress', label: 'In Progress', value: counts.inProgress, color: 'text-blue-300' },
          { key: 'resolved', label: 'Resolved', value: counts.resolved, color: 'text-green-300' },
          { key: 'closed', label: 'Closed', value: counts.closed, color: 'text-cool-gray-300' },
        ].map(({ key, label, value, color }) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            className={`rounded-xl p-4 text-center border transition-all ${statusFilter === key ? 'border-gold-500 ring-1 ring-gold-500' : 'border-charcoal-700'} bg-charcoal-800`}>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-cool-gray-400 mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>}

      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} className="flex gap-2">
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search tickets..."
              className="flex-1 px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500" />
            <button type="submit" className="px-3 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-sm font-semibold">Go</button>
          </form>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Priority</option>
            {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <div className="text-center py-12 text-cool-gray-500">Loading tickets...</div>
          : tickets.length === 0 ? (
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl py-16 text-center">
              <div className="text-4xl mb-3">🎧</div>
              <p className="text-white font-semibold">No tickets found</p>
              <p className="text-cool-gray-400 text-sm mt-1">All clear! No support tickets.</p>
            </div>
          ) : tickets.map(ticket => (
            <div key={ticket._id} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold font-mono text-sm">{ticket.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-charcoal-600 text-cool-gray-300 capitalize">{ticket.category}</span>
                  </div>
                  <div className="text-white font-medium mt-1">{ticket.subject}</div>
                  <div className="text-sm text-cool-gray-400 mt-0.5">
                    {ticket.customerName} · {ticket.customerEmail}
                  </div>
                  <div className="text-xs text-cool-gray-500 mt-0.5 line-clamp-1">{ticket.message}</div>
                  <div className="text-xs text-cool-gray-500 mt-0.5">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                    {ticket.responses.length > 0 && <span className="ml-2">{ticket.responses.length} response{ticket.responses.length !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <button onClick={() => { setSelected(ticket); setNewStatus(ticket.status); setReply(''); }}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white text-sm font-semibold rounded-lg transition-colors shrink-0">
                  Respond
                </button>
              </div>
            </div>
          ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">Ticket: {selected.ticketNumber}</h2>
                <p className="text-cool-gray-400 text-xs mt-0.5">{selected.subject}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-cool-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div className="bg-charcoal-700 rounded-xl p-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-semibold">{selected.customerName}</span>
                  <span className="text-cool-gray-500 text-xs">{selected.customerEmail}</span>
                </div>
                <p className="text-cool-gray-300">{selected.message}</p>
              </div>
              {selected.responses.map((r, i) => (
                <div key={i} className={`rounded-xl p-4 text-sm ${r.from === 'admin' ? 'bg-gold-900/20 border border-gold-800/30' : 'bg-charcoal-700'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-xs ${r.from === 'admin' ? 'text-gold-400' : 'text-cool-gray-300'}`}>
                      {r.from === 'admin' ? '🛡️ Admin' : '👤'} {r.authorName}
                    </span>
                    <span className="text-cool-gray-500 text-xs">{new Date(r.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-cool-gray-300">{r.message}</p>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-charcoal-700 space-y-3 shrink-0">
              <div>
                <label className="block text-xs font-semibold text-cool-gray-400 mb-1.5">Update Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500">
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <textarea value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Write a reply to the customer..." rows={3}
                className="w-full px-4 py-3 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-500 resize-none" />
              <button onClick={updateTicket} disabled={actionLoading === selected._id}
                className="w-full py-3 bg-gold-600 hover:bg-gold-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {actionLoading === selected._id ? 'Sending...' : 'Send Reply & Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
