'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  GitBranch,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RunDetail {
  run_number: number;
  status: string;
  started_at: string;
  duration: string | null;
}

interface ExecutionHistoryStats {
  total_today: number;
  successful: number;
  failed: number;
  workflows: number;
}

interface ExecutionRow {
  id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  duration: string | null;
  trigger: string;
  total_executions: number;
  successful: number;
  failed: number;
  runs: RunDetail[];
}

interface ExecutionHistoryResponse {
  stats: ExecutionHistoryStats;
  executions: ExecutionRow[];
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  completed: { icon: CheckCircle2, label: 'Success', color: 'text-node-success', bg: 'bg-node-success/10' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-node-error', bg: 'bg-node-error/10' },
  running: { icon: RefreshCw, label: 'Running', color: 'text-node-action', bg: 'bg-node-action/10' },
  pending: { icon: Clock, label: 'Pending', color: 'text-node-trigger', bg: 'bg-node-trigger/10' },
  cancelled: { icon: XCircle, label: 'Cancelled', color: 'text-muted-foreground', bg: 'bg-muted/10' },
};

function formatStartedAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const minutes = Math.floor((now - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Executions() {
  const [data, setData] = useState<ExecutionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch('/api/execution_history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to fetch (${res.status})`);
      }

      const json: ExecutionHistoryResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = data?.stats ?? { total_today: 0, successful: 0, failed: 0, workflows: 0 };
  const executions = data?.executions ?? [];

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Executions</h1>
            <p className="text-muted-foreground">Monitor workflow execution history</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Today', value: stats.total_today, color: 'text-foreground' },
            { label: 'Successful', value: stats.successful, color: 'text-node-success' },
            { label: 'Failed', value: stats.failed, color: 'text-node-error' },
            { label: 'Workflows', value: stats.workflows, color: 'text-node-action' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-4 text-center"
            >
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="glass rounded-xl p-6 mb-6 border border-node-error/30 text-center">
            <p className="text-node-error">{error}</p>
            <Button variant="outline" className="mt-3" onClick={fetchData}>
              Try Again
            </Button>
          </div>
        )}

        {/* Execution Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr,100px,120px,100px,120px,80px,40px] gap-4 px-6 py-3 border-b border-border/50 text-sm font-medium text-muted-foreground">
            <div>Workflow</div>
            <div>Last Status</div>
            <div>Last Run</div>
            <div>Duration</div>
            <div>Trigger</div>
            <div>Runs</div>
            <div></div>
          </div>

          {loading && executions.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
              <p>Loading execution history...</p>
            </div>
          ) : executions.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <GitBranch className="w-6 h-6 mx-auto mb-3 opacity-50" />
              <p>No executions found</p>
            </div>
          ) : (
            executions.map((execution, index) => {
              const statusKey = execution.status || 'pending';
              const status = statusConfig[statusKey] || statusConfig.pending;
              const StatusIcon = status.icon;
              const isExpanded = expandedRows.has(execution.id);

              return (
                <div key={execution.id}>
                  {/* Main row */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-[1fr,100px,120px,100px,120px,80px,40px] gap-4 px-6 py-4 border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer items-center"
                    onClick={() => toggleRow(execution.id)}
                  >
                    <div className="font-medium text-foreground">{execution.workflow_name}</div>
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium w-fit',
                        status.bg,
                        status.color
                      )}
                    >
                      <StatusIcon className={cn('w-3 h-3', statusKey === 'running' && 'animate-spin')} />
                      {status.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatStartedAt(execution.started_at)}
                    </div>
                    <div className="text-sm text-muted-foreground">{execution.duration ?? '-'}</div>
                    <div className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded w-fit truncate max-w-[120px]">
                      {execution.trigger}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {execution.total_executions} total
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </motion.div>

                  {/* Expanded runs */}
                  <AnimatePresence>
                    {isExpanded && execution.runs && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-secondary/10 border-b border-border/30"
                      >
                        <div className="px-6 py-2">
                          <div className="grid grid-cols-[60px,1fr,100px,120px,100px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground">
                            <div>Run #</div>
                            <div></div>
                            <div>Status</div>
                            <div>Started</div>
                            <div>Duration</div>
                          </div>
                          {execution.runs.map((run) => {
                            const runStatusKey = run.status || 'pending';
                            const runStatus = statusConfig[runStatusKey] || statusConfig.pending;
                            const RunIcon = runStatus.icon;

                            return (
                              <div
                                key={run.run_number}
                                className="grid grid-cols-[60px,1fr,100px,120px,100px] gap-3 px-4 py-2 text-xs items-center border-t border-border/20"
                              >
                                <div className="text-muted-foreground font-medium">
                                  Run {run.run_number}
                                </div>
                                <div></div>
                                <div
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full w-fit',
                                    runStatus.bg,
                                    runStatus.color
                                  )}
                                >
                                  <RunIcon className={cn('w-2.5 h-2.5', runStatusKey === 'running' && 'animate-spin')} />
                                  {runStatus.label}
                                </div>
                                <div className="text-muted-foreground">
                                  {formatStartedAt(run.started_at)}
                                </div>
                                <div className="text-muted-foreground">
                                  {run.duration ?? '-'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
