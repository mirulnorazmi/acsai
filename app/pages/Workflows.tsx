 import { useState } from 'react';
 import { motion } from 'framer-motion';
 import { Plus, Search, Filter } from 'lucide-react';
 import { Link } from 'react-router-dom';
 import { MainLayout } from '@/components/layout/MainLayout';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { WorkflowCard } from '@/components/workflow/WorkflowCard';
 import { Workflow } from '@/types/workflow';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 
 const allWorkflows: Workflow[] = [
   {
     id: '1',
     name: 'Employee Onboarding',
     description: 'Automate new hire setup across all systems',
     nodes: [
       { id: '1', type: 'trigger', label: 'New Employee', description: '', position: { x: 0, y: 0 } },
       { id: '2', type: 'action', label: 'Create Account', description: '', position: { x: 0, y: 0 } },
       { id: '3', type: 'action', label: 'Send Email', description: '', position: { x: 0, y: 0 } },
     ],
     edges: [],
     status: 'active',
     createdAt: new Date(),
     updatedAt: new Date(),
     executionCount: 47,
   },
   {
     id: '2',
     name: 'Invoice Approval',
     description: 'Route invoices for approval based on amount',
     nodes: [
       { id: '1', type: 'trigger', label: 'Invoice Received', description: '', position: { x: 0, y: 0 } },
       { id: '2', type: 'condition', label: 'Check Amount', description: '', position: { x: 0, y: 0 } },
     ],
     edges: [],
     status: 'pending_approval',
     createdAt: new Date(),
     updatedAt: new Date(),
     executionCount: 0,
   },
   {
     id: '3',
     name: 'Support Ticket Routing',
     description: 'Assign tickets to the right team automatically',
     nodes: [
       { id: '1', type: 'trigger', label: 'New Ticket', description: '', position: { x: 0, y: 0 } },
       { id: '2', type: 'condition', label: 'Priority Check', description: '', position: { x: 0, y: 0 } },
       { id: '3', type: 'action', label: 'Assign Team', description: '', position: { x: 0, y: 0 } },
       { id: '4', type: 'action', label: 'Notify', description: '', position: { x: 0, y: 0 } },
     ],
     edges: [],
     status: 'active',
     createdAt: new Date(),
     updatedAt: new Date(),
     executionCount: 234,
   },
   {
     id: '4',
     name: 'Lead Qualification',
     description: 'Score and route incoming leads to sales',
     nodes: [
       { id: '1', type: 'trigger', label: 'New Lead', description: '', position: { x: 0, y: 0 } },
       { id: '2', type: 'action', label: 'Score Lead', description: '', position: { x: 0, y: 0 } },
     ],
     edges: [],
     status: 'draft',
     createdAt: new Date(),
     updatedAt: new Date(),
     executionCount: 0,
   },
   {
     id: '5',
     name: 'Contract Renewal',
     description: 'Automated reminders for upcoming renewals',
     nodes: [
       { id: '1', type: 'trigger', label: 'Schedule', description: '', position: { x: 0, y: 0 } },
       { id: '2', type: 'condition', label: 'Days Until', description: '', position: { x: 0, y: 0 } },
       { id: '3', type: 'action', label: 'Send Reminder', description: '', position: { x: 0, y: 0 } },
     ],
     edges: [],
     status: 'paused',
     createdAt: new Date(),
     updatedAt: new Date(),
     executionCount: 89,
   },
   {
     id: '6',
     name: 'Data Backup',
     description: 'Scheduled backup to cloud storage',
     nodes: [
       { id: '1', type: 'trigger', label: 'Cron Job', description: '', position: { x: 0, y: 0 } },
       { id: '2', type: 'action', label: 'Backup', description: '', position: { x: 0, y: 0 } },
     ],
     edges: [],
     status: 'error',
     createdAt: new Date(),
     updatedAt: new Date(),
     executionCount: 156,
   },
 ];
 
 export default function Workflows() {
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState<string>('all');
 
   const filteredWorkflows = allWorkflows.filter((workflow) => {
     const matchesSearch = workflow.name.toLowerCase().includes(search.toLowerCase()) ||
       workflow.description.toLowerCase().includes(search.toLowerCase());
     const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
     return matchesSearch && matchesStatus;
   });
 
   return (
     <MainLayout>
       <div className="p-8">
         {/* Header */}
         <div className="flex items-center justify-between mb-8">
           <div>
             <h1 className="text-3xl font-bold text-foreground mb-1">Workflows</h1>
             <p className="text-muted-foreground">Manage all your automated workflows</p>
           </div>
           <Link to="/builder">
             <Button className="gap-2">
               <Plus className="w-4 h-4" />
               New Workflow
             </Button>
           </Link>
         </div>
 
         {/* Filters */}
         <div className="flex items-center gap-4 mb-6">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Search workflows..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-10 bg-card/50"
             />
           </div>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="w-[180px] bg-card/50">
               <Filter className="w-4 h-4 mr-2" />
               <SelectValue placeholder="Filter by status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Status</SelectItem>
               <SelectItem value="active">Active</SelectItem>
               <SelectItem value="pending_approval">Pending</SelectItem>
               <SelectItem value="draft">Draft</SelectItem>
               <SelectItem value="paused">Paused</SelectItem>
               <SelectItem value="error">Error</SelectItem>
             </SelectContent>
           </Select>
         </div>
 
         {/* Workflow Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredWorkflows.map((workflow, index) => (
             <motion.div
               key={workflow.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: index * 0.05 }}
             >
               <WorkflowCard workflow={workflow} />
             </motion.div>
           ))}
         </div>
 
         {filteredWorkflows.length === 0 && (
           <div className="text-center py-16">
             <p className="text-muted-foreground">No workflows found matching your criteria.</p>
           </div>
         )}
       </div>
     </MainLayout>
   );
 }