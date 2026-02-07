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
  Send,
  Globe,
  MessageSquare,
  FileText,
  Calendar,
  StickyNote,
  HardDrive,
  MousePointerClick
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeType } from '@/types/workflow';

// Interface matching the API response structure
interface CustomNodeData {
  label: string;
  description?: string; // Optional description
  nodeType?: NodeType; // Legacy support
  type?: string; // n8n node type (e.g., 'n8n-nodes-base.gmail')
  typeVersion?: number;
  status?: 'idle' | 'running' | 'success' | 'error';
  parameters?: Record<string, unknown>; // Configuration parameters
  [key: string]: unknown;
}

// Map API 'type' to internal 'NodeType' for styling
const mapTypeToStyle = (type: string | undefined): NodeType => {
  if (!type) return 'action';
  const lowerType = type.toLowerCase();

  if (lowerType.includes('webhook') || lowerType.includes('trigger') || lowerType.includes('schedule')) return 'trigger';
  if (lowerType.includes('if') || lowerType.includes('switch') || lowerType.includes('condition')) return 'condition';
  if (lowerType.includes('wait') || lowerType.includes('delay') || lowerType.includes('sleep')) return 'delay';

  return 'action'; // Default to action for http_request, email_send, etc.
};

const nodeStyles: Record<NodeType, { bg: string; border: string; icon: typeof Zap }> = {
  trigger: { bg: 'bg-node-trigger/10', border: 'border-node-trigger', icon: Zap },
  action: { bg: 'bg-node-action/10', border: 'border-node-action', icon: Play },
  condition: { bg: 'bg-node-condition/10', border: 'border-node-condition', icon: GitBranch },
  delay: { bg: 'bg-node-delay/10', border: 'border-node-delay', icon: Clock },
  error: { bg: 'bg-node-error/10', border: 'border-node-error', icon: AlertTriangle },
};

// Enhanced icon mapping based on specific node types
const typeIcons: Record<string, typeof Mail> = {
  // n8n types
  'n8n-nodes-base.gmail': Mail,
  'n8n-nodes-base.googledrive': HardDrive,
  'n8n-nodes-base.googlecalendar': Calendar,
  'n8n-nodes-base.stickynote': StickyNote,
  'n8n-nodes-base.webhook': Zap,
  'n8n-nodes-base.httprequest': Globe,
  'n8n-nodes-base.postgres': Database,
  'n8n-nodes-base.slack': MessageSquare,
  'n8n-nodes-base.discord': MessageSquare,
  // Generic types
  'email_send': Mail,
  'email_read': Mail,
  'database_query': Database,
  'users': Users,
  'slack_invite': MessageSquare,
  'slack_message': MessageSquare,
  'http_request': Globe,
  'webhook': Zap,
  'delay': Clock,
  'condition': GitBranch,
  'file_read': FileText,
  'file_write': FileText,
};

// Helper to get icon component case-insensitively
const getIconForType = (type: string | undefined, defaultIcon: typeof Zap) => {
  if (!type) return defaultIcon;
  const lowerType = type.toLowerCase();
  // Check exact match first
  if (typeIcons[lowerType]) return typeIcons[lowerType];

  // Check includes for partial matches
  if (lowerType.includes('gmail') || lowerType.includes('mail')) return Mail;
  if (lowerType.includes('db') || lowerType.includes('sql') || lowerType.includes('postgres')) return Database;
  if (lowerType.includes('slack') || lowerType.includes('discord') || lowerType.includes('chat')) return MessageSquare;
  if (lowerType.includes('file') || lowerType.includes('drive')) return HardDrive;
  if (lowerType.includes('schedule') || lowerType.includes('calendar')) return Calendar;
  if (lowerType.includes('note')) return StickyNote;
  if (lowerType.includes('http') || lowerType.includes('web') || lowerType.includes('api')) return Globe;
  if (lowerType.includes('click') || lowerType.includes('interaction')) return MousePointerClick;

  return defaultIcon;
};

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
  const style = nodeStyles.trigger;
  const Icon = getIconForType(nodeData.type, style.icon);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200 backdrop-blur-md bg-opacity-80",
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
          <p className="text-xs text-muted-foreground truncate">
            {nodeData.description || nodeData.type?.replace('n8n-nodes-base.', '') || 'Trigger'}
          </p>
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
  // Determine style based on the 'type' field from API
  const nodeType = mapTypeToStyle(nodeData.type);
  const style = nodeStyles[nodeType];

  // Clean up label and description
  const displayLabel = nodeData.label;
  const displayDesc = nodeData.description || nodeData.type?.replace('n8n-nodes-base.', '');

  const IconComponent = getIconForType(nodeData.type, style.icon);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200 backdrop-blur-md bg-opacity-80",
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
        className={cn("!w-3 !h-3 !border-2 !border-background", `!bg-${style.border.replace('border-', '')}`)}
      />
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          nodeData.status === 'success' ? "bg-node-success/20" : style.bg.replace('/10', '/20')
        )}>
          {nodeData.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-node-success" />
          ) : (
            <IconComponent className={cn("w-4 h-4", `text-${style.border.replace('border-', '')}`)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{displayLabel}</p>
          <p className="text-xs text-muted-foreground truncate">
            {displayDesc}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn("!w-3 !h-3 !border-2 !border-background", `!bg-${style.border.replace('border-', '')}`)}
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
        "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200 backdrop-blur-md bg-opacity-80",
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
          <p className="text-xs text-muted-foreground truncate">
            {nodeData.description || 'Condition Check'}
          </p>
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
        "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200 backdrop-blur-md bg-opacity-80",
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
          <p className="text-xs text-muted-foreground truncate">
            {nodeData.description || 'Wait Duration'}
          </p>
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

// Map generic node types to specific implementations
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  // n8n types explicit mapping
  'n8n-nodes-base.webhook': TriggerNode,
  'n8n-nodes-base.trigger': TriggerNode,
  'n8n-nodes-base.schedule': TriggerNode,
  // Fallbacks
  default: ActionNode,
};