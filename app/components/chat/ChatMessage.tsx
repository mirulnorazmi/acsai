 import { motion } from 'framer-motion';
 import { Bot, User } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { ChatMessage as ChatMessageType } from '@/types/workflow';
 
 interface ChatMessageProps {
   message: ChatMessageType;
 }
 
 export function ChatMessage({ message }: ChatMessageProps) {
   const isUser = message.role === 'user';
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className={cn(
         "flex gap-3 p-4",
         isUser ? "flex-row-reverse" : "flex-row"
       )}
     >
       <div className={cn(
         "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
         isUser ? "bg-primary/20" : "bg-secondary"
       )}>
         {isUser ? (
           <User className="w-4 h-4 text-primary" />
         ) : (
           <Bot className="w-4 h-4 text-muted-foreground" />
         )}
       </div>
       
       <div className={cn(
         "flex-1 max-w-[80%] rounded-2xl px-4 py-3",
         isUser 
           ? "bg-primary text-primary-foreground rounded-tr-md" 
           : "bg-secondary text-foreground rounded-tl-md"
       )}>
         <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
         <span className={cn(
           "text-[10px] mt-2 block",
           isUser ? "text-primary-foreground/70" : "text-muted-foreground"
         )}>
           {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
         </span>
       </div>
     </motion.div>
   );
 }