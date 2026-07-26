import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import { error } from "@sveltejs/kit";
import { env as dynamicEnv } from "$env/dynamic/private";
import type { AgentRequest } from "./models";
import { mintBedrockToken } from "./bedrock-token";

export const BEDROCK_MODEL = dynamicEnv.BEDROCK_MODEL || "us.anthropic.claude-sonnet-4-5-20250929-v1:0";
const AWS_REGION = dynamicEnv.AWS_REGION || "us-east-1";

/**
 * Build a Bedrock client backed by a short-term API token minted from the
 * webapp's static AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. Tokens expire, so
 * we build per call rather than memoizing — `mintBedrockToken` reuses one
 * provider under the hood, so this is cheap.
 */
export async function getBedrock(): Promise<AnthropicBedrock> {
  let token: string;
  try {
    token = await mintBedrockToken();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw error(500, msg);
  }
  return new AnthropicBedrock({ awsRegion: AWS_REGION, apiKey: token });
}

export interface StreamCapture {
  text: string;
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  error?: string;
}

const STRICT_DIRECTIVE =
  "\n\nIMPORTANT: To make any change, you MUST call one of the provided tools. " +
  "Never claim you have made a change in plain text without an accompanying tool call. " +
  "If a request cannot be expressed with the available tools, say so explicitly.";

/**
 * Stream Anthropic Bedrock responses as the package's NDJSON protocol.
 * Yields encoded `Uint8Array` lines: text_delta, tool_use, done, error.
 */
export async function* streamAgent(req: AgentRequest, captured?: StreamCapture): AsyncGenerator<Uint8Array> {
  const enc = new TextEncoder();
  const line = (event: Record<string, unknown>) => enc.encode(JSON.stringify(event) + "\n");

  try {
    const client = await getBedrock();
    // Cast through unknown — the package sends Anthropic-shaped tools/messages, but
    // the SDK's discriminated unions don't accept generic Record types directly.
    const params = {
      model: BEDROCK_MODEL,
      max_tokens: 16384,
      system: (req.system || "") + STRICT_DIRECTIVE,
      messages: req.messages,
      ...(req.tools && req.tools.length ? { tools: req.tools } : {}),
    } as unknown as Parameters<typeof client.messages.stream>[0];

    const stream = client.messages.stream(params);
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const delta = event.delta.text;
        if (captured) captured.text += delta;
        yield line({ type: "text_delta", delta });
      }
    }

    const final = await stream.finalMessage();
    for (const block of final.content) {
      if (block.type === "tool_use") {
        if (captured) {
          captured.toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
        // `id` is the Anthropic block id — round-trips back as the matching
        // `tool_result.tool_use_id` when the client sends results in the next
        // turn. Bedrock requires strict 1:1 pairing, so dropping this would
        // break the multi-turn loop.
        yield line({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }
    yield line({ type: "done" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (captured) captured.error = msg;
    yield line({ type: "error", message: msg });
  }
}

export async function generateCodegen(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = await getBedrock();
  const msg = await client.messages.create({
    model: BEDROCK_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  let text = "";
  for (const block of msg.content) {
    if (block.type === "text") text += block.text;
  }
  return text;
}
