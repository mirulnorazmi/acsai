import { NextRequest, NextResponse } from "next/server";
import { supabase, validateSupabaseConfig } from "@/lib/supabase";
import { extractUserId } from "@/lib/auth";
import { Workflow } from "@/types/workflow";

/**
 * Transform database workflow to frontend Workflow type
 */
function transformWorkflow(dbWorkflow: any): Workflow {
  let nodes = [];
  let edges = [];

  if (dbWorkflow && dbWorkflow.steps) {
    try {
      const stepsData =
        typeof dbWorkflow.steps === "string"
          ? JSON.parse(dbWorkflow.steps)
          : dbWorkflow.steps;

      if (Array.isArray(stepsData)) {
        nodes = stepsData
          .filter((step: any) => step !== null && step !== undefined)
          .map((step: any, index: number) => ({
            id: step?.id || `node-${index}`,
            type: step?.type || "action",
            label: step?.name || step?.label || "Step",
            description: step?.description || "",
            position: step?.position || { x: 0, y: index * 100 },
            config: step?.config || step?.params || {},
          }));
      } else if (
        typeof stepsData === "object" &&
        stepsData !== null &&
        "nodes" in stepsData &&
        Array.isArray(stepsData.nodes)
      ) {
        nodes = stepsData.nodes
          .filter((node: any) => node !== null && node !== undefined)
          .map((node: any) => ({
            id: node?.id || `node-${Math.random()}`,
            type: node?.type || "action",
            label: node?.label || "Step",
            description: node?.description || "",
            position: node?.position || { x: 0, y: 0 },
            config: node?.config || {},
          }));

        if (Array.isArray(stepsData.edges)) {
          edges = stepsData.edges.filter(
            (edge: any) => edge !== null && edge !== undefined,
          );
        }
      }
    } catch (error) {
      console.error("Failed to parse workflow steps:", error);
    }
  }

  return {
    id: dbWorkflow?.id || "",
    name: dbWorkflow?.name || "Untitled Workflow",
    description: dbWorkflow?.description || "",
    nodes,
    edges,
    status:
      (dbWorkflow?.status as
        | "draft"
        | "pending_approval"
        | "approved"
        | "active"
        | "paused"
        | "error") || "draft",
    createdAt: dbWorkflow?.created_at
      ? new Date(dbWorkflow.created_at)
      : new Date(),
    updatedAt: dbWorkflow?.updated_at
      ? new Date(dbWorkflow.updated_at)
      : new Date(),
    executionCount: 0,
  };
}

/**
 * Format duration in seconds to human readable string
 */
function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  if (seconds < 1) return "<1s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.round(seconds / 60);
  return `${mins}m`;
}

/**
 * GET /api/dashboard
 * Retrieve dashboard stats and recent workflows for the current user
 *
 * Returns:
 * - stats: { activeWorkflows, executionsToday, avgRuntime, successRate }
 * - recentWorkflows: Latest workflows created by user
 */
export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // 1. Extract and validate user
    const authHeader = request.headers.get("authorization");
    console.log("[Dashboard API] Auth header present:", !!authHeader);

    const userId = await extractUserId(request);

    if (!userId) {
      console.error("[Dashboard API] Failed to extract user ID from token");
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication failed. Please ensure you are logged in.",
          details:
            process.env.NODE_ENV === "development"
              ? "User ID could not be extracted from token. Check your login session."
              : undefined,
        },
        { status: 401 },
      );
    }

    console.log("[Dashboard API] User authenticated:", userId);

    // 2. Fetch active workflows count
    const { count: activeCount, error: activeError } = await supabase
      .from("x_workflows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("is_deleted", false);

    const activeWorkflowsCount = activeError ? 0 : activeCount || 0;

    // 3. Fetch execution count for today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const { count: execCount, error: executionsTodayError } =
      await supabase
        .from("x_execution_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("started_at", today.toISOString())
        .lte("started_at", todayEnd.toISOString());

    const executionsTodayCount = executionsTodayError
      ? 0
      : execCount || 0;

    // 4. Fetch runtime data and calculate average
    const { data: runtimeData, error: runtimeError } = await supabase
      .from("x_execution_logs")
      .select("started_at, completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .not("started_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(100);

    let avgRuntimeSeconds = 0;
    if (!runtimeError && runtimeData && runtimeData.length > 0) {
      const runtimes = runtimeData
        .map((log: any) => {
          const start = new Date(log.started_at).getTime();
          const end = new Date(log.completed_at).getTime();
          return (end - start) / 1000; // Convert to seconds
        })
        .filter((duration: number) => duration > 0);

      if (runtimes.length > 0) {
        avgRuntimeSeconds =
          runtimes.reduce((a: number, b: number) => a + b, 0) / runtimes.length;
      }
    }

    // 5. Fetch success rate data
    // Success rate = (executions with status='completed') / (total executions) * 100
    const { data: allExecutions, error: allExecutionsError } = await supabase
      .from("x_execution_logs")
      .select("status", { count: "exact", head: false })
      .eq("user_id", userId);

    let successRate = 0;
    if (!allExecutionsError && allExecutions && allExecutions.length > 0) {
      const completedCount = allExecutions.filter(
        (log: any) => log.status === "completed",
      ).length;
      successRate = Math.round((completedCount / allExecutions.length) * 100);
    }

    // 6. Fetch recent workflows for this user (latest 3)
    const { data: recentWorkflowsData, error: recentError } = await supabase
      .from("x_workflows")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentError) {
      console.error(
        "[Dashboard API] Failed to fetch recent workflows:",
        recentError,
      );
    }

    const recentWorkflows = (recentWorkflowsData || []).map(transformWorkflow);

    console.log("[Dashboard API] Dashboard stats calculated:", {
      activeWorkflows: activeWorkflowsCount,
      executionsToday: executionsTodayCount,
      avgRuntime: avgRuntimeSeconds,
      successRate,
    });

    const stats = {
      activeWorkflows: activeWorkflowsCount,
      executionsToday: executionsTodayCount,
      avgRuntime: formatDuration(avgRuntimeSeconds),
      avgRuntimeSeconds,
      successRate,
    };

    return NextResponse.json({
      success: true,
      stats,
      recentWorkflows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Dashboard API] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "An unexpected error occurred while fetching dashboard data",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}
