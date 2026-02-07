import { ViteAppBootstrap } from "./vite-app-bootstrap";

/**
 * Main entry point for the Next.js app.
 * Currently renders the Vite app via ViteAppBootstrap to maintain all existing functionality.
 * 
 * MIGRATION STATUS:
 * ✅ Dependencies installed
 * ✅ Environment variables configured
 * ✅ Global styles migrated
 * ✅ Providers setup (QueryClient, Tooltips, Toasts)
 * 🔄 Using temporary React Router bootstrap
 * ⏳ Routes will be migrated to Next.js file-based routing incrementally
 */
export default function Home() {
  return <ViteAppBootstrap />;
}

