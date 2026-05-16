'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import {
  WORKFLOW_NODE_TYPES,
  NODE_PALETTE,
  WorkflowNodeData,
  WorkflowNodeType,
  NODE_PALETTE as palette,
} from './workflow-nodes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Play, Pause, Trash2, GripVertical, X, Settings, ChevronRight } from 'lucide-react';

let nodeIdCounter = 100;
function nextId() {
  return `n${++nodeIdCounter}`;
}

const TRIGGER_OPTIONS = [
  { value: 'manual', label: 'Manual / Button' },
  { value: 'webhook', label: 'Incoming Webhook' },
  { value: 'schedule', label: 'Scheduled (cron)' },
  { value: 'task_created', label: 'Task Created' },
  { value: 'task_updated', label: 'Task Status Changed' },
  { value: 'project_created', label: 'Project Created' },
  { value: 'crm_lead_created', label: 'CRM Lead Created' },
];

const ACTION_OPTIONS = [
  { value: 'create_task', label: 'Create Task' },
  { value: 'update_task', label: 'Update Task Status' },
  { value: 'assign_task', label: 'Assign Task' },
  { value: 'create_notification', label: 'Create Notification' },
  { value: 'update_crm_lead', label: 'Update CRM Lead Status' },
  { value: 'webhook_call', label: 'Call n8n Webhook' },
];

function NodePropertiesPanel({
  node,
  onChange,
  onClose,
  onDelete,
}: {
  node: Node<WorkflowNodeData>;
  onChange: (id: string, data: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const d = node.data;
  return (
    <div className="w-72 border-l bg-background h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Node Properties</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <Input
              value={d.label}
              onChange={(e) => onChange(node.id, { label: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          {d.type === 'trigger' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Trigger Event</Label>
              <Select
                value={String(d.config?.event ?? 'manual')}
                onValueChange={(v) => onChange(node.id, { config: { ...d.config, event: v } })}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {(d.config?.event === 'webhook' || d.config?.event === 'schedule') && (
                <div className="space-y-1.5 mt-2">
                  <Label className="text-xs">
                    {d.config.event === 'webhook' ? 'Webhook Path' : 'Cron Expression'}
                  </Label>
                  <Input
                    value={String(d.config?.value ?? '')}
                    onChange={(e) => onChange(node.id, { config: { ...d.config, value: e.target.value } })}
                    placeholder={d.config.event === 'webhook' ? '/webhook/my-trigger' : '0 9 * * 1-5'}
                    className="h-8 text-sm font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {d.type === 'action' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Action Type</Label>
              <Select
                value={String(d.config?.action ?? 'create_task')}
                onValueChange={(v) => onChange(node.id, { config: { ...d.config, action: v } })}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {d.type === 'condition' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Field</Label>
                <Input
                  value={String(d.config?.field ?? '')}
                  onChange={(e) => onChange(node.id, { config: { ...d.config, field: e.target.value } })}
                  placeholder="task.status"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={String(d.config?.operator ?? 'equals')}
                    onValueChange={(v) => onChange(node.id, { config: { ...d.config, operator: v } })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['equals', 'not_equals', 'contains', 'greater_than', 'less_than'].map((o) => (
                        <SelectItem key={o} value={o}>{o.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={String(d.config?.value ?? '')}
                    onChange={(e) => onChange(node.id, { config: { ...d.config, value: e.target.value } })}
                    placeholder="DONE"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {d.type === 'delay' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Duration</Label>
              <Input
                value={String(d.config?.duration ?? '')}
                onChange={(e) => onChange(node.id, { config: { ...d.config, duration: e.target.value } })}
                placeholder="1h, 2d, 1w"
                className="h-8 text-sm"
              />
            </div>
          )}

          {d.type === 'notification' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input
                  value={String(d.config?.title ?? '')}
                  onChange={(e) => onChange(node.id, { config: { ...d.config, title: e.target.value } })}
                  placeholder="Notification title"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message</Label>
                <Textarea
                  value={String(d.config?.body ?? '')}
                  onChange={(e) => onChange(node.id, { config: { ...d.config, body: e.target.value } })}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </>
          )}

          {d.type === 'http' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Method</Label>
                <Select
                  value={String(d.config?.method ?? 'POST')}
                  onValueChange={(v) => onChange(node.id, { config: { ...d.config, method: v } })}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL</Label>
                <Input
                  value={String(d.config?.url ?? '')}
                  onChange={(e) => onChange(node.id, { config: { ...d.config, url: e.target.value } })}
                  placeholder="https://n8n.example.com/webhook/..."
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Body (JSON)</Label>
                <Textarea
                  value={String(d.config?.body ?? '')}
                  onChange={(e) => onChange(node.id, { config: { ...d.config, body: e.target.value } })}
                  rows={3}
                  className="text-xs font-mono resize-none"
                  placeholder='{"key": "{{task.id}}"}'
                />
              </div>
            </>
          )}

          {d.type === 'email' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input
                  value={String(d.config?.to ?? '')}
                  onChange={(e) => onChange(node.id, { config: { ...d.config, to: e.target.value } })}
                  placeholder="user@example.com or {{assignee.email}}"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input
                  value={String(d.config?.subject ?? '')}
                  onChange={(e) => onChange(node.id, { config: { ...d.config, subject: e.target.value } })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Body</Label>
                <Textarea
                  value={String(d.config?.body ?? '')}
                  onChange={(e) => onChange(node.id, { config: { ...d.config, body: e.target.value } })}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </>
          )}

          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Node
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

interface WorkflowCanvasProps {
  initialNodes?: Node<WorkflowNodeData>[];
  initialEdges?: Edge[];
  isActive?: boolean;
  onSave: (nodes: Node<WorkflowNodeData>[], edges: Edge[]) => void;
  onToggle?: () => void;
  workflowName: string;
}

export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  isActive = false,
  onSave,
  onToggle,
  workflowName,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const addNode = useCallback((type: WorkflowNodeType) => {
    const id = nextId();
    const cfg = NODE_PALETTE.find((p) => p.type === type);
    const newNode: Node<WorkflowNodeData> = {
      id,
      type,
      position: { x: 200 + Math.random() * 200, y: 100 + nodes.length * 100 },
      data: { label: cfg?.label ?? type, type, config: {} },
    };
    setNodes((ns) => [...ns, newNode]);
    setSelectedNode(newNode);
  }, [nodes.length, setNodes]);

  const updateNodeData = useCallback((id: string, patch: Partial<WorkflowNodeData>) => {
    setNodes((ns) =>
      ns.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)
    );
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, ...patch } } : prev);
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  return (
    <div className="flex h-full overflow-hidden rounded-xl border bg-card">
      {/* Left palette */}
      <div className={cn('border-r bg-muted/30 transition-all duration-200', paletteOpen ? 'w-56' : 'w-0 overflow-hidden')}>
        <div className="p-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nodes</p>
        </div>
        <div className="p-2 space-y-1">
          {palette.map((item) => (
            <button
              key={item.type}
              onClick={() => addNode(item.type)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
            >
              <p className="text-xs font-medium group-hover:text-primary transition-colors">{item.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={WORKFLOW_NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          className="bg-background/50"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground)/0.15)" />
          <Controls className="!bg-card !border-border !shadow-md" />
          <MiniMap
            nodeColor={(n) => {
              const type = (n.data as WorkflowNodeData).type;
              const colors: Record<string, string> = {
                trigger: '#16a34a', action: '#3b82f6', condition: '#f59e0b',
                delay: '#a855f7', notification: '#f97316', http: '#06b6d4', email: '#f43f5e',
              };
              return colors[type] ?? '#94a3b8';
            }}
            className="!bg-card !border-border !rounded-lg"
          />
          {/* Toolbar */}
          <Panel position="top-left" className="flex items-center gap-2 ml-1 mt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-background/90 backdrop-blur-sm"
              onClick={() => setPaletteOpen((o) => !o)}
            >
              {paletteOpen ? '← Hide' : '+ Nodes'}
            </Button>
          </Panel>
          <Panel position="top-right" className="flex items-center gap-2 mr-1 mt-1">
            <Badge variant={isActive ? 'success' : 'outline'} className="text-[10px]">
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            {onToggle && (
              <Button variant="outline" size="sm" className="h-8 text-xs bg-background/90 backdrop-blur-sm" onClick={onToggle}>
                {isActive ? <><Pause className="mr-1.5 h-3 w-3" />Disable</> : <><Play className="mr-1.5 h-3 w-3" />Enable</>}
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => onSave(nodes, edges)}
            >
              <Save className="mr-1.5 h-3 w-3" /> Save
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right properties panel */}
      {selectedNode && (
        <NodePropertiesPanel
          node={selectedNode}
          onChange={updateNodeData}
          onClose={() => setSelectedNode(null)}
          onDelete={deleteNode}
        />
      )}
    </div>
  );
}
