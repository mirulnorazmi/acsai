"use client";

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Builder from "./pages/Builder";
import Workflows from "./pages/Workflows";
import Executions from "./pages/Executions";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LoginPage from "./login/page";
import RegisterPage from "./register/page";

/**
 * Temporary bootstrap component that maintains the Vite app's React Router structure.
 * This allows the app to run immediately without breaking existing routing logic.
 * 
 * MIGRATION PLAN:
 * - This component will be gradually replaced as we migrate routes to Next.js file-based routing
 * - Each route will be moved to its own file in the /app directory
 * - Once all routes are migrated, this component will be removed
 */
export function ViteAppBootstrap() {
  const [mounted, setMounted] = useState(false);

  // Only render on the client side to avoid SSR issues with BrowserRouter
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/builder" element={<Builder />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/executions" element={<Executions />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
