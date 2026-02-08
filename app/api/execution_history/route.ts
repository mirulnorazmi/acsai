import { NextRequest, NextResponse } from "next/server";
import { supabase, validateSupabaseConfig } from "@/lib/supabase";
import { extractUserId } from "@/lib/auth";

/**
 * Extract trigger name from workflow steps JSON.
 * Steps is a flat array of step objects: [{ id, name, action, params }, ...]
 * Returns the first step's "name" value.
 * Handles both parsed arrays and JSON strings.
 */
function extractTriggerName(steps: unknown): string {
  let parsed = steps;

  // If steps is a JSON string, parse it first
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return "Unknown";
    }
  }

  // Check if parsed is an object with a 'nodes' array
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "nodes" in parsed &&
    Array.isArray(parsed.nodes) &&
    parsed.nodes.length > 0
  ) {
    const firstNode = parsed.nodes[0] as { name?: string };
    if (firstNode && typeof firstNode.name === "string") {
      return firstNode.name;
    }
  }

  // Fallback: if parsed is already an array (for backward compatibility)
  if (Array.isArray(parsed) && parsed.length > 0) {
    const firstStep = parsed[0] as { name?: string };
    if (firstStep && typeof firstStep.name === "string") {
      return firstStep.name;
    }
  }

  return "Unknown";
}

/**
 * GET /api/execution_history
 * Retrieve execution history details including stats and table data.
 * Only shows executions from gold standard workflows.
 *
 * Response:
 * - stats: { total_today, successful, failed, workflows }
 * - executions: [{ workflow_name, status, started_at, duration, trigger }]
 */
export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // 1. Extract and validate user
    const userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Missing or invalid authorization token",
        },
        { status: 401 },
      );
    }

    // 2. Calculate today's date range (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    // 3. Step 1: Get gold standard workflow IDs
    const { data: goldWorkflows, error: wfError } = await supabase
      .from("x_workflows")
      .select("id, name, status, steps")
      .eq("is_gold_standard", true)
      .eq("user_id", userId);

    if (wfError) {
      console.error("Failed to fetch gold standard workflows:", wfError);
      return NextResponse.json(
        {
          error: "Database Error",
          message: "Failed to fetch workflows",
        },
        { status: 500 },
      );
    }
    // console.log(userId, "[execution_history] gold standard workflows fetched");
    const workflows_list = goldWorkflows || [];
    const workflowMap = new Map(workflows_list.map((wf) => [wf.id, wf]));
    const goldWorkflowIds = workflows_list.map((wf) => wf.id);

    // console.log(
    //   "[execution_history] gold standard workflows:",
    //   goldWorkflowIds.length,
    //   goldWorkflowIds,
    // );

    if (goldWorkflowIds.length === 0) {
      return NextResponse.json({
        stats: { total_today: 0, successful: 0, failed: 0, workflows: 0 },
        executions: [],
      });
    }

    // 3. Step 2: Get execution logs for those workflow IDs
    const { data: executionLogs, error: logsError } = await supabase
      .from("x_execution_logs")
      .select("id, workflow_id, status, started_at, completed_at, created_at")
      .in("workflow_id", goldWorkflowIds)
      .order("started_at", { ascending: false });

    if (logsError) {
      console.error("Failed to fetch execution logs:", logsError);
      return NextResponse.json(
        {
          error: "Database Error",
          message: "Failed to fetch execution history",
        },
        { status: 500 },
      );
    }

    const logs = executionLogs || [];
    // console.log("[execution_history] execution logs found:", logs.length);

    // 4. Group execution logs by workflow_id
    const groupedByWorkflow = new Map<string, typeof logs>();
    for (const log of logs) {
      const existing = groupedByWorkflow.get(log.workflow_id) || [];
      existing.push(log);
      groupedByWorkflow.set(log.workflow_id, existing);
    }

    // 5. Calculate stats
    const todayLogs = logs.filter((log) => {
      const logDate = new Date(log.created_at);
      return logDate >= todayStart && logDate <= todayEnd;
    });

    const totalToday = todayLogs.length;
    const successful = todayLogs.filter(
      (log) => log.status === "completed",
    ).length;
    const failed = todayLogs.filter((log) => log.status === "failed").length;
    const workflowCount = groupedByWorkflow.size;

    // 6. Format: one row per workflow with aggregated execution info
    const executions = Array.from(groupedByWorkflow.entries()).map(
      ([workflowId, workflowLogs]) => {
        const workflow = workflowMap.get(workflowId) || null;

        // Sort logs by started_at descending to get the latest execution
        const sorted = [...workflowLogs].sort((a, b) => {
          const aTime = new Date(a.started_at || a.created_at).getTime();
          const bTime = new Date(b.started_at || b.created_at).getTime();
          return bTime - aTime;
        });
        const latest = sorted[0];

        // Duration of latest execution: completed_at - started_at
        let duration: string | null = null;
        const startTime = latest.started_at || latest.created_at;
        const endTime = latest.completed_at;
        if (startTime && endTime) {
          const diffMs =
            new Date(endTime).getTime() - new Date(startTime).getTime();
          if (diffMs < 0) {
            duration = "0ms";
          } else if (diffMs < 1000) {
            duration = `${diffMs}ms`;
          } else if (diffMs < 60000) {
            duration = `${(diffMs / 1000).toFixed(1)}s`;
          } else {
            const minutes = Math.floor(diffMs / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);
            duration = `${minutes}m ${seconds}s`;
          }
        }

        const trigger = workflow?.steps
          ? extractTriggerName(workflow.steps)
          : "Unknown";

        // Build individual runs list (sorted newest first)
        const runs = sorted.map((run, idx) => {
          const runStart = run.started_at || run.created_at;
          const runEnd = run.completed_at;
          let runDuration: string | null = null;
          if (runStart && runEnd) {
            const diff =
              new Date(runEnd).getTime() - new Date(runStart).getTime();
            if (diff < 0) runDuration = "0ms";
            else if (diff < 1000) runDuration = `${diff}ms`;
            else if (diff < 60000) runDuration = `${(diff / 1000).toFixed(1)}s`;
            else {
              const m = Math.floor(diff / 60000);
              const s = Math.floor((diff % 60000) / 1000);
              runDuration = `${m}m ${s}s`;
            }
          }
          return {
            run_number: sorted.length - idx,
            status: run.status,
            started_at: runStart,
            duration: runDuration,
          };
        });

        return {
          id: workflowId,
          workflow_name: workflow?.name || "Unknown Workflow",
          status: latest.status,
          started_at: startTime,
          duration,
          trigger,
          total_executions: workflowLogs.length,
          successful: workflowLogs.filter((l) => l.status === "completed")
            .length,
          failed: workflowLogs.filter((l) => l.status === "failed").length,
          runs,
        };
      },
    );

    // Sort by latest started_at descending
    executions.sort((a, b) => {
      const aTime = new Date(a.started_at).getTime();
      const bTime = new Date(b.started_at).getTime();
      return bTime - aTime;
    });

    // 7. Return response
    return NextResponse.json({
      stats: {
        total_today: totalToday,
        successful,
        failed,
        workflows: workflowCount,
      },
      executions,
    });
  } catch (error) {
    console.error("Error fetching execution history:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          "An unexpected error occurred while fetching execution history",
      },
      { status: 500 },
    );
  }
}
