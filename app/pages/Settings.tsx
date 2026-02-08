import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Plug,
  Database,
  Key,
  Check
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { signIn, useSession } from 'next-auth/react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'api', label: 'API Keys', icon: Key },
];

const integrations = [
  { name: 'Slack', description: 'Send notifications and alerts', connected: true, icon: '💬' },
  { name: 'Google Workspace', description: 'Access Gmail, Calendar, Drive', connected: true, icon: '🔷' },
  { name: 'Salesforce', description: 'CRM integration', connected: false, icon: '☁️' },
  { name: 'Jira', description: 'Project management', connected: false, icon: '📋' },
  { name: 'GitHub', description: 'Repository webhooks', connected: true, icon: '🐙' },
  { name: 'Stripe', description: 'Payment processing', connected: false, icon: '💳' },
  { name: 'Google Cloud', description: 'Integrate with GCP services including Gmail, Calendar, and more', connected: false, icon: '🌩️' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      console.log('=== Current NextAuth Session ===');
      console.log('Full session object:', session);
      
      // Specifically check for Google-linked account
      const googleAccount = session?.accounts?.find((acc: any) => acc.provider === 'google');
      console.log('Has Google account linked?', !!googleAccount);
      if (googleAccount) {
        console.log('Google account details:', googleAccount);
      } else {
        console.log('No Google account found in session.accounts');
      }

      // Fallback check (if using JWT mode without database)
      console.log('Has Google access token?', !!session?.accessToken);
      
      // Quick summary
      console.log('Summary:', {
        isAuthenticated: status === 'authenticated',
        user: session?.user,
        hasGoogle: !!googleAccount,
        hasAccessToken: !!session?.accessToken,
        accountsProviders: session?.accounts?.map((a: any) => a.provider) || 'no accounts array',
      });
    } else if (status === 'unauthenticated') {
      console.log('User is NOT authenticated');
    } else if (status === 'loading') {
      console.log('Session is still loading...');
    }
  }, [session, status]); // Re-run when session or status changes


  if (status === "loading") {
    return (
      <MainLayout>
        <div className="p-8 text-center">Loading session...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your account and integrations</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 max-w-2xl">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="text-xl font-semibold text-foreground mb-6">Profile Settings</h2>
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">JD</span>
                    </div>
                    <Button variant="outline">Change Avatar</Button>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue="John Doe" className="bg-secondary/50" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="john@company.com" className="bg-secondary/50" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Input id="role" defaultValue="Operations Manager" className="bg-secondary/50" />
                    </div>
                  </div>
                  <Button>Save Changes</Button>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="text-xl font-semibold text-foreground mb-6">Notification Preferences</h2>
                <div className="space-y-6">
                  {[
                    { label: 'Workflow Failures', description: 'Get notified when a workflow fails' },
                    { label: 'Approval Requests', description: 'New Workflows pending your approval' },
                    { label: 'Weekly Reports', description: 'Summary of workflow performance' },
                    { label: 'System Updates', description: 'New features and maintenance' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* {activeTab === 'integrations' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-semibold text-foreground mb-2">Connected Services</h2>
                <p className="text-muted-foreground mb-6">Manage your third-party integrations</p>

                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="glass rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                        {integration.icon}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    {integration.connected ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-node-success flex items-center gap-1">
                          <Check className="w-4 h-4" /> Connected
                        </span>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                    ) : (
                      <Button size="sm">Connect</Button>
                    )}
                  </div>
                ))}
              </motion.div>
            )} */}

            {activeTab === 'integrations' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-semibold text-foreground mb-2">Connected Services</h2>
                <p className="text-muted-foreground mb-6">Manage your third-party integrations</p>

                {integrations.map((integration) => {
                  // For demo: consider Google Cloud connected if user has a Google account linked
                  // In production → query your DB / session.accounts for provider === 'google'
                  const isGoogleConnected = integration.name === 'Google Cloud' && session?.user;

                  // You can extend this logic for other providers too
                  const isConnected = integration.name === 'Google Cloud' 
                    ? isGoogleConnected 
                    : integration.connected;

                  return (
                    <div
                      key={integration.name}
                      className="glass rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                          {integration.icon}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{integration.name}</p>
                          <p className="text-sm text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>

                      {isConnected ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="w-4 h-4" /> Connected
                          </span>
                          <Button variant="outline" size="sm">Configure</Button>
                          {/* Optional: Add Disconnect button later */}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (integration.name === 'Google Cloud') {
                              signIn('google', {
                                // callbackUrl: '/settings?tab=integrations',
                                callbackUrl: '/settings',
                                // Optional: force consent screen every time (useful during dev)
                                // prompt: 'consent',
                              });
                            } else {
                              // For other integrations → you can implement similar flows later
                              alert(`Connect ${integration.name} coming soon`);
                            }
                          }}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'api' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="text-xl font-semibold text-foreground mb-2">API Keys</h2>
                <p className="text-muted-foreground mb-6">Manage API keys for external access</p>

                <div className="space-y-4">
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">Production Key</span>
                      <span className="text-xs text-muted-foreground">Created Dec 1, 2024</span>
                    </div>
                    <code className="text-sm text-muted-foreground font-mono">sk_live_****************************</code>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">Test Key</span>
                      <span className="text-xs text-muted-foreground">Created Nov 15, 2024</span>
                    </div>
                    <code className="text-sm text-muted-foreground font-mono">sk_test_****************************</code>
                  </div>
                  <Button variant="outline" className="w-full">Generate New Key</Button>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="text-xl font-semibold text-foreground mb-6">Security Settings</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Session Timeout</p>
                      <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Button variant="outline">Change Password</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}