import { json } from "@sveltejs/kit";
import { ZodError } from "zod";
import { getRuntimeStatus, parseEnvironmentConfig, startHarborRun } from "$lib/server/harbor-demo";

export async function POST({ request }: { request: Request }) {
  const runtime = await getRuntimeStatus();
  if (!runtime.available) {
    return json(
      {
        message: "The local Harbor runtime is unavailable.",
        runtime,
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json().catch(() => undefined);
    const environment = parseEnvironmentConfig(body);
    return json(await startHarborRun(environment), { status: 202 });
  } catch (error) {
    if (error instanceof ZodError) {
      return json(
        {
          message: error.issues[0]?.message ?? "The environment definition is invalid.",
        },
        { status: 400 },
      );
    }
    throw error;
  }
}
