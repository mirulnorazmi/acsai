import { motion } from 'framer-motion';
import {
  Plus,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { WorkflowCard } from '@/components/workflow/WorkflowCard';
import { Workflow } from '@/types/workflow';

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Employee Onboarding',
    description: 'Automate new hire setup across all systems',
    nodes: [
      { id: '1', type: 'trigger', label: 'New Employee', description: '', position: { x: 0, y: 0 } },
      { id: '2', type: 'action', label: 'Create Account', description: '', position: { x: 0, y: 0 } },
      { id: '3', type: 'action', label: 'Send Email', description: '', position: { x: 0, y: 0 } },
    ],
    edges: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    executionCount: 47,
  },
  {
    id: '2',
    name: 'Invoice Approval',
    description: 'Route invoices for approval based on amount',
    nodes: [
      { id: '1', type: 'trigger', label: 'Invoice Received', description: '', position: { x: 0, y: 0 } },
      { id: '2', type: 'condition', label: 'Check Amount', description: '', position: { x: 0, y: 0 } },
    ],
    edges: [],
    status: 'pending_approval',
    createdAt: new Date(),
    updatedAt: new Date(),
    executionCount: 0,
  },
  {
    id: '3',
    name: 'Support Ticket Routing',
    description: 'Assign tickets to the right team automatically',
    nodes: [
      { id: '1', type: 'trigger', label: 'New Ticket', description: '', position: { x: 0, y: 0 } },
      { id: '2', type: 'condition', label: 'Priority Check', description: '', position: { x: 0, y: 0 } },
      { id: '3', type: 'action', label: 'Assign Team', description: '', position: { x: 0, y: 0 } },
      { id: '4', type: 'action', label: 'Notify', description: '', position: { x: 0, y: 0 } },
    ],
    edges: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    executionCount: 234,
  },
];

const stats = [
  { label: 'Active Workflows', value: '12', icon: Zap, change: '+2 this week' },
  { label: 'Executions Today', value: '847', icon: TrendingUp, change: '+23%' },
  { label: 'Avg. Runtime', value: '1.2s', icon: Clock, change: '-0.3s' },
  { label: 'Success Rate', value: '99.2%', icon: CheckCircle2, change: '+0.5%' },
];

export default function Index() {
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-node-success font-medium">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
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
            {mockWorkflows.map((workflow) => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Employee Onboarding', desc: 'Automate new hire setup' },
              { title: 'Invoice Processing', desc: 'Route approvals automatically' },
              { title: 'Customer Support', desc: 'Ticket routing & escalation' },
            ].map((template) => (
              <Link
                key={template.title}
                to="/builder"
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
