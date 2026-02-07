import { NextRequest, NextResponse } from 'next/server';
import { N8nWorkflow } from '@/lib/n8n-utils';

// Get n8n instance URL and credentials from environment
const N8N_URL = process.env.N8N_URL || 'https://n8n.srv1344756.hstgr.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY;

interface DeployRequest {
  workflow: N8nWorkflow;
  googleAccessToken?: string;
  googleRefreshToken?: string;
}

/**
 * Deploy a workflow to n8n instance
 * Handles:
 * 1. Creating Google OAuth credentials (if tokens provided)
 * 2. Updating workflow with credential IDs
 * 3. Deploying the workflow JSON to n8n
 * 4. Activating the workflow
 */
export async function POST(request: NextRequest) {
  try {
    if (!N8N_API_KEY) {
      return NextResponse.json(
        { error: 'N8N_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body: DeployRequest = await request.json();
    const { workflow, googleAccessToken, googleRefreshToken } = body;

    if (!workflow || !workflow.nodes || !workflow.connections) {
      return NextResponse.json(
        { error: 'Invalid workflow structure' },
        { status: 400 }
      );
    }

    // Step 1: Create Google credentials if tokens are provided
    let googleCredentialId: string | null = null;
    if (googleAccessToken && googleRefreshToken) {
      try {
        const credentialResponse = await fetch(
          `${N8N_URL}/api/v1/credentials`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': N8N_API_KEY,
            },
            body: JSON.stringify({
              name: `Google OAuth - ${workflow.name}`,
              type: 'googleOAuth2Api',
              data: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                accessToken: googleAccessToken,
                refreshToken: googleRefreshToken,
              },
            }),
          }
        );

        if (credentialResponse.ok) {
          const credential = await credentialResponse.json();
          googleCredentialId = credential.id;
        }
      } catch (error) {
        console.error('Failed to create Google credentials:', error);
        // Continue without credentials - workflow can still be deployed
      }
    }

    // Step 2: Update workflow nodes with credential ID if created
    const updatedWorkflow = { ...workflow };
    if (googleCredentialId) {
      updatedWorkflow.nodes = updatedWorkflow.nodes.map((node) => {
        if (
          node.type.includes('gmail') ||
          node.type.includes('googleDrive') ||
          node.type.includes('googleCalendar')
        ) {
          return {
            ...node,
            credentials: {
              ...node.credentials,
              googleOAuth2Api: {
                id: googleCredentialId,
                name: `Google OAuth - ${workflow.name}`,
              },
            },
          };
        }
        return node;
      });
    }

    // Step 3: Deploy workflow to n8n
    const deployResponse = await fetch(
      `${N8N_URL}/api/v1/workflows`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY,
        },
        body: JSON.stringify(updatedWorkflow),
      }
    );

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      console.error('N8n deployment failed:', error);
      return NextResponse.json(
        { error: 'Failed to deploy workflow to n8n', details: error },
        { status: deployResponse.status }
      );
    }

    const deployedWorkflow = await deployResponse.json();
    const workflowId = deployedWorkflow.id;

    // Step 4: Activate the workflow
    try {
      await fetch(
        `${N8N_URL}/api/v1/workflows/${workflowId}/activate`,
        {
          method: 'PATCH',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
          },
        }
      );
    } catch (error) {
      console.error('Failed to activate workflow:', error);
      // Don't fail deployment if activation fails
    }

    return NextResponse.json({
      success: true,
      workflowId,
      n8nUrl: `${N8N_URL}/workflow/${workflowId}`,
    });

  } catch (error) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
