 'use client';

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { WorkflowCard } from '@/components/workflow/WorkflowCard';
import { Workflow } from '@/types/workflow';

type DashboardStats = {
  activeWorkflows: number;
  executionsToday: number;
  avgRuntime: string;
  avgRuntimeSeconds?: number;
  successRate: number;
};

const initialStats: DashboardStats = {
  activeWorkflows: 0,
  executionsToday: 0,
  avgRuntime: '0s',
  avgRuntimeSeconds: 0,
  successRate: 0,
};

export default function Index() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentWorkflows, setRecentWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/dashboard', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const body = await res.json();
        if (!mounted) return;
        if (body?.success) {
          setStats(body.stats || initialStats);
          // Sort by createdAt descending and take only 3
          const workflows = (body.recentWorkflows || [])
            .sort((a: Workflow, b: Workflow) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 3);
          setRecentWorkflows(workflows);
        } else {
          setError(body?.error || 'Failed to load dashboard');
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard', err);
        if (mounted) setError(String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const statItems = [
    { label: 'Active Workflows', value: String(stats.activeWorkflows), icon: Zap },
    { label: 'Executions Today', value: String(stats.executionsToday), icon: TrendingUp },
    { label: 'Avg. Runtime', value: stats.avgRuntime, icon: Clock },
    { label: 'Success Rate', value: `${stats.successRate}%`, icon: CheckCircle2 },
  ];

  const latestWorkflow = recentWorkflows[0];

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor your automated x_workflows</p>
          </div>
          <Link to="/builder">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </Link>
        </div>

        {/* Latest workflow (most recently created by user) */}
        {latestWorkflow && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Latest Workflow</h2>
              <Link to={`/builder?id=${latestWorkflow.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                Open <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div>
              <WorkflowCard
                workflow={latestWorkflow}
                onEdit={() => navigate(`/builder?id=${latestWorkflow.id}`)}
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statItems.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Workflows */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Workflows</h2>
            <Link to="/workflows" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && <div className="p-6">Loading...</div>}
            {error && <div className="p-6 text-red-500">{error}</div>}
            {!loading && !error && recentWorkflows.length === 0 && (
              <div className="p-6 text-muted-foreground">No recent workflows.</div>
            )}
            {!loading && recentWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onEdit={() => navigate(`/builder?id=${workflow.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Employee Onboarding', desc: 'Automate new hire setup', prompt: 'Automate employee onboarding' },
              { title: 'Invoice Processing', desc: 'Route approvals automatically', prompt: 'Create an invoice approval workflow' },
              { title: 'Customer Support', desc: 'Ticket routing & escalation', prompt: 'Set up customer support ticket routing' },
            ].map((template) => (
              <Link
                key={template.title}
                to={`/builder?prompt=${encodeURIComponent(template.prompt)}`}
                className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {template.title}
                </h3>
                <p className="text-sm text-muted-foreground">{template.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
