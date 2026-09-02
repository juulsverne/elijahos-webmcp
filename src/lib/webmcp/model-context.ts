// Minimal typings + feature detection for the WebMCP ModelContext API.
//
// WebMCP is progressive enhancement (AGENTS.md): the OS must work identically
// when the API is absent. This module is the only place that touches the
// browser global, so the rest of the adapter stays testable in Node.
//
// Shape follows the Web Machine Learning CG spec (ModelContextTool /
// ToolAnnotations / ToolExecuteCallback). Hosts differ on where the container
// lives: Chrome's origin trial exposes `navigator.modelContext`, the ChatGPT
// in-app browser documents `document.modelContext` — probe both.

export type WebMCPToolAnnotations = {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
};

export type WebMCPExecuteOptions = {
  signal?: AbortSignal;
};

export type WebMCPTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: object;
  annotations?: WebMCPToolAnnotations;
  execute: (input: unknown, options?: WebMCPExecuteOptions) => Promise<unknown>;
};

export type ModelContextLike = {
  registerTool: (tool: WebMCPTool) => unknown;
  provideContext?: (context: { tools: WebMCPTool[] }) => unknown;
};

function asModelContext(candidate: unknown): ModelContextLike | null {
  if (
    candidate &&
    typeof (candidate as ModelContextLike).registerTool === "function"
  ) {
    return candidate as ModelContextLike;
  }
  return null;
}

// Returns the live ModelContext container, or null when the visitor's
// browser/agent doesn't support WebMCP (the normal, fully-supported case).
export function findModelContext(): ModelContextLike | null {
  if (typeof window === "undefined") return null;
  const nav = window.navigator as Navigator & { modelContext?: unknown };
  const doc = window.document as Document & { modelContext?: unknown };
  return asModelContext(nav.modelContext) ?? asModelContext(doc.modelContext);
}
