 import { useState } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { 
   PanelLeftClose, 
   PanelLeft, 
   Save, 
   Play, 
   CheckCircle2,
   Loader2,
   ArrowRight,
   Rocket
 } from 'lucide-react';
 import { MainLayout } from '@/components/layout/MainLayout';
 import { Button } from '@/components/ui/button';
 import { ChatMessage } from '@/components/chat/ChatMessage';
 import { ChatInput } from '@/components/chat/ChatInput';
 import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
 import { useWorkflowChat } from '@/hooks/useWorkflowChat';
 import { cn } from '@/lib/utils';
 
 export default function Builder() {
   const [chatOpen, setChatOpen] = useState(true);
   const [showApproval, setShowApproval] = useState(false);
   const [deploymentLoading, setDeploymentLoading] = useState(false);
   const { messages, isLoading, currentWorkflow, n8nWorkflow, sendMessage } = useWorkflowChat();
 
   const handleApprove = async () => {
     if (!n8nWorkflow) return;
     
     setDeploymentLoading(true);
     try {
       const response = await fetch('/api/orchestrator/deploy-n8n', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ workflow: n8nWorkflow })
       });

       if (!response.ok) throw new Error('Deployment failed');

       const result = await response.json();
       setShowApproval(false);
       // Show success toast or redirect to n8n
       window.open(result.n8nUrl, '_blank');
     } catch (error) {
       console.error('Deployment error:', error);
       alert('Failed to deploy workflow to n8n');
     } finally {
       setDeploymentLoading(false);
     }
   };
 
   return (
     <MainLayout>
       <div className="h-screen flex flex-col">
         {/* Header */}
         <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
           <div className="flex items-center gap-4">
             <Button
               variant="ghost"
               size="icon"
               onClick={() => setChatOpen(!chatOpen)}
               className="h-9 w-9"
             >
               {chatOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
             </Button>
             <div>
               <h1 className="text-lg font-semibold text-foreground">Workflow Builder</h1>
               <p className="text-sm text-muted-foreground">Describe your workflow in plain English</p>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             <Button variant="outline" className="gap-2">
               <Save className="w-4 h-4" />
               Save Draft
             </Button>
             <Button 
               variant="outline" 
               className="gap-2"
               disabled={!currentWorkflow}
             >
               <Play className="w-4 h-4" />
               Test Run
             </Button>
             <Button 
               className="gap-2"
               disabled={!currentWorkflow || !n8nWorkflow}
               onClick={() => setShowApproval(true)}
             >
               <Rocket className="w-4 h-4" />
               Deploy to n8n
             </Button>
           </div>
         </div>
 
         {/* Main Content */}
         <div className="flex-1 flex overflow-hidden">
           {/* Chat Panel */}
           <AnimatePresence mode="wait">
             {chatOpen && (
               <motion.div
                 initial={{ width: 0, opacity: 0 }}
                 animate={{ width: 420, opacity: 1 }}
                 exit={{ width: 0, opacity: 0 }}
                 transition={{ duration: 0.2 }}
                 className="border-r border-border/50 flex flex-col bg-card/30"
               >
                 {/* Messages */}
                 <div className="flex-1 overflow-y-auto">
                   {messages.map((message) => (
                     <ChatMessage key={message.id} message={message} />
                   ))}
                   {isLoading && (
                     <div className="flex gap-3 p-4">
                       <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                         <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                       </div>
                       <div className="flex-1 bg-secondary rounded-2xl rounded-tl-md px-4 py-3">
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                           <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-100" />
                           <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-200" />
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
                 
                 {/* Input */}
                 <ChatInput onSend={sendMessage} isLoading={isLoading} />
               </motion.div>
             )}
           </AnimatePresence>
 
           {/* Canvas */}
           <div className="flex-1 p-4">
             {currentWorkflow ? (
               <WorkflowCanvas 
                 initialNodes={currentWorkflow.nodes} 
                 initialEdges={currentWorkflow.edges} 
               />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-card/30 rounded-xl border border-border/50 border-dashed">
                 <div className="text-center max-w-md">
                   <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow">
                     <ArrowRight className="w-8 h-8 text-primary" />
                   </div>
                   <h3 className="text-xl font-semibold text-foreground mb-2">
                     Describe Your Workflow
                   </h3>
                   <p className="text-muted-foreground">
                     Use the chat on the left to describe what you want to automate. 
                     I'll generate a visual workflow for you to review and modify.
                   </p>
                 </div>
               </div>
             )}
           </div>
         </div>
 
         {/* Approval Modal */}
         <AnimatePresence>
           {showApproval && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
               onClick={() => setShowApproval(false)}
             >
               <motion.div
                 initial={{ scale: 0.95, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.95, opacity: 0 }}
                 className="glass rounded-2xl p-8 max-w-md w-full mx-4"
                 onClick={(e) => e.stopPropagation()}
               >
                 <div className="w-16 h-16 rounded-2xl bg-node-success/10 flex items-center justify-center mx-auto mb-6">
                   <Rocket className="w-8 h-8 text-node-success" />
                 </div>
                 <h2 className="text-2xl font-bold text-foreground text-center mb-2">
                   Deploy to n8n?
                 </h2>
                 <p className="text-muted-foreground text-center mb-6">
                   Your workflow will be deployed to your n8n instance with Google OAuth credentials 
                   automatically configured for the required services.
                 </p>
                 <div className="flex gap-3">
                   <Button 
                     variant="outline" 
                     className="flex-1"
                     onClick={() => setShowApproval(false)}
                     disabled={deploymentLoading}
                   >
                     Cancel
                   </Button>
                   <Button 
                     className="flex-1"
                     onClick={handleApprove}
                     disabled={deploymentLoading}
                   >
                     {deploymentLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                     {deploymentLoading ? 'Deploying...' : 'Deploy'}
                   </Button>
                 </div>
               </motion.div>
             </motion.div>
           )}
         </AnimatePresence>
       </div>
     </MainLayout>
   );
 }