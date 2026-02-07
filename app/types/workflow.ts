 export type NodeType = 'trigger' | 'action' | 'condition' | 'delay' | 'error';
 
 export interface WorkflowNode {
   id: string;
   type: NodeType;
   label: string;
   description: string;
   config?: Record<string, unknown>;
   position: { x: number; y: number };
 }
 
 export interface WorkflowEdge {
   id: string;
   source: string;
   target: string;
   label?: string;
   condition?: string;
 }
 
 export interface Workflow {
   id: string;
   name: string;
   description: string;
   nodes: WorkflowNode[];
   edges: WorkflowEdge[];
   status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'error';
   createdAt: Date;
   updatedAt: Date;
   executionCount?: number;
   lastExecuted?: Date;
 }
 
 export interface ChatMessage {
   id: string;
   role: 'user' | 'assistant';
   content: string;
   timestamp: Date;
   workflowPreview?: Partial<Workflow>;
 }
 
 export interface WorkflowDSL {
   version: string;
   name: string;
   description: string;
   trigger: {
     type: string;
     config: Record<string, unknown>;
   };
   steps: WorkflowStep[];
   errorHandling?: {
     retryCount: number;
     retryDelay: number;
     fallback?: string;
   };
 }
 
 export interface WorkflowStep {
   id: string;
   type: 'action' | 'condition' | 'delay' | 'loop' | 'parallel';
   name: string;
   config: Record<string, unknown>;
   onSuccess?: string;
   onError?: string;
   children?: WorkflowStep[];
 }