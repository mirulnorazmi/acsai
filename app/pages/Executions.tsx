import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Execution {
  id: string;
  workflowName: string;
  status: 'success' | 'error' | 'running' | 'pending';
  startedAt: Date;
  duration: string;
  trigger: string;
}

const executions: Execution[] = [
  { id: '1', workflowName: 'Employee Onboarding', status: 'success', startedAt: new Date(Date.now() - 5 * 60000), duration: '1.2s', trigger: 'Webhook' },
  { id: '2', workflowName: 'Invoice Approval', status: 'running', startedAt: new Date(Date.now() - 1 * 60000), duration: '-', trigger: 'API Call' },
  { id: '3', workflowName: 'Support Ticket Routing', status: 'success', startedAt: new Date(Date.now() - 15 * 60000), duration: '0.8s', trigger: 'Webhook' },
  { id: '4', workflowName: 'Data Backup', status: 'error', startedAt: new Date(Date.now() - 30 * 60000), duration: '5.4s', trigger: 'Schedule' },
  { id: '5', workflowName: 'Employee Onboarding', status: 'success', startedAt: new Date(Date.now() - 45 * 60000), duration: '1.1s', trigger: 'Webhook' },
  { id: '6', workflowName: 'Lead Qualification', status: 'success', startedAt: new Date(Date.now() - 60 * 60000), duration: '2.3s', trigger: 'API Call' },
  { id: '7', workflowName: 'Contract Renewal', status: 'pending', startedAt: new Date(Date.now() - 90 * 60000), duration: '-', trigger: 'Schedule' },
  { id: '8', workflowName: 'Support Ticket Routing', status: 'success', startedAt: new Date(Date.now() - 120 * 60000), duration: '0.9s', trigger: 'Webhook' },
];

const statusConfig = {
  success: { icon: CheckCircle2, label: 'Success', color: 'text-node-success', bg: 'bg-node-success/10' },
  error: { icon: XCircle, label: 'Failed', color: 'text-node-error', bg: 'bg-node-error/10' },
  running: { icon: RefreshCw, label: 'Running', color: 'text-node-action', bg: 'bg-node-action/10' },
  pending: { icon: Clock, label: 'Pending', color: 'text-node-trigger', bg: 'bg-node-trigger/10' },
};

function timeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Executions() {
  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Executions</h1>
            <p className="text-muted-foreground">Monitor workflow x_execution history</p>
          </div>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Today', value: '847', color: 'text-foreground' },
            { label: 'Successful', value: '839', color: 'text-node-success' },
            { label: 'Failed', value: '5', color: 'text-node-error' },
            { label: 'Running', value: '3', color: 'text-node-action' },
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

        {/* Execution List */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr,100px,120px,100px,80px,40px] gap-4 px-6 py-3 border-b border-border/50 text-sm font-medium text-muted-foreground">
            <div>Workflow</div>
            <div>Status</div>
            <div>Started</div>
            <div>Duration</div>
            <div>Trigger</div>
            <div></div>
          </div>

          {executions.map((x_execution, index) => {
            const status = statusConfig[x_execution.status];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={x_execution.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-[1fr,100px,120px,100px,80px,40px] gap-4 px-6 py-4 border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer items-center"
              >
                <div className="font-medium text-foreground">{x_execution.workflowName}</div>
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium w-fit",
                  status.bg,
                  status.color
                )}>
                  <StatusIcon className={cn("w-3 h-3", x_execution.status === 'running' && "animate-spin")} />
                  {status.label}
                </div>
                <div className="text-sm text-muted-foreground">{timeAgo(x_execution.startedAt)}</div>
                <div className="text-sm text-muted-foreground">{x_execution.duration}</div>
                <div className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded w-fit">
                  {x_execution.trigger}
                </div>
                <div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}