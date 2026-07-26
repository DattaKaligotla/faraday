import { AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "$env/static/private";
import { getTokenProvider } from "@aws/bedrock-token-generator";

// Single provider instance — the underlying AWS credential chain is resolved
// lazily and the provider itself is safe to reuse across calls. Tokens it
// returns are short-lived (≈12h max), so callers should mint fresh ones per
// outbound flow rather than caching the string.
const provideToken = getTokenProvider({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
  region: AWS_REGION,
});

/**
 * Mint a short-term Bedrock API bearer token from the host's static AWS
 * credentials (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in env). Throws with
 * a clear message if the credential chain cannot resolve.
 */
export async function mintBedrockToken(): Promise<string> {
  try {
    return await provideToken();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to mint Bedrock API token — check AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY on the webapp env. Underlying: ${msg}`,
    );
  }
}
