'use client';

// ========================================================
// StayDesk CRM / HotelFlow CRM — Audit Log Viewer
// Location: app/audit/page.tsx
// Super-admin only • reads public.audit_logs via supabaseDb
// ========================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { db } from '../../lib/supabase/client';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  Key,
  LogIn,
  LogOut,
  UserPlus,
  Trash2,
  PauseCircle,
  PlayCircle,
  FileDown,
  DoorOpen,
  DoorClosed,
  BedDouble,
  AlertCircle,
  Clock,
  X,
  CalendarDays,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────
interface AuditLog {
  id: string;
  hotel_id?: string | null;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  table_name?: string | null;
  row_id?: string | null;
  metadata?: Record<string, any> | null;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  changed_by?: string | null;
  ip?: string | null;
  created_at: string;
}

// ── Action config ────────────────────────────────────────
const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  'hotel.created':      { label: 'Hotel Created',       icon: UserPlus,    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  'hotel.deleted':      { label: 'Hotel Deleted',       icon: Trash2,      color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200'     },
  'hotel.suspended':    { label: 'Hotel Suspended',     icon: PauseCircle, color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200'  },
  'hotel.activated':    { label: 'Hotel Activated',     icon: PlayCircle,  color: 'text-teal-700',    bg: 'bg-teal-50',     border: 'border-teal-200'    },
  'password.reset':     { label: 'Password Reset',      icon: Key,         color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200'  },
  'guest.exported':     { label: 'Guest Data Exported', icon: FileDown,    color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200'    },
  'checkin.created':    { label: 'Check-In',            icon: DoorOpen,    color: 'text-sky-700',     bg: 'bg-sky-50',      border: 'border-sky-200'     },
  'checkout.completed': { label: 'Check-Out',           icon: DoorClosed,  color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200'  },
  'room.created':       { label: 'Room Created',        icon: BedDouble,   color: 'text-cyan-700',    bg: 'bg-cyan-50',     border: 'border-cyan-200'    },
  'room.deleted':       { label: 'Room Deleted',        icon: Trash2,      color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200'    },
  'user.login':         { label: 'User Login',          icon: LogIn,       color: 'text-slate-700',   bg: 'bg-slate-50',    border: 'border-slate-200'   },
  'user.logout':        { label: 'User Logout',         icon: LogOut,      color: 'text-slate-500',   bg: 'bg-slate-50',    border: 'border-slate-200'   },
  'UPDATE':             { label: 'DB Update',           icon: RefreshCw,   color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200'   },
  'INSERT':             { label: 'DB Insert',           icon: UserPlus,    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  'DELETE':             { label: 'DB Delete',           icon: Trash2,      color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200'     },
};

const getActionConfig = (action: string) =>
  ACTION_CONFIG[action] ?? {
    label: action,
    icon: AlertCircle,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  };

// ── Helpers ──────────────────────────────────────────────
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
};

const relativeTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const exportCsv = (logs: AuditLog[]) => {
  const headers = ['Timestamp', 'Action', 'Actor Email', 'Hotel ID', 'Target Type', 'Target ID', 'IP', 'Metadata'];
  const rows = logs.map(l => [
    l.created_at,
    l.action,
    l.actor_email ?? '',
    l.hotel_id ?? '',
    l.target_type ?? '',
    l.target_id ?? '',
    l.ip ?? '',
    l.metadata ? JSON.stringify(l.metadata) : '',
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const PAGE_SIZE = 50;

// ── Component ────────────────────────────────────────────
export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await db.getAuditLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: 500,
      });
      setLogs(data);
      setPage(1);
    } catch (err) {
      setError('Failed to load audit logs. Make sure the audit_logs table exists and RLS allows superadmin reads.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side search on top of server-filtered results
  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(l =>
      (l.actor_email ?? '').toLowerCase().includes(q) ||
      (l.action ?? '').toLowerCase().includes(q) ||
      (l.target_type ?? '').toLowerCase().includes(q) ||
      (l.target_id ?? '').toLowerCase().includes(q) ||
      (l.ip ?? '').toLowerCase().includes(q) ||
      (l.metadata ? JSON.stringify(l.metadata).toLowerCase().includes(q) : false)
    );
  }, [logs, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary counts
  const actionCounts = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.action] = (acc[l.action] ?? 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  const clearFilters = () => {
    setSearch('');
    setActionFilter('all');
    setFromDate('');
    setToDate('');
  };

  const hasActiveFilters = search || actionFilter !== 'all' || fromDate || toDate;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Audit Log Viewer
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Full immutable trail of all admin and system actions across every tenant.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => exportCsv(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-red-200 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Summary Cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Events',       value: logs.length,                            color: 'text-slate-800',   bg: 'bg-white'       },
            { label: 'Hotels Provisioned', value: actionCounts['hotel.created'] ?? 0,     color: 'text-emerald-700', bg: 'bg-emerald-50'  },
            { label: 'Password Resets',    value: actionCounts['password.reset'] ?? 0,    color: 'text-violet-700',  bg: 'bg-violet-50'   },
            { label: 'Hotels Deleted',     value: actionCounts['hotel.deleted'] ?? 0,     color: 'text-red-700',     bg: 'bg-red-50'      },
          ].map(card => (
            <div key={card.label} className={`${card.bg} rounded-[18px] border border-slate-100 shadow-sm p-4`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{card.label}</span>
              <span className={`text-2xl font-black mt-1 block ${card.color}`}>{card.value}</span>
            </div>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────── */}
        <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Email, action, IP, target…"
                className="w-full pl-8 pr-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div className="min-w-[180px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Action Type
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={actionFilter}
                onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="all">All Actions</option>
                {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              From Date
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              To Date
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600 px-2 py-2 rounded-xl hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* ── Error ───────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-[14px] p-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────── */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          {/* Table header bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {filtered.length} event{filtered.length !== 1 ? 's' : ''}
              </span>
              {hasActiveFilters && (
                <span className="text-[10px] font-bold text-primary bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  Filtered
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              Page {page} of {totalPages}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <ShieldCheck className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold">No audit events found</p>
              <p className="text-xs">Try adjusting your filters or refreshing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Actor</th>
                    <th className="px-6 py-3">Target</th>
                    <th className="px-6 py-3">IP</th>
                    <th className="px-6 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map(log => {
                    const cfg = getActionConfig(log.action);
                    const Icon = cfg.icon;
                    const isExpanded = expandedId === log.id;
                    const targetType = log.target_type || log.table_name;
                    const targetId = log.target_id || log.row_id;
                    const hasMetadata = 
                      (log.metadata && Object.keys(log.metadata).length > 0) ||
                      (log.old_data && Object.keys(log.old_data).length > 0) ||
                      (log.new_data && Object.keys(log.new_data).length > 0);

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        >
                          {/* Time */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{relativeTime(log.created_at)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 pl-4">
                              {formatDate(log.created_at)}
                            </div>
                          </td>

                          {/* Action badge */}
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                              <Icon className="w-3 h-3 shrink-0" />
                              {cfg.label}
                            </span>
                          </td>

                          {/* Actor */}
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-slate-500" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">
                                  {log.actor_email ?? (log.changed_by ? `User (${log.changed_by.slice(0, 6)})` : <span className="text-slate-400 italic">System Trigger</span>)}
                                </div>
                                {(log.actor_id || log.changed_by) && (
                                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                                    {(log.actor_id || log.changed_by)!.slice(0, 8)}...
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Target */}
                          <td className="px-6 py-3.5">
                            {targetType ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                  <Building2 className="w-2.5 h-2.5" />
                                  {targetType}
                                </span>
                                {targetId && (
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">
                                    {targetId.slice(0, 12)}...
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>

                          {/* IP */}
                          <td className="px-6 py-3.5">
                            <span className="text-xs font-mono text-slate-500">
                              {log.ip ?? <span className="text-slate-300">-</span>}
                            </span>
                          </td>

                          {/* Expand toggle */}
                          <td className="px-6 py-3.5 text-right">
                            {hasMetadata && (
                              <button
                                onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : log.id); }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-primary px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isExpanded ? 'Hide' : 'Details'}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded metadata / change payload row */}
                        {isExpanded && hasMetadata && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={6} className="px-8 pb-4 pt-2">
                              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden space-y-2 p-4">
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Event Metadata</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {Object.entries(log.metadata).map(([key, val]) => (
                                        <div key={key} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{key}</div>
                                          <div className="text-xs font-semibold text-slate-700 break-all">
                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {log.new_data && (
                                  <div>
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-2">New Data State</span>
                                    <pre className="bg-slate-900 text-emerald-400 text-[11px] p-3 rounded-lg overflow-x-auto font-mono">
                                      {JSON.stringify(log.new_data, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {log.old_data && (
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Previous Data State</span>
                                    <pre className="bg-slate-100 text-slate-600 text-[11px] p-3 rounded-lg overflow-x-auto font-mono">
                                      {JSON.stringify(log.old_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ───────────────────────────────── */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg disabled:opacity-40 transition-colors"
                >
                  Prev
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5) {
                    if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-[11px] font-bold rounded-lg transition-colors ${
                        page === p
                          ? 'bg-primary text-white shadow-md shadow-red-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
