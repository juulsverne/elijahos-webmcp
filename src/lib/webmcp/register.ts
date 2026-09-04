// Registration glue: wires the pure tool definitions into the browser's
// ModelContext container, wrapping every execute with input validation,
// structured errors, and the visible activity log.
//
// Idempotent: React strict-mode double-mounts and shell swaps call this
// repeatedly; tools register once per page load.

import { useToolActivityStore } from "@/lib/webmcp/activity";
import { findModelContext } from "@/lib/webmcp/model-context";
import { validateInput } from "@/lib/webmcp/schema";
import { WEBMCP_TOOLS, type ToolDef } from "@/lib/webmcp/tools";

export type RegisterResult = {
  supported: boolean;
  registered: string[];
};

// Executes a tool the way the browser would: validate against the declared
// schema, run the handler, and log to the visible activity feed. Exported so
// evals can drive the exact same path without a WebMCP-enabled browser.
export function executeTool(tool: ToolDef, input: unknown): object {
  const activity = useToolActivityStore.getState();
  const validated = validateInput(tool.inputSchema, input);
  if (!validated.ok) {
    activity.log(tool.name, false, `rejected invalid input`);
    return { error: "invalid input", details: validated.errors };
  }
  try {
    const output = tool.handler(validated.value);
    const failed = "error" in (output as Record<string, unknown>);
    activity.log(tool.name, !failed, tool.summarize(validated.value));
    return output;
  } catch (err) {
    activity.log(tool.name, false, "tool execution failed");
    return {
      error: "tool execution failed",
      details: [err instanceof Error ? err.message : String(err)],
    };
  }
}

let registeredOnce: RegisterResult | null = null;

export function registerWebMCPTools(): RegisterResult {
  if (registeredOnce) return registeredOnce;

  const context = findModelContext();
  const activity = useToolActivityStore.getState();
  if (!context) {
    // Normal case: no WebMCP host. The OS works identically without it.
    // Deliberately not latched — a polyfill extension can inject its host
    // after hydration, and a later re-probe should still register.
    activity.setRegistration(false, false);
    return { supported: false, registered: [] };
  }

  const registered: string[] = [];
  for (const tool of WEBMCP_TOOLS) {
    try {
      context.registerTool({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          readOnlyHint: tool.readOnly,
          untrustedContentHint: tool.untrustedContent ?? false,
        },
        execute: async (input: unknown) => executeTool(tool, input),
      });
      registered.push(tool.name);
    } catch {
      // A host rejecting one tool must not take down the rest.
    }
  }

  activity.setRegistration(true, registered.length > 0);
  registeredOnce = { supported: true, registered };
  return registeredOnce;
}

// Test hook: lets node tests re-run registration against a fresh fake host.
export function __resetRegistrationForTests(): void {
  registeredOnce = null;
}
