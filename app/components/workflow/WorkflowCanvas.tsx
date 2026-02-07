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
 } from '@xyflow/react';
 import '@xyflow/react/dist/style.css';
 import { nodeTypes } from './CustomNodes';
 
 interface WorkflowCanvasProps {
   initialNodes?: Node[];
   initialEdges?: Edge[];
   onNodesChange?: (nodes: Node[]) => void;
   onEdgesChange?: (edges: Edge[]) => void;
 }
 
 const defaultNodes: Node[] = [
   {
     id: '1',
     type: 'trigger',
     position: { x: 250, y: 50 },
     data: { label: 'New Employee Added', description: 'HR System Webhook', nodeType: 'trigger' },
   },
   {
     id: '2',
     type: 'action',
     position: { x: 250, y: 180 },
     data: { label: 'Create User Account', description: 'Active Directory', nodeType: 'action', icon: 'users' },
   },
   {
     id: '3',
     type: 'action',
     position: { x: 250, y: 310 },
     data: { label: 'Send Welcome Email', description: 'Email Service', nodeType: 'action', icon: 'email' },
   },
   {
     id: '4',
     type: 'condition',
     position: { x: 250, y: 440 },
     data: { label: 'Is Manager?', description: 'Check role', nodeType: 'condition' },
   },
   {
     id: '5',
     type: 'action',
     position: { x: 100, y: 580 },
     data: { label: 'Grant Admin Access', description: 'Permission System', nodeType: 'action' },
   },
   {
     id: '6',
     type: 'delay',
     position: { x: 400, y: 580 },
     data: { label: 'Wait 3 Days', description: 'Follow-up delay', nodeType: 'delay' },
   },
 ];
 
 const defaultEdges: Edge[] = [
   { id: 'e1-2', source: '1', target: '2', animated: true },
   { id: 'e2-3', source: '2', target: '3' },
   { id: 'e3-4', source: '3', target: '4' },
   { id: 'e4-5', source: '4', target: '5', sourceHandle: 'yes', label: 'Yes' },
   { id: 'e4-6', source: '4', target: '6', sourceHandle: 'no', label: 'No' },
 ];
 
 export function WorkflowCanvas({ 
   initialNodes = defaultNodes, 
   initialEdges = defaultEdges,
   onNodesChange: onNodesChangeProp,
   onEdgesChange: onEdgesChangeProp,
 }: WorkflowCanvasProps) {
   const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
   const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
 
   const onConnect = useCallback(
     (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
     [setEdges]
   );
 
   return (
     <div className="w-full h-full bg-background rounded-xl overflow-hidden border border-border/50">
       <ReactFlow
         nodes={nodes}
         edges={edges}
         onNodesChange={(changes) => {
           onNodesChange(changes);
           onNodesChangeProp?.(nodes);
         }}
         onEdgesChange={(changes) => {
           onEdgesChange(changes);
           onEdgesChangeProp?.(edges);
         }}
         onConnect={onConnect}
         nodeTypes={nodeTypes}
         fitView
         className="bg-background"
         defaultEdgeOptions={{
           style: { stroke: 'hsl(173 80% 45%)', strokeWidth: 2 },
           type: 'smoothstep',
         }}
       >
         <Background 
           variant={BackgroundVariant.Dots} 
           gap={20} 
           size={1} 
           color="hsl(222 25% 25%)"
         />
         <Controls className="!bg-card !border-border !rounded-lg" />
         <MiniMap 
           className="!bg-card !border-border !rounded-lg"
           nodeColor={(node) => {
             switch (node.type) {
               case 'trigger': return 'hsl(38 92% 50%)';
               case 'action': return 'hsl(173 80% 45%)';
               case 'condition': return 'hsl(262 83% 58%)';
               case 'delay': return 'hsl(200 98% 39%)';
               default: return 'hsl(222 30% 30%)';
             }
           }}
         />
       </ReactFlow>
     </div>
   );
 }