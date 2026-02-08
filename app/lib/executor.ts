import { supabase } from './supabase';
import { attemptSelfHealing, isErrorHealable, extractErrorDetails } from './self-healing';
import type { ExecutionContext, SelfHealingContext } from '@/types/execution';
import type { WorkflowStep } from '@/types/orchestrator';

/**
 * Workflow Executor Service
 * Handles the x_execution of workflow steps with self-healing capabilities
 */

const MAX_RETRY_ATTEMPTS = 1; // Retry once with AI fix

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<any> {
  // Log step start
  await logEvent(context.execution_id, {
    event_type: 'step_started',
    step_id: step.id,
    step_index: context.current_step_index,
    message: `Starting step: ${step.id} (${step.type})`,
  });

  // Create step x_execution record
  const stepExecutionId = await createStepExecution(
    context.execution_id,
    step,
    context.current_step_index
  );

  try {
    // Simulate step x_execution based on type
    const result = await simulateToolExecution(step, context);

    // Update step x_execution as completed
    await updateStepExecution(stepExecutionId, {
      status: 'completed',
      output_data: result,
      completed_at: new Date().toISOString(),
    });

    // Log step completion
    await logEvent(context.execution_id, {
      event_type: 'step_completed',
      step_id: step.id,
      step_index: context.current_step_index,
      message: `Completed step: ${step.id}`,
      metadata: { output: result },
    });

    return result;
  } catch (error) {
    const errorInfo = extractErrorDetails(error);

    // Log step failure
    await logEvent(context.execution_id, {
      event_type: 'step_failed',
      step_id: step.id,
      step_index: context.current_step_index,
      message: `Step failed: ${errorInfo.message}`,
      metadata: errorInfo.details,
    });

    // Update step x_execution as failed
    await updateStepExecution(stepExecutionId, {
      status: 'failed',
      error_message: errorInfo.message,
    });

    throw error;
  }
}

/**
 * Execute a step with self-healing retry
 */
async function executeStepWithHealing(
  step: WorkflowStep,
  context: ExecutionContext,
  retryCount: number = 0
): Promise<any> {
  try {
    return await executeStep(step, context);
  } catch (error) {
    const errorInfo = extractErrorDetails(error);

    // Check if we should attempt healing
    if (retryCount >= MAX_RETRY_ATTEMPTS || !isErrorHealable(error)) {
      throw error;
    }

    console.log(`[Self-Healing] Attempting to fix step ${step.id}...`);

    // Log retry attempt
    await logEvent(context.execution_id, {
      event_type: 'retry',
      step_id: step.id,
      step_index: context.current_step_index,
      message: `Attempting self-healing for step: ${step.id}`,
      metadata: { retry_count: retryCount + 1 },
    });

    try {
      // Prepare self-healing context
      const healingContext: SelfHealingContext = {
        step_id: step.id,
        tool_name: step.tool || 'unknown',
        step_type: step.type,
        step_config: step.config || {},
        error_message: errorInfo.message,
        error_details: errorInfo.details,
        workflow_context: context.input_variables,
        previous_outputs: context.step_outputs,
      };

      // Attempt AI fix
      const healingResult = await attemptSelfHealing(healingContext);

      // Log self-healing event
      await logEvent(context.execution_id, {
        event_type: 'self_healing',
        step_id: step.id,
        step_index: context.current_step_index,
        message: `AI applied fix to step: ${step.id}`,
        original_error: errorInfo.message,
        fix_applied: JSON.stringify(healingResult.fixed_config),
        ai_reasoning: healingResult.reasoning,
        retry_count: retryCount + 1,
      });

      // Create healed step with fixed config
      const healedStep: WorkflowStep = {
        ...step,
        config: healingResult.fixed_config,
      };

      // Retry with fixed configuration
      const result = await executeStep(healedStep, context);

      // Mark the step x_execution as healed
      const { data: stepExec } = await supabase
        .from('step_executions')
        .select('id')
        .eq('execution_id', context.execution_id)
        .eq('step_id', step.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (stepExec) {
        await updateStepExecution(stepExec.id, {
          status: 'healed',
          was_healed: true,
        });
      }

      return result;
    } catch (healingError) {
      console.error('[Self-Healing] Failed to heal step:', healingError);
      
      // Log healing failure
      await logEvent(context.execution_id, {
        event_type: 'error',
        step_id: step.id,
        step_index: context.current_step_index,
        message: `Self-healing failed for step: ${step.id}`,
        metadata: { healing_error: String(healingError) },
      });

      // Re-throw original error
      throw error;
    }
  }
}

/**
 * Execute an entire workflow
 */
export async function executeWorkflow(
  executionId: string,
  workflowId: string,
  userId: string,
  steps: WorkflowStep[],
  inputVariables: Record<string, any>
): Promise<void> {
  const context: ExecutionContext = {
    execution_id: executionId,
    workflow_id: workflowId,
    user_id: userId,
    input_variables: inputVariables,
    step_outputs: {},
    current_step_index: 0,
  };

  try {
    // Update x_execution status to running
    await updateExecutionLog(executionId, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // Execute each step sequentially
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      context.current_step_index = i;

      // Update current step
      await updateExecutionLog(executionId, {
        current_step_index: i,
        current_step_id: step.id,
      });

      // Execute step with self-healing
      const result = await executeStepWithHealing(step, context);

      // Store step output for future steps
      context.step_outputs[step.id] = result;

      // Small delay between steps
      await sleep(500);
    }

    // Mark x_execution as completed
    await updateExecutionLog(executionId, {
      status: 'completed',
      output_result: context.step_outputs,
      completed_at: new Date().toISOString(),
    });

    await logEvent(executionId, {
      event_type: 'info',
      message: 'Workflow x_execution completed successfully',
      metadata: { total_steps: steps.length },
    });
  } catch (error) {
    const errorInfo = extractErrorDetails(error);

    // Mark x_execution as failed
    await updateExecutionLog(executionId, {
      status: 'failed',
      error_message: errorInfo.message,
      completed_at: new Date().toISOString(),
    });

    await logEvent(executionId, {
      event_type: 'error',
      message: `Workflow x_execution failed: ${errorInfo.message}`,
      metadata: errorInfo.details,
    });

    console.error('[Executor] Workflow x_execution failed:', error);
  }
}

/**
 * Simulate tool x_execution (mock implementation)
 * In production, this would call actual tool integrations
 */
async function simulateToolExecution(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<any> {
  // Simulate network delay
  await sleep(Math.random() * 1000 + 500);

  // Mock tool x_execution based on tool type
  const tool = step.tool || 'unknown';
  const config = step.config || {};

  // Simulate occasional failures for testing self-healing
  const shouldFail = Math.random() < 0.2; // 20% failure rate for demo

  if (shouldFail && tool === 'slack_invite') {
    throw new Error('404 Channel Not Found: #general-test');
  }

  // Mock successful x_execution
  switch (tool) {
    case 'slack_invite':
      return {
        success: true,
        channel: config.channel || '#general',
        message: 'User invited to Slack',
      };

    case 'email_send':
      return {
        success: true,
        to: config.to || 'user@example.com',
        message_id: `msg_${Date.now()}`,
      };

    case 'http_request':
      return {
        success: true,
        status: 200,
        data: { message: 'Request completed' },
      };

    case 'delay_timer':
      const duration = config.duration || 1000;
      await sleep(duration);
      return { success: true, delayed: duration };

    default:
      return {
        success: true,
        message: `Executed ${tool}`,
      };
  }
}

/**
 * Helper: Create step x_execution record
 */
async function createStepExecution(
  executionId: string,
  step: WorkflowStep,
  stepIndex: number
): Promise<string> {
  const { data, error } = await supabase
    .from('step_executions')
    .insert({
      execution_id: executionId,
      step_id: step.id,
      step_index: stepIndex,
      step_type: step.type,
      tool_name: step.tool,
      status: 'running',
      input_data: step.config,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Helper: Update step x_execution
 */
async function updateStepExecution(
  stepExecutionId: string,
  updates: Partial<any>
): Promise<void> {
  const { error } = await supabase
    .from('step_executions')
    .update(updates)
    .eq('id', stepExecutionId);

  if (error) throw error;
}

/**
 * Helper: Update x_execution log
 */
async function updateExecutionLog(
  executionId: string,
  updates: Partial<any>
): Promise<void> {
  const { error } = await supabase
    .from('x_execution_logs')
    .update(updates)
    .eq('id', executionId);

  if (error) throw error;
}

/**
 * Helper: Log x_execution event
 */
async function logEvent(
  executionId: string,
  event: {
    event_type: string;
    step_id?: string;
    step_index?: number;
    message: string;
    metadata?: any;
    original_error?: string;
    fix_applied?: string;
    ai_reasoning?: string;
    retry_count?: number;
  }
): Promise<void> {
  const { error } = await supabase.from('execution_events').insert({
    execution_id: executionId,
    ...event,
  });

  if (error) {
    console.error('Failed to log event:', error);
  }
}

/**
 * Helper: Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
