'use client';

import { useState, useEffect, useCallback } from 'react';

interface WaitlistEntry {
  id: string;
  name?: string;
  email: string;
  role: 'vendor' | 'brand' | 'both';
  storeName?: string;
  businessCategory?: string;
  website?: string;
  instagram?: string;
  experienceYears?: string;
  inventorySize?: string;
  city?: string;
  country?: string;
  brandName?: string;
  trademarkNumber?: string;
  brandDescription?: string;
  targetAudience?: string;
  yearEstablished?: string;
  status: 'pending' | 'approved' | 'rejected' | 'link_sent';
  adminNotes?: string;
  createdAt: string;
}

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
  linkSent: number;
  total: number;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0, linkSent: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected entry for details modal
  const [selected, setSelected] = useState<WaitlistEntry | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'send_link' | 'reject'; entry: WaitlistEntry } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedApprovedRole, setSelectedApprovedRole] = useState<'vendor' | 'brand'>('vendor');

  // Creation modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<'vendor' | 'brand' | 'both'>('vendor');
  const [createStoreName, setCreateStoreName] = useState('');
  const [createBrandName, setCreateBrandName] = useState('');
  const [createWebsite, setCreateWebsite] = useState('');
  const [createIsSubmitting, setCreateIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createEmail.includes('@')) {
      setCreateError('Please provide a valid email address.');
      return;
    }

    setCreateIsSubmitting(true);
    setCreateError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim() || undefined,
          email: createEmail.trim().toLowerCase(),
          role: createRole,
          storeName: createStoreName.trim() || undefined,
          brandName: createBrandName.trim() || undefined,
          website: createWebsite.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create waitlist entry.');

      showToast('Waitlist entry created successfully.');
      setCreateModalOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreateRole('vendor');
      setCreateStoreName('');
      setCreateBrandName('');
      setCreateWebsite('');
      fetchWaitlist();
    } catch (err: any) {
      setCreateError(err.message || 'Something went wrong.');
    } finally {
      setCreateIsSubmitting(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        role: roleFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/waitlist?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch waitlist entries');
      const data = await res.json();
      setEntries(data.data.entries);
      setCounts(data.data.counts);
    } catch {
      setError('Failed to load waitlist entries.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const handleAction = async () => {
    if (!actionModal) return;
    const { type, entry } = actionModal;

    setActionLoading(entry.id);
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          entryId: entry.id,
          action: type,
          notes: adminNotes.trim(),
          approvedRole: type === 'approve' ? selectedApprovedRole : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');
      
      showToast(data.message || 'Action executed successfully.');
      setActionModal(null);
      setAdminNotes('');
      if (selected && selected.id === entry.id) {
        const newStatus = type === 'approve' ? 'approved' : type === 'send_link' ? 'link_sent' : 'rejected';
        setSelected({
          ...selected,
          status: newStatus,
          adminNotes: adminNotes.trim() || undefined,
        });
      } else {
        setSelected(null);
      }
      fetchWaitlist();
    } catch (e: any) {
      showToast(e.message || 'Failed to complete action.');
    } finally {
      setActionLoading(null);
    }
  };

  const openActionModal = (type: 'approve' | 'send_link' | 'reject', entry: WaitlistEntry) => {
    // Pre-select approval role based on applied role
    const initialRole = entry.role === 'brand' ? 'brand' : 'vendor';
    setSelectedApprovedRole(initialRole);
    setAdminNotes('');
    setActionModal({ type, entry });
  };

  const getStatusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      approved: 'bg-green-500/10 text-green-400 border border-green-500/20',
      rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
      link_sent: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    };
    return map[status] || 'bg-charcoal-700 text-cool-gray-400';
  };

  const getRoleBadgeClass = (role: string) => {
    const map: Record<string, string> = {
      vendor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      brand: 'bg-gold-500/10 text-gold-400 border border-gold-500/20',
      both: 'bg-linear-to-r from-purple-500/10 to-gold-500/10 text-indigo-300 border border-indigo-500/20',
    };
    return map[role] || 'bg-charcoal-700 text-cool-gray-400';
  };

  const filteredEntries = entries.filter((e) => {
    const term = searchQuery.toLowerCase();
    return (
      (e.name?.toLowerCase().includes(term) || '') ||
      e.email.toLowerCase().includes(term) ||
      (e.storeName?.toLowerCase().includes(term) || '') ||
      (e.brandName?.toLowerCase().includes(term) || '')
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-charcoal-850 border border-gold-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⏳</span> Pre-Launch Waitlist Applications
          </h1>
          <p className="text-cool-gray-400 text-sm mt-1">Review pre-launch signups, approve credentials, or send live links.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-gold-600 hover:bg-gold-500 text-charcoal-950 font-bold rounded-lg transition text-sm cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
        >
          ➕ Add Waitlist Entry
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-charcoal-800/40 border border-charcoal-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{counts.pending}</div>
          <div className="text-xs text-cool-gray-400 mt-1">Pending Review</div>
        </div>
        <div className="bg-charcoal-800/40 border border-charcoal-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{counts.approved}</div>
          <div className="text-xs text-cool-gray-400 mt-1">Approved & Account Created</div>
        </div>
        <div className="bg-charcoal-800/40 border border-charcoal-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{counts.linkSent}</div>
          <div className="text-xs text-cool-gray-400 mt-1">Live Links Sent</div>
        </div>
        <div className="bg-charcoal-800/40 border border-charcoal-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cool-gray-300">{counts.total}</div>
          <div className="text-xs text-cool-gray-400 mt-1">Total Entries</div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-950/20 border border-red-700 rounded-xl text-red-350 text-sm">{error}</div>}

      {/* Filters Bar */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm focus:ring-1 focus:ring-gold-500 outline-none"
          >
            <option value="all">All Requested Roles</option>
            <option value="vendor">Boutique / Vendor</option>
            <option value="brand">Brand Owner</option>
            <option value="both">Both Roles</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg text-sm focus:ring-1 focus:ring-gold-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="link_sent">Live Link Sent</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search email, name or store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-400 rounded-lg text-sm focus:ring-1 focus:ring-gold-500 outline-none"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-cool-gray-400">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading waitlist entries...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-12 text-center text-cool-gray-400 text-sm">No waitlist entries found matching current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-charcoal-900 border-b border-charcoal-700 text-cool-gray-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Applied Role</th>
                  <th className="px-6 py-4">Company Details</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-700 text-white">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-charcoal-750 transition-colors">
                    <td className="px-6 py-4 font-medium">{entry.name || '—'}</td>
                    <td className="px-6 py-4 text-cool-gray-300">{entry.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${getRoleBadgeClass(entry.role)}`}>
                        {entry.role === 'both' ? 'Vendor & Brand' : entry.role === 'vendor' ? 'Vendor' : 'Brand'}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-cool-gray-400">
                      {entry.storeName || entry.brandName || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(entry.status)}`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-cool-gray-400">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelected(entry)}
                        className="px-3 py-1.5 bg-charcoal-700 hover:bg-gold-600 hover:text-charcoal-950 text-xs font-semibold rounded-lg transition"
                      >
                        Preview / Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-fade-in relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-6 right-6 text-cool-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📋</span> Waitlist Entry Details
              </h2>
              <p className="text-xs text-cool-gray-400 mt-1 font-mono">ID: {selected.id}</p>
            </div>

            {/* General Info */}
            <div className="grid sm:grid-cols-2 gap-4 bg-charcoal-950 p-4 rounded-xl border border-charcoal-800">
              <div>
                <span className="block text-xs text-cool-gray-400">Applicant Name</span>
                <span className="font-semibold">{selected.name || '—'}</span>
              </div>
              <div>
                <span className="block text-xs text-cool-gray-400">Email Address</span>
                <span className="font-semibold text-gold-400">{selected.email}</span>
              </div>
              <div>
                <span className="block text-xs text-cool-gray-400">Role Inquired</span>
                <span className="font-semibold uppercase tracking-wider text-xs text-indigo-300">{selected.role}</span>
              </div>
              <div>
                <span className="block text-xs text-cool-gray-400">Current Status</span>
                <span className="font-semibold uppercase tracking-wider text-xs text-yellow-400">{selected.status}</span>
              </div>
            </div>

            {/* Vendor Fields Section */}
            {(selected.role === 'vendor' || selected.role === 'both') && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">🏪 Vendor Profile Details</h3>
                <div className="grid sm:grid-cols-3 gap-3 text-xs bg-charcoal-950/40 p-4 rounded-xl border border-charcoal-800/60">
                  <div>
                    <span className="block text-cool-gray-500">Boutique Name</span>
                    <span className="text-white font-medium">{selected.storeName || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Business Category</span>
                    <span className="text-white font-medium">{selected.businessCategory || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Inventory Size</span>
                    <span className="text-white font-medium">{selected.inventorySize || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Experience Years</span>
                    <span className="text-white font-medium">{selected.experienceYears || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Website URL</span>
                    <span className="text-white font-medium truncate block max-w-40">
                      {selected.website ? <a href={selected.website} target="_blank" rel="noreferrer" className="text-gold-500 underline">{selected.website}</a> : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Instagram Handle</span>
                    <span className="text-white font-medium">{selected.instagram || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Location</span>
                    <span className="text-white font-medium">{[selected.city, selected.country].filter(Boolean).join(', ') || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Brand Fields Section */}
            {(selected.role === 'brand' || selected.role === 'both') && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gold-500">👑 Brand Owner Details</h3>
                <div className="grid sm:grid-cols-3 gap-3 text-xs bg-charcoal-950/40 p-4 rounded-xl border border-charcoal-800/60">
                  <div>
                    <span className="block text-cool-gray-500">Official Brand Name</span>
                    <span className="text-white font-medium">{selected.brandName || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Trademark Number</span>
                    <span className="text-white font-medium">{selected.trademarkNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Year Established</span>
                    <span className="text-white font-medium">{selected.yearEstablished || '—'}</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="block text-cool-gray-500">Brand Legacy/Description</span>
                    <p className="text-white font-medium bg-charcoal-950 p-2.5 rounded-lg mt-1 border border-charcoal-800">{selected.brandDescription || '—'}</p>
                  </div>
                  <div>
                    <span className="block text-cool-gray-500">Target Audience</span>
                    <span className="text-white font-medium">{selected.targetAudience || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Notes history */}
            {selected.adminNotes && (
              <div className="p-3 bg-charcoal-950 border border-charcoal-800 rounded-xl text-xs">
                <span className="block text-cool-gray-400 font-medium mb-1">Previous Admin Action Notes</span>
                <p className="text-white italic">"{selected.adminNotes}"</p>
              </div>
            )}

            {/* Action Buttons */}
            {selected.status === 'pending' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-charcoal-800">
                <button
                  onClick={() => openActionModal('approve', selected)}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-charcoal-950 font-bold rounded-xl transition cursor-pointer"
                >
                  ✓ Approve & Create User Account
                </button>
                <button
                  onClick={() => openActionModal('send_link', selected)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  ✉ Send Live Signup Link
                </button>
                <button
                  onClick={() => openActionModal('reject', selected)}
                  className="px-6 py-3 bg-red-900/40 hover:bg-red-800/60 border border-red-750 text-red-200 font-bold rounded-xl transition cursor-pointer"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-md p-6 space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-white">
              {actionModal.type === 'approve'
                ? 'Approve Application'
                : actionModal.type === 'send_link'
                ? 'Send Registration Link'
                : 'Decline Application'}
            </h3>
            <p className="text-xs text-cool-gray-400">
              {actionModal.type === 'approve'
                ? 'Approving creates a real system account and emails temporary login details to ' + actionModal.entry.email
                : actionModal.type === 'send_link'
                ? 'This will email a direct signup link to ' + actionModal.entry.email + ' so they can create their account manually.'
                : 'This declines the waitlist entry and sends a notification email to ' + actionModal.entry.email}
            </p>

            {/* Approved Role Selector */}
            {actionModal.type === 'approve' && (
              <div>
                <label className="block text-xs text-cool-gray-400 mb-1">Select User Role to Assign</label>
                <select
                  value={selectedApprovedRole}
                  onChange={(e) => setSelectedApprovedRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-charcoal-950 border border-charcoal-800 text-white text-sm rounded-lg focus:ring-1 focus:ring-gold-500 outline-none"
                >
                  <option value="vendor">Boutique / Vendor</option>
                  <option value="brand">Brand Owner</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-cool-gray-400 mb-1">Admin notes / Custom message (optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Include details or support contacts..."
                rows={3}
                className="w-full px-3 py-2 bg-charcoal-950 border border-charcoal-800 text-white text-xs rounded-lg focus:ring-1 focus:ring-gold-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs font-semibold text-cool-gray-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading !== null}
                className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-charcoal-950 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Waitlist Entry Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form onSubmit={handleCreateEntry} className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-md p-6 space-y-4 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                <span>➕</span> Add User to Waitlist
              </h3>
              <p className="text-xs text-cool-gray-400 mt-1">Manually insert a user application into the waitlist database.</p>
            </div>

            <div>
              <label className="block text-xs text-cool-gray-400 mb-1">Full Name (optional)</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 bg-charcoal-950 border border-charcoal-800 text-white text-sm rounded-lg focus:ring-1 focus:ring-gold-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-cool-gray-400 mb-1">Email Address <span className="text-gold-500">*</span></label>
              <input
                type="email"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="e.g. name@brand.com"
                className="w-full px-3 py-2 bg-charcoal-950 border border-charcoal-800 text-white text-sm rounded-lg focus:ring-1 focus:ring-gold-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-cool-gray-400 mb-1">Inquired Role</label>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-charcoal-950 border border-charcoal-800 text-white text-sm rounded-lg focus:ring-1 focus:ring-gold-500 outline-none"
              >
                <option value="vendor">Boutique / Vendor</option>
                <option value="brand">Brand Owner</option>
                <option value="both">Both Roles</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-cool-gray-400 mb-1">Store / Brand Name (optional)</label>
              <input
                type="text"
                value={createStoreName}
                onChange={(e) => {
                  setCreateStoreName(e.target.value);
                  setCreateBrandName(e.target.value);
                }}
                placeholder="e.g. Luxe Studio"
                className="w-full px-3 py-2 bg-charcoal-950 border border-charcoal-800 text-white text-sm rounded-lg focus:ring-1 focus:ring-gold-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-cool-gray-400 mb-1">Website URL (optional)</label>
              <input
                type="text"
                value={createWebsite}
                onChange={(e) => setCreateWebsite(e.target.value)}
                placeholder="e.g. https://luxestudio.com"
                className="w-full px-3 py-2 bg-charcoal-950 border border-charcoal-800 text-white text-sm rounded-lg focus:ring-1 focus:ring-gold-500 outline-none"
              />
            </div>

            {createError && <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-xs">{createError}</div>}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateError('');
                }}
                className="px-4 py-2 text-xs font-semibold text-cool-gray-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createIsSubmitting}
                className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-charcoal-950 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                {createIsSubmitting ? 'Submitting...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
