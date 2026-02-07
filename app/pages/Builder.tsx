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
   FileUp,
   X
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
   const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
   const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
   const { messages, isLoading, currentWorkflow, sendMessage } = useWorkflowChat();

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = Array.from(e.target.files || []);
     const pdfFiles = files.filter((file) => file.type === 'application/pdf');
     
     pdfFiles.forEach((file) => {
       if (!uploadedFiles.some((f) => f.name === file.name && f.size === file.size)) {
         setUploadedFiles((prev) => [...prev, file]);
         setSelectedFiles((prev) => new Set([...prev, file.name]));
         
         console.log('File uploaded:', file.name);
         console.log('Total files now:', uploadedFiles.length + 1);
         
         // Read file as binary and log to console
         const reader = new FileReader();
         reader.onload = (event) => {
           const arrayBuffer = event.target?.result as ArrayBuffer;
           const binaryString = new Uint8Array(arrayBuffer);
           console.log(`PDF File Uploaded: ${file.name}`);
           console.log(`File Size: ${file.size} bytes`);
          //  console.log(`Binary Data:`, binaryString);
           console.log(`File Object:`, file);
         };
         reader.readAsArrayBuffer(file);
       }
     });
     
     // Reset the input so the same file can be uploaded again
     e.target.value = '';
   };

   const handleFileToggle = (fileName: string) => {
     setSelectedFiles((prev) => {
       const newSet = new Set(prev);
       if (newSet.has(fileName)) {
         newSet.delete(fileName);
       } else {
         newSet.add(fileName);
       }
       return newSet;
     });
   };

   const handleRemoveFile = (fileName: string) => {
     setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
     setSelectedFiles((prev) => {
       const newSet = new Set(prev);
       newSet.delete(fileName);
       return newSet;
     });
   };
 
   const handleApprove = () => {
     setShowApproval(false);
     // Would trigger actual workflow deployment
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
               disabled={!currentWorkflow}
               onClick={() => setShowApproval(true)}
             >
               <CheckCircle2 className="w-4 h-4" />
               Submit for Approval
             </Button>
           </div>
         </div>
 
         {/* Main Content - 3 Partitions */}
         <div className="flex-1 flex overflow-hidden">
           {/* Partition 1: Sources - Left (Only visible when files are uploaded) */}
           <AnimatePresence>
             {uploadedFiles.length > 0 && (
               <motion.div
                 initial={{ width: 0, opacity: 0 }}
                 animate={{ width: 192, opacity: 1 }}
                 exit={{ width: 0, opacity: 0 }}
                 transition={{ duration: 0.3 }}
                 className="border-r border-border/50 flex flex-col bg-card/30 w-48 overflow-hidden"
               >
                 <div className="flex items-center gap-2 p-4 border-b border-border/50">
                   <FileUp className="w-4 h-4 text-primary" />
                   <h3 className="text-sm font-semibold text-foreground">Sources</h3>
                 </div>
                 
                 <div className="space-y-2 p-3 flex-1 overflow-y-auto">
                   {uploadedFiles.map((file) => (
                     <div
                       key={file.name}
                       className="flex items-center gap-2 p-2 rounded-lg hover:bg-card/30 transition-colors"
                     >
                       <input
                         type="checkbox"
                         checked={selectedFiles.has(file.name)}
                         onChange={() => handleFileToggle(file.name)}
                         className="w-4 h-4 cursor-pointer rounded"
                       />
                       <div className="flex-1 min-w-0">
                         <p className="text-xs font-medium text-foreground truncate">
                           {file.name}
                         </p>
                       </div>
                       <button
                         onClick={() => handleRemoveFile(file.name)}
                         className="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                       >
                         <X className="w-3 h-3" />
                       </button>
                     </div>
                   ))}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Partition 2: Messages/Chat - Middle */}
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
                 
                 {/* PDF Upload Button */}
                 <div className="border-t border-border/50 p-3">
                   <input
                     type="file"
                     accept="application/pdf"
                     multiple
                     onChange={handleFileUpload}
                     className="hidden"
                     id="pdf-upload"
                   />
                   <label
                     htmlFor="pdf-upload"
                     className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-border/50 rounded cursor-pointer hover:bg-card/50 transition-colors text-center"
                   >
                     <FileUp className="w-4 h-4 text-muted-foreground" />
                     <span className="text-xs text-muted-foreground">Upload PDF</span>
                   </label>
                 </div>
                 
                 {/* Input */}
                 <ChatInput onSend={sendMessage} isLoading={isLoading} />
               </motion.div>
             )}
           </AnimatePresence>

           {/* Partition 3: Canvas - Right */}
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
                   <CheckCircle2 className="w-8 h-8 text-node-success" />
                 </div>
                 <h2 className="text-2xl font-bold text-foreground text-center mb-2">
                   Ready to Deploy?
                 </h2>
                 <p className="text-muted-foreground text-center mb-6">
                   Your workflow will be submitted for approval before going live. 
                   A team admin will review and activate it.
                 </p>
                 <div className="flex gap-3">
                   <Button 
                     variant="outline" 
                     className="flex-1"
                     onClick={() => setShowApproval(false)}
                   >
                     Cancel
                   </Button>
                   <Button 
                     className="flex-1"
                     onClick={handleApprove}
                   >
                     Submit for Approval
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