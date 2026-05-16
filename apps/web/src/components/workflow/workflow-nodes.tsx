'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Zap, GitBranch, Play, Clock, Bell, Globe, Mail, CheckSquare, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkflowNodeType =
  | 'trigger'
  | 'condition'
  | 'action'
  | 'delay'
  | 'notification'
  | 'http'
  | 'email';

export interface WorkflowNodeData {
  label: string;
  type: WorkflowNodeType;
  config?: Record<string, unknown>;
  isSelected?: boolean;
  [key: string]: unknown;
}

interface NodeConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  labelColor: string;
}

const NODE_CONFIG: Record<WorkflowNodeType, NodeConfig> = {
  trigger: {
    icon: Zap,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/50',
    borderColor: 'border-green-300 dark:border-green-700',
    labelColor: 'text-green-700 dark:text-green-300',
  },
  condition: {
    icon: GitBranch,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-300 dark:border-amber-700',
    labelColor: 'text-amber-700 dark:text-amber-300',
  },
  action: {
    icon: Play,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-300 dark:border-blue-700',
    labelColor: 'text-blue-700 dark:text-blue-300',
  },
  delay: {
    icon: Clock,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    borderColor: 'border-purple-300 dark:border-purple-700',
    labelColor: 'text-purple-700 dark:text-purple-300',
  },
  notification: {
    icon: Bell,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    borderColor: 'border-orange-300 dark:border-orange-700',
    labelColor: 'text-orange-700 dark:text-orange-300',
  },
  http: {
    icon: Globe,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
    borderColor: 'border-cyan-300 dark:border-cyan-700',
    labelColor: 'text-cyan-700 dark:text-cyan-300',
  },
  email: {
    icon: Mail,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/50',
    borderColor: 'border-rose-300 dark:border-rose-700',
    labelColor: 'text-rose-700 dark:text-rose-300',
  },
};

function BaseNode({ data, selected, children }: {
  data: WorkflowNodeData;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  const cfg = NODE_CONFIG[data.type] ?? NODE_CONFIG.action;
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        'rounded-xl border-2 shadow-md min-w-[160px] max-w-[220px] transition-all',
        cfg.bgColor,
        selected ? 'border-primary ring-2 ring-primary/30 shadow-lg' : cfg.borderColor
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn('p-1.5 rounded-lg', cfg.bgColor, 'border', cfg.borderColor)}>
          <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate text-foreground">{data.label}</p>
          <p className={cn('text-[10px] capitalize', cfg.labelColor)}>{data.type}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export const TriggerNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <BaseNode data={data} selected={selected}>
    <Handle type="source" position={Position.Bottom} className="!bg-green-500 !border-white !w-3 !h-3" />
  </BaseNode>
));
TriggerNode.displayName = 'TriggerNode';

export const ActionNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <BaseNode data={data} selected={selected}>
    <Handle type="target" position={Position.Top} className="!bg-blue-500 !border-white !w-3 !h-3" />
    <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !border-white !w-3 !h-3" />
  </BaseNode>
));
ActionNode.displayName = 'ActionNode';

export const ConditionNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <BaseNode data={data} selected={selected}>
    <Handle type="target" position={Position.Top} className="!bg-amber-500 !border-white !w-3 !h-3" />
    <div className="flex justify-between px-3 pb-2">
      <div className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">TRUE</div>
      <div className="text-[9px] text-red-500 font-medium">FALSE</div>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      id="true"
      style={{ left: '30%' }}
      className="!bg-green-500 !border-white !w-3 !h-3"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="false"
      style={{ left: '70%' }}
      className="!bg-red-500 !border-white !w-3 !h-3"
    />
  </BaseNode>
));
ConditionNode.displayName = 'ConditionNode';

export const DelayNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <BaseNode data={data} selected={selected}>
    <Handle type="target" position={Position.Top} className="!bg-purple-500 !border-white !w-3 !h-3" />
    <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !border-white !w-3 !h-3" />
    {data.config?.duration && (
      <div className="px-3 pb-2 text-[10px] text-purple-600 dark:text-purple-400 font-medium">
        Wait: {String(data.config.duration)}
      </div>
    )}
  </BaseNode>
));
DelayNode.displayName = 'DelayNode';

export const NotificationNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <BaseNode data={data} selected={selected}>
    <Handle type="target" position={Position.Top} className="!bg-orange-500 !border-white !w-3 !h-3" />
    <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !border-white !w-3 !h-3" />
  </BaseNode>
));
NotificationNode.displayName = 'NotificationNode';

export const HttpNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <BaseNode data={data} selected={selected}>
    <Handle type="target" position={Position.Top} className="!bg-cyan-500 !border-white !w-3 !h-3" />
    <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !border-white !w-3 !h-3" />
    {data.config?.url && (
      <div className="px-3 pb-2 text-[10px] text-cyan-600 dark:text-cyan-400 truncate font-mono">
        {String(data.config.url).replace(/^https?:\/\//, '')}
      </div>
    )}
  </BaseNode>
));
HttpNode.displayName = 'HttpNode';

export const EmailNode = memo(({ data, selected }: NodeProps<WorkflowNodeData>) => (
  <BaseNode data={data} selected={selected}>
    <Handle type="target" position={Position.Top} className="!bg-rose-500 !border-white !w-3 !h-3" />
    <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !border-white !w-3 !h-3" />
  </BaseNode>
));
EmailNode.displayName = 'EmailNode';

export const WORKFLOW_NODE_TYPES = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  notification: NotificationNode,
  http: HttpNode,
  email: EmailNode,
};

export const NODE_PALETTE: {
  type: WorkflowNodeType;
  label: string;
  description: string;
}[] = [
  { type: 'trigger', label: 'Trigger', description: 'Start on event / webhook / schedule' },
  { type: 'condition', label: 'Condition', description: 'Branch on true/false logic' },
  { type: 'action', label: 'Action', description: 'Create task, update record' },
  { type: 'delay', label: 'Delay', description: 'Wait for a duration or date' },
  { type: 'notification', label: 'Notification', description: 'Send in-app notification' },
  { type: 'http', label: 'HTTP / n8n', description: 'Call webhook or n8n flow' },
  { type: 'email', label: 'Email', description: 'Send email to user or team' },
];
