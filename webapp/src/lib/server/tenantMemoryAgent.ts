import { getBedrock, BEDROCK_MODEL } from "./anthropic";

/**
 * One turn of conversation for the tenant-memory generation agent.
 *
 * The endpoint is stateless: each POST replays the full message history. The
 * dashboard appends the user's reply (or initial seed) and re-posts; this
 * function streams the next assistant turn until the model either emits its
 * final markdown as text or calls `ask_user`, which yields a tool_use event
 * and ends the turn so the dashboard can render the question.
 */

export interface AskUserInput {
  question: string;
}

export interface TenantMemorySeed {
  tenantName?: string;
  website?: string;
  productDescription?: string;
}

export const TENANT_MEMORY_SYSTEM = `You are a research analyst helping a software customer build a "tenant memory" brief about one of their end-user organizations. The brief is read by an AI agent that makes UI changes for that tenant's users, so it should be concise, factual, and oriented toward decisions an FDE would make: who the tenant is, what industry and scale, what terminology and workflows their users care about, what UX pain points are likely, and what tone fits.

You will be given seed fields from the customer (the tenant's name, website, and a one-line description of what the customer's product does for that tenant). Use what you know about the tenant from public information to write a markdown brief.

Rules:
- If the seed information is ambiguous, conflicts with what you know, or you genuinely cannot identify the tenant, call the \`ask_user\` tool with a SINGLE focused question. Do not guess. Do not hedge by inventing details.
- If you are confident, produce the brief as your final assistant message in markdown. No preamble, no closing remarks — just the brief itself starting with a top-level heading.
- Keep the brief under 400 words. Use short sections with headings (e.g. "## Industry", "## Users", "## Terminology", "## Likely UX priorities").
- Do not include the seed fields verbatim — synthesize.`;

export const ASK_USER_TOOL = {
  name: "ask_user",
  description:
    "Ask the customer a single clarifying question when seed information is ambiguous, conflicting, or insufficient to identify the tenant. Use sparingly — only when guessing would produce a misleading brief.",
  input_schema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "A single, focused question for the customer. Plain text, one sentence.",
      },
    },
    required: ["question"],
  },
} as const;

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: unknown;
}

export interface GenerateInput {
  messages: AnthropicMessage[];
}

/**
 * Format the seed fields into the first user message so the dashboard doesn't
 * have to know the exact prompt template. Returns the augmented message array
 * with the seed block prepended (only if no user message exists yet — on
 * follow-up turns the dashboard's stored history takes over).
 */
export function buildInitialUserMessage(
  seed: TenantMemorySeed,
  orgId: string,
  orgName: string | null,
): AnthropicMessage {
  const lines = [
    `Generate a tenant memory for the org "${orgName ?? orgId}" (orgId: ${orgId}).`,
    "",
    "Seed fields from the customer:",
    `- Tenant name: ${seed.tenantName?.trim() || "(not provided)"}`,
    `- Website: ${seed.website?.trim() || "(not provided)"}`,
    `- What we sell them: ${seed.productDescription?.trim() || "(not provided)"}`,
  ];
  return { role: "user", content: lines.join("\n") };
}

/**
 * Stream one assistant turn as NDJSON events. Mirrors the protocol used by
 * `streamAgent` in `./anthropic.ts` (text_delta / tool_use / done / error)
 * so the dashboard can use the same line-based parser.
 */
export async function* streamTenantMemoryAgent(input: GenerateInput): AsyncGenerator<Uint8Array> {
  const enc = new TextEncoder();
  const line = (event: Record<string, unknown>) => enc.encode(JSON.stringify(event) + "\n");

  try {
    const client = await getBedrock();
    const params = {
      model: BEDROCK_MODEL,
      max_tokens: 2048,
      system: TENANT_MEMORY_SYSTEM,
      messages: input.messages,
      tools: [ASK_USER_TOOL],
    } as unknown as Parameters<typeof client.messages.stream>[0];

    const stream = client.messages.stream(params);
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield line({ type: "text_delta", delta: event.delta.text });
      }
    }

    const final = await stream.finalMessage();
    for (const block of final.content) {
      if (block.type === "tool_use") {
        // Round-trip the block id back to the client so it can pair the matching
        // tool_result on the next turn (Bedrock requires strict 1:1 pairing).
        yield line({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }
    yield line({ type: "done", stopReason: final.stop_reason ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    yield line({ type: "error", message: msg });
  }
}
