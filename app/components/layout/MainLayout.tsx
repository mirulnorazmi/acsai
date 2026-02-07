 import { ReactNode } from 'react';
 import { Sidebar } from './Sidebar';
 
 interface MainLayoutProps {
   children: ReactNode;
 }
 
 export function MainLayout({ children }: MainLayoutProps) {
   return (
     <div className="min-h-screen bg-background">
       {/* Background gradient */}
       <div className="fixed inset-0 pointer-events-none">
         <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
         <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
       </div>
       
       <Sidebar />
       
       <main className="ml-64 min-h-screen relative">
         {children}
       </main>
     </div>
   );
 }