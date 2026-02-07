import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquarePlus,
  GitBranch,
  History,
  Settings,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: MessageSquarePlus, label: 'New Workflow', path: '/builder' },
  { icon: GitBranch, label: 'Workflows', path: '/x_workflows' },
  { icon: History, label: 'Executions', path: '/executions' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card/95 backdrop-blur-xl border-r border-border/50 z-50">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <Link to="/" className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              style={{ boxShadow: '0 0 20px hsl(173 80% 45% / 0.2)' }}
            >
              <Zap className="w-5 h-5 text-primary" strokeWidth={2.5} />
            </motion.div>
            <div>
              <h1 className="font-bold text-foreground tracking-tight">FlowForge</h1>
              <p className="text-xs text-muted-foreground">AI Workflow Builder</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      />
                    )}
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border/30">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/30">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              <span className="text-sm font-semibold text-primary">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">John Doe</p>
              <p className="text-xs text-muted-foreground truncate">john@company.com</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}