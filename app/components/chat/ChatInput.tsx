 import { useState, KeyboardEvent } from 'react';
 import { motion } from 'framer-motion';
 import { Send, Sparkles } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
 
 interface ChatInputProps {
   onSend: (message: string) => void;
   isLoading?: boolean;
   placeholder?: string;
 }
 
 export function ChatInput({ onSend, isLoading, placeholder = "Describe your workflow..." }: ChatInputProps) {
   const [input, setInput] = useState('');
 
   const handleSend = () => {
     if (input.trim() && !isLoading) {
       onSend(input.trim());
       setInput('');
     }
   };
 
   const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleSend();
     }
   };
 
   return (
     <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur-sm">
       <div className="flex items-end gap-3">
         <div className="flex-1 relative">
           <Textarea
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder={placeholder}
             className="min-h-[60px] max-h-[200px] resize-none bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl pr-12"
             disabled={isLoading}
           />
           <div className="absolute right-3 bottom-3 flex items-center gap-1 text-xs text-muted-foreground">
             <Sparkles className="w-3 h-3" />
             <span>AI-powered</span>
           </div>
         </div>
         <motion.div whileTap={{ scale: 0.95 }}>
           <Button
             onClick={handleSend}
             disabled={!input.trim() || isLoading}
             className="h-[60px] w-[60px] rounded-xl"
           >
             <Send className="w-5 h-5" />
           </Button>
         </motion.div>
       </div>
       <p className="text-xs text-muted-foreground mt-2 text-center">
         Press Enter to send • Shift + Enter for new line
       </p>
     </div>
   );
 }