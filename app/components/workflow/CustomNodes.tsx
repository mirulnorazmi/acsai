 import { memo } from 'react';
 import { Handle, Position, NodeProps } from '@xyflow/react';
 import { motion } from 'framer-motion';
 import { 
   Zap, 
   Play, 
   GitBranch, 
   Clock, 
   AlertTriangle,
   CheckCircle2,
   Mail,
   Database,
   Users,
   Send
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { NodeType } from '@/types/workflow';
 
 interface CustomNodeData {
   label: string;
   description?: string;
   nodeType: NodeType;
   icon?: string;
   status?: 'idle' | 'running' | 'success' | 'error';
  [key: string]: unknown;
 }
 
 const nodeStyles: Record<NodeType, { bg: string; border: string; icon: typeof Zap }> = {
   trigger: { bg: 'bg-node-trigger/10', border: 'border-node-trigger', icon: Zap },
   action: { bg: 'bg-node-action/10', border: 'border-node-action', icon: Play },
   condition: { bg: 'bg-node-condition/10', border: 'border-node-condition', icon: GitBranch },
   delay: { bg: 'bg-node-delay/10', border: 'border-node-delay', icon: Clock },
   error: { bg: 'bg-node-error/10', border: 'border-node-error', icon: AlertTriangle },
 };
 
 const actionIcons: Record<string, typeof Mail> = {
   email: Mail,
   database: Database,
   users: Users,
   send: Send,
 };
 
 export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
   const style = nodeStyles.trigger;
   const Icon = style.icon;
 
   return (
     <motion.div
       initial={{ scale: 0.8, opacity: 0 }}
       animate={{ scale: 1, opacity: 1 }}
       className={cn(
         "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200",
         style.bg,
         style.border,
         selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
       )}
     >
       <div className="flex items-center gap-3">
         <div className="w-8 h-8 rounded-lg bg-node-trigger/20 flex items-center justify-center">
           <Icon className="w-4 h-4 text-node-trigger" />
         </div>
         <div className="flex-1 min-w-0">
           <p className="font-medium text-sm text-foreground truncate">{nodeData.label}</p>
           {nodeData.description && (
             <p className="text-xs text-muted-foreground truncate">{nodeData.description}</p>
           )}
         </div>
       </div>
       <Handle
         type="source"
         position={Position.Bottom}
         className="!w-3 !h-3 !bg-node-trigger !border-2 !border-background"
       />
     </motion.div>
   );
 });
 
 TriggerNode.displayName = 'TriggerNode';
 
 export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
   const style = nodeStyles.action;
   const IconComponent = nodeData.icon ? actionIcons[nodeData.icon] || style.icon : style.icon;
 
   return (
     <motion.div
       initial={{ scale: 0.8, opacity: 0 }}
       animate={{ scale: 1, opacity: 1 }}
       className={cn(
         "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200",
         style.bg,
         style.border,
         selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
         nodeData.status === 'running' && "animate-pulse-glow",
         nodeData.status === 'success' && "border-node-success",
         nodeData.status === 'error' && "border-node-error"
       )}
     >
       <Handle
         type="target"
         position={Position.Top}
         className="!w-3 !h-3 !bg-node-action !border-2 !border-background"
       />
       <div className="flex items-center gap-3">
         <div className={cn(
           "w-8 h-8 rounded-lg flex items-center justify-center",
           nodeData.status === 'success' ? "bg-node-success/20" : "bg-node-action/20"
         )}>
           {nodeData.status === 'success' ? (
             <CheckCircle2 className="w-4 h-4 text-node-success" />
           ) : (
             <IconComponent className="w-4 h-4 text-node-action" />
           )}
         </div>
         <div className="flex-1 min-w-0">
           <p className="font-medium text-sm text-foreground truncate">{nodeData.label}</p>
           {nodeData.description && (
             <p className="text-xs text-muted-foreground truncate">{nodeData.description}</p>
           )}
         </div>
       </div>
       <Handle
         type="source"
         position={Position.Bottom}
         className="!w-3 !h-3 !bg-node-action !border-2 !border-background"
       />
     </motion.div>
   );
 });
 
 ActionNode.displayName = 'ActionNode';
 
 export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
   const style = nodeStyles.condition;
   const Icon = style.icon;
 
   return (
     <motion.div
       initial={{ scale: 0.8, opacity: 0 }}
       animate={{ scale: 1, opacity: 1 }}
       className={cn(
         "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200",
         style.bg,
         style.border,
         selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
       )}
     >
       <Handle
         type="target"
         position={Position.Top}
         className="!w-3 !h-3 !bg-node-condition !border-2 !border-background"
       />
       <div className="flex items-center gap-3">
         <div className="w-8 h-8 rounded-lg bg-node-condition/20 flex items-center justify-center">
           <Icon className="w-4 h-4 text-node-condition" />
         </div>
         <div className="flex-1 min-w-0">
           <p className="font-medium text-sm text-foreground truncate">{nodeData.label}</p>
           {nodeData.description && (
             <p className="text-xs text-muted-foreground truncate">{nodeData.description}</p>
           )}
         </div>
       </div>
       <div className="flex justify-between mt-2 px-2">
         <Handle
           type="source"
           position={Position.Bottom}
           id="yes"
           className="!w-3 !h-3 !bg-node-success !border-2 !border-background !left-1/4"
         />
         <span className="text-[10px] text-node-success">Yes</span>
         <span className="text-[10px] text-node-error">No</span>
         <Handle
           type="source"
           position={Position.Bottom}
           id="no"
           className="!w-3 !h-3 !bg-node-error !border-2 !border-background !left-3/4"
         />
       </div>
     </motion.div>
   );
 });
 
 ConditionNode.displayName = 'ConditionNode';
 
 export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
   const style = nodeStyles.delay;
   const Icon = style.icon;
 
   return (
     <motion.div
       initial={{ scale: 0.8, opacity: 0 }}
       animate={{ scale: 1, opacity: 1 }}
       className={cn(
         "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200",
         style.bg,
         style.border,
         selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
       )}
     >
       <Handle
         type="target"
         position={Position.Top}
         className="!w-3 !h-3 !bg-node-delay !border-2 !border-background"
       />
       <div className="flex items-center gap-3">
         <div className="w-8 h-8 rounded-lg bg-node-delay/20 flex items-center justify-center">
           <Icon className="w-4 h-4 text-node-delay" />
         </div>
         <div className="flex-1 min-w-0">
           <p className="font-medium text-sm text-foreground truncate">{nodeData.label}</p>
           {nodeData.description && (
             <p className="text-xs text-muted-foreground truncate">{nodeData.description}</p>
           )}
         </div>
       </div>
       <Handle
         type="source"
         position={Position.Bottom}
         className="!w-3 !h-3 !bg-node-delay !border-2 !border-background"
       />
     </motion.div>
   );
 });
 
 DelayNode.displayName = 'DelayNode';
 
 export const nodeTypes = {
   trigger: TriggerNode,
   action: ActionNode,
   condition: ConditionNode,
   delay: DelayNode,
 };