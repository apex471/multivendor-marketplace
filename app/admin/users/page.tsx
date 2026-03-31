'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  applicationStatus: string;
  suspensionReason?: string;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search.trim() && { search: search.trim() }),
      });
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers(); }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const performAction = async (userId: string, action: string, payload?: Record<string, string>) => {
    setActionLoading(userId + action);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      showToast(data.message || 'Action completed');
      setSelectedUser(null);
      setSuspendReason('');
      fetchUsers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      customer: 'bg-blue-900/40 text-blue-300',
      vendor: 'bg-purple-900/40 text-purple-300',
      brand: 'bg-gold-900/40 text-gold-400',
      logistics: 'bg-green-900/40 text-green-300',
      admin: 'bg-red-900/40 text-red-300',
    };
    return map[role] ?? 'bg-charcoal-700 text-cool-gray-400';
  };

  const statusBadge = (user: User) => {
    if (!user.isActive) return 'bg-red-900/40 text-red-300';
    return 'bg-green-900/40 text-green-300';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-charcoal-800 border border-gold-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-cool-gray-400 text-sm mt-1">{pagination.total.toLocaleString()} total users</p>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email..."
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white placeholder-cool-gray-500 rounded-lg focus:ring-2 focus:ring-gold-500 outline-none text-sm"
          />
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg focus:ring-2 focus:ring-gold-500 outline-none text-sm"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="vendor">Vendors</option>
            <option value="brand">Brands</option>
            <option value="logistics">Logistics</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-charcoal-700 border border-charcoal-600 text-white rounded-lg focus:ring-2 focus:ring-gold-500 outline-none text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">App Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cool-gray-400 uppercase">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cool-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-700">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-cool-gray-500">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-cool-gray-500">No users found</td></tr>
              ) : users.map(user => (
                <tr key={user._id} className="hover:bg-charcoal-750 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-charcoal-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {user.firstName?.[0] ?? '?'}{user.lastName?.[0] ?? ''}
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-cool-gray-500 text-xs">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${roleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(user)}`}>
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      user.applicationStatus === 'approved' ? 'bg-green-900/40 text-green-300' :
                      user.applicationStatus === 'rejected' ? 'bg-red-900/40 text-red-300' :
                      user.applicationStatus === 'pending' ? 'bg-yellow-900/40 text-yellow-300' :
                      'bg-charcoal-700 text-cool-gray-400'
                    }`}>
                      {user.applicationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cool-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setSelectedUser(user); setSuspendReason(''); setRejectNotes(''); }}
                      className="px-3 py-1.5 bg-gold-600 hover:bg-gold-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-charcoal-700">
            <span className="text-xs text-cool-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-charcoal-700 text-white text-xs rounded-lg disabled:opacity-40 hover:bg-charcoal-600 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 bg-charcoal-700 text-white text-xs rounded-lg disabled:opacity-40 hover:bg-charcoal-600 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Manage Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedUser.firstName} {selectedUser.lastName}</h2>
                <p className="text-cool-gray-400 text-xs mt-0.5">{selectedUser.email} · {selectedUser.role}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-cool-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Account Status */}
              <div className="bg-charcoal-700 rounded-xl p-4">
                <div className="text-xs font-semibold text-cool-gray-400 uppercase mb-3">Account Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedUser.isActive ? (
                    <>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={suspendReason}
                          onChange={e => setSuspendReason(e.target.value)}
                          placeholder="Reason for suspension (optional)"
                          className="w-full px-3 py-2 bg-charcoal-600 border border-charcoal-500 text-white placeholder-cool-gray-500 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500 mb-2"
                        />
                      </div>
                      <button
                        onClick={() => performAction(selectedUser._id, 'suspend', suspendReason ? { reason: suspendReason } : {})}
                        disabled={actionLoading === selectedUser._id + 'suspend'}
                        className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Suspend Account
                      </button>
                      <button
                        onClick={() => performAction(selectedUser._id, 'ban')}
                        disabled={actionLoading === selectedUser._id + 'ban'}
                        className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Ban Permanently
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => performAction(selectedUser._id, 'activate')}
                      disabled={actionLoading === selectedUser._id + 'activate'}
                      className="col-span-2 px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      Reactivate Account
                    </button>
                  )}
                </div>
              </div>

              {/* Application Status */}
              {(selectedUser.applicationStatus === 'pending') && (
                <div className="bg-charcoal-700 rounded-xl p-4">
                  <div className="text-xs font-semibold text-cool-gray-400 uppercase mb-3">Application Review</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => performAction(selectedUser._id, 'approve')}
                      disabled={!!actionLoading}
                      className="w-full px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      ✓ Approve Application
                    </button>
                    <input
                      type="text"
                      value={rejectNotes}
                      onChange={e => setRejectNotes(e.target.value)}
                      placeholder="Rejection reason (required)"
                      className="w-full px-3 py-2 bg-charcoal-600 border border-charcoal-500 text-white placeholder-cool-gray-500 rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold-500"
                    />
                    <button
                      onClick={() => {
                        if (!rejectNotes.trim()) { showToast('Please provide a rejection reason'); return; }
                        performAction(selectedUser._id, 'reject', { notes: rejectNotes });
                      }}
                      disabled={!!actionLoading}
                      className="w-full px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      ✕ Reject Application
                    </button>
                  </div>
                </div>
              )}

              {/* Email Verification */}
              {!selectedUser.isEmailVerified && (
                <div className="bg-charcoal-700 rounded-xl p-4">
                  <div className="text-xs font-semibold text-cool-gray-400 uppercase mb-3">Verification</div>
                  <button
                    onClick={() => performAction(selectedUser._id, 'verify_email')}
                    disabled={!!actionLoading}
                    className="w-full px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Mark Email as Verified
                  </button>
                </div>
              )}

              {/* Info Panel */}
              <div className="text-xs text-cool-gray-500 bg-charcoal-700 rounded-xl p-4 space-y-1">
                <div className="flex justify-between">
                  <span>Email verified</span>
                  <span className={selectedUser.isEmailVerified ? 'text-green-400' : 'text-red-400'}>
                    {selectedUser.isEmailVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Account status</span>
                  <span className={selectedUser.isActive ? 'text-green-400' : 'text-red-400'}>
                    {selectedUser.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
                {selectedUser.suspensionReason && (
                  <div className="flex justify-between">
                    <span>Suspension reason</span>
                    <span className="text-yellow-400 max-w-[60%] text-right">{selectedUser.suspensionReason}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Joined</span>
                  <span>{new Date(selectedUser.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
