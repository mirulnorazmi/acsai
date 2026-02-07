"use client"

import { useState, useCallback } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  addEdge,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NextSidebar } from "@/components/layout/NextSidebar"

// --- Types ---

interface GenerateApiResponse {
  workflow_id: string
  name: string
  steps: Array<{
    id: string
    action: string
    name: string
    params: Record<string, unknown>
  }>
}

type CustomNodeData = {
  label: string
  actionType: string
  status?: "pending" | "success" | "error"
}

// --- Component ---

export default function BuilderPage() {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    setIsLoading(true)
    try {
      // Get token from localStorage
      const token = localStorage.getItem("auth_token")

      // Call Backend API
      const response = await fetch("/api/orchestrator/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate workflow")
      }

      const data: GenerateApiResponse = await response.json()

      // Transform Response to Nodes & Edges
      const newNodes: Node<CustomNodeData>[] = data.steps.map((step, index) => ({
        id: step.id,
        type: "default", // Using default node type for simplicity as requested, but populated with data
        position: { x: 250, y: index * 100 + 50 }, // Vertical layout spacing
        data: {
          label: step.name,
          actionType: step.action,
          status: "pending",
        },
      }))

      const newEdges: Edge[] = []
      // Create connections between sequential steps
      for (let i = 0; i < data.steps.length - 1; i++) {
        const current = data.steps[i]
        const next = data.steps[i + 1]
        newEdges.push({
          id: `e-${current.id}-${next.id}`,
          source: current.id,
          target: next.id,
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        })
      }

      setNodes(newNodes)
      setEdges(newEdges)
      toast.success(`Generated workflow: ${data.name}`)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <NextSidebar />

      <main className="ml-64 flex flex-col h-screen overflow-hidden relative">
        {/* Header Section */}
        <header className="flex-none p-6 border-b border-border/50 bg-background/50 backdrop-blur-md z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI Workflow Builder</h1>
              <p className="text-muted-foreground">
                Describe your process and let AI build the workflow for you.
              </p>
            </div>
          </div>

          <div className="flex gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Input
                placeholder="e.g. Onboard a new employee when they are added to Slack..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    handleGenerate()
                  }
                }}
                className="pl-4 pr-12 h-12 text-base shadow-sm"
              />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              size="lg"
              className="h-12 px-8 font-semibold shadow-glow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Canvas Section */}
        <div className="flex-1 relative bg-card/20 w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg font-medium animate-pulse text-muted-foreground">
                  Constructing workflow logic...
                </p>
              </div>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-background/50"
            minZoom={0.1}
            maxZoom={1.5}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
              style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
            }}
          >
            <Background color="hsl(var(--muted-foreground))" gap={16} size={1} className="opacity-10" />
            <Controls className="bg-card border-border text-foreground fill-foreground" />
            <MiniMap
              className="bg-card border-border"
              maskColor="hsl(var(--background) / 0.8)"
              nodeColor={(n) => {
                if (n.type === 'input') return 'hsl(var(--primary))';
                return 'hsl(var(--card))';
              }}
            />

            {nodes.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-2 max-w-sm px-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">Ready to build</h3>
                  <p className="text-muted-foreground">
                    Enter a prompt above to generate your first workflow efficiently.
                  </p>
                </div>
              </div>
            )}
          </ReactFlow>
        </div>
      </main>
    </div>
  )
}
