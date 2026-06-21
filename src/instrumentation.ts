// Auto-capture server errors (render, route handlers, server actions) into the
// EventLog so bugs can be traced from the admin Logs page.

type ErrorRequest = { path?: string; method?: string };
type ErrorContext = { routerKind?: string; routePath?: string; routeType?: string };

export async function onRequestError(
  err: unknown,
  request: ErrorRequest,
  context: ErrorContext,
): Promise<void> {
  // Prisma only runs on the Node runtime — skip edge/proxy errors.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { logEvent } = await import("@/lib/data/logs");
    const e = err as { name?: string; message?: string; stack?: string };
    await logEvent({
      level: "error",
      actor: "system",
      action: "server.error",
      message: e?.message
        ? `${e.name ?? "Error"}: ${e.message}`
        : "Unhandled server error",
      meta: {
        stack: e?.stack?.slice(0, 3000),
        method: request?.method,
        routeType: context?.routeType,
        routePath: context?.routePath,
      },
      path: request?.path ?? context?.routePath ?? "",
    });
  } catch {
    // Never let error logging throw.
  }
}
