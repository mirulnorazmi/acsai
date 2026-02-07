 import { motion } from 'framer-motion';
 import { 
   GitBranch, 
   Play, 
   Pause, 
   MoreVertical, 
   Clock,
   CheckCircle2,
   AlertCircle,
   Edit
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { Button } from '@/components/ui/button';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import { Workflow } from '@/types/workflow';
 
 interface WorkflowCardProps {
   workflow: Workflow;
   onEdit?: () => void;
   onToggle?: () => void;
 }
 
 const statusConfig = {
   draft: { icon: Edit, label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted' },
   pending_approval: { icon: Clock, label: 'Pending', color: 'text-node-trigger', bg: 'bg-node-trigger/10' },
   approved: { icon: CheckCircle2, label: 'Approved', color: 'text-node-success', bg: 'bg-node-success/10' },
   active: { icon: Play, label: 'Active', color: 'text-node-action', bg: 'bg-node-action/10' },
   paused: { icon: Pause, label: 'Paused', color: 'text-node-delay', bg: 'bg-node-delay/10' },
   error: { icon: AlertCircle, label: 'Error', color: 'text-node-error', bg: 'bg-node-error/10' },
 };
 
 export function WorkflowCard({ workflow, onEdit, onToggle }: WorkflowCardProps) {
   const status = statusConfig[workflow.status];
   const StatusIcon = status.icon;
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       whileHover={{ y: -2 }}
       className="glass glass-hover rounded-xl p-5 cursor-pointer group"
       onClick={onEdit}
     >
       <div className="flex items-start justify-between mb-4">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
             <GitBranch className="w-5 h-5 text-primary" />
           </div>
           <div>
             <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
               {workflow.name}
             </h3>
             <p className="text-sm text-muted-foreground line-clamp-1">
               {workflow.description}
             </p>
           </div>
         </div>
         
         <DropdownMenu>
           <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
             <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
               <MoreVertical className="w-4 h-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
               Edit
             </DropdownMenuItem>
             <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggle?.(); }}>
               {workflow.status === 'active' ? 'Pause' : 'Activate'}
             </DropdownMenuItem>
             <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       </div>
 
       <div className="flex items-center justify-between">
         <div className={cn(
           "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
           status.bg,
           status.color
         )}>
           <StatusIcon className="w-3 h-3" />
           {status.label}
         </div>
 
         <div className="flex items-center gap-4 text-xs text-muted-foreground">
           <span>{workflow.nodes.length} steps</span>
           {workflow.executionCount !== undefined && (
             <span>{workflow.executionCount} runs</span>
           )}
         </div>
       </div>
     </motion.div>
   );
 }