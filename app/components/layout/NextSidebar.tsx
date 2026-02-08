"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  MessageSquarePlus,
  GitBranch,
  History,
  Settings,
  Zap,
  LogOut,
  LogIn,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { UserProfile } from "@/types/auth"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: MessageSquarePlus, label: "New Workflow", path: "/builder" },
  { icon: GitBranch, label: "Workflows", path: "/workflows" },
  { icon: History, label: "Executions", path: "/executions" },
  { icon: Settings, label: "Settings", path: "/settings" },
]

export function NextSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("auth_token")
        
        if (!token) {
          console.log("No auth token found in localStorage")
          setLoading(false)
          return
        }

        console.log("Fetching user profile with token...")
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        console.log("User profile response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error("Failed to fetch user profile:", response.status, errorData)
          setLoading(false)
          return
        }

        const userData = await response.json()
        console.log("User data fetched successfully:", userData)
        setUser(userData)
      } catch (err) {
        console.error("Error fetching user:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  // Generate initials from full_name or email
  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() || "U"
  }

  // Get display name
  const getDisplayName = () => {
    return user?.full_name || user?.email || "User"
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const token = localStorage.getItem("auth_token")

      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }

      // Clear local storage and cookies
      localStorage.removeItem("auth_token")
      document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax; Secure"

      toast.success("Logged out successfully")
      
      // Use replace to avoid back button issues
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to logout")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card/95 backdrop-blur-xl border-r border-border/50 z-50">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              style={{ boxShadow: "0 0 20px hsl(173 80% 45% / 0.2)" }}
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
              const isActive = pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
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
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border/30 space-y-3">
          {loading ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/30 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </div>
          ) : !user ? (
            <>
              <div className="px-4 py-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground text-center">
                You are not signed in
              </div>
              <Link
                href="/login"
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/30 transition-colors hover:bg-secondary/50">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20 flex-shrink-0">
                <span className="text-sm font-semibold text-primary">{getInitials()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}

          {user && (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isLoggingOut
                  ? "opacity-50 cursor-not-allowed bg-secondary/30 text-muted-foreground"
                  : "bg-secondary/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              )}
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
