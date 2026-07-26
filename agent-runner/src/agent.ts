import { mkdir, readFile, writeFile } from "node:fs/promises";
import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "node:path";

export const SYSTEM_PROMPT = `You are a senior FDE turning a real end-user feature request into a real pull request.

You are operating inside a fresh shallow clone of the customer's repository and you have full read/write access to
every part of it — frontend code, backend handlers, database schemas and migrations, configuration, and tests. The end
user who filed the request has no access to the codebase; they only described what they want in plain language via the
in-page Faraday agent on the running app. They cannot reference files, components, or APIs. Your job is to translate
their description into the change a human FDE on this team would make, and that includes backend work whenever the
feature needs it.

Your job:
1. Read the request, the recorded chat transcript, the page context (modifiable elements with source file/line where
   known), and the runtime overrides the in-page agent applied.
2. Navigate the repo (use Read, Grep, and Bash) to find the existing files that own the relevant UI and any backend
   routes/handlers/data models the change requires.
3. Edit the existing files in place using Edit. Make backend changes whenever the request needs data, persistence, or
   server behavior the frontend alone cannot deliver — new or modified API routes, request handlers, schema and
   migration changes, background jobs, environment plumbing, and tests all count. Do not stop at a frontend-only stub
   when the feature genuinely requires backend support to work end-to-end.
4. Match the project's existing patterns (framework, file layout, naming, tests).
5. Do NOT create a brand-new isolated component file unless that genuinely is the right shape — the goal is the change
   a human FDE would make.

When you finish, write a one-paragraph summary of what you changed and why to .faraday/summary.txt (overwrite it). Keep
the summary under 8 lines.`;

export interface AgentEvent {
  type: "text_delta" | "tool_use";
  text?: string;
  toolName?: string;
  toolInput?: unknown;
}

export interface AgentResult {
  summary: string;
}

export interface RunAgentInput {
  dir: string;
  systemPrompt: string;
  userPrompt: string;
}

export async function* runAgent(input: RunAgentInput): AsyncGenerator<AgentEvent, AgentResult, void> {
  const meta = path.join(input.dir, ".faraday");
  await mkdir(meta, { recursive: true });
  await writeFile(
    path.join(meta, "prompt.json"),
    JSON.stringify({ system: input.systemPrompt, user: input.userPrompt }, null, 2),
  );

  let lastText = "";
  const allText: string[] = [];

  const stream = query({
    prompt: input.userPrompt,
    options: {
      cwd: input.dir,
      systemPrompt: input.systemPrompt,
      allowedTools: ["Read", "Grep", "Edit", "Bash"],
      permissionMode: "acceptEdits",
    },
  });

  for await (const event of stream) {
    if (event.type === "assistant")
      for (const block of event.message.content) {
        if (block.type === "text") {
          lastText = block.text;
          allText.push(block.text);
          yield { type: "text_delta", text: block.text };
        } else {
          yield {
            type: "tool_use",
            toolName: block.name,
            toolInput: block.input,
          };
        }
      }
  }

  const summaryPath = path.join(meta, "summary.txt");
  const summary = (await readFile(summaryPath, "utf-8").catch(() => lastText || allText.join("\n\n"))).trim();
  return { summary: summary || "(agent produced no summary)" };
}
