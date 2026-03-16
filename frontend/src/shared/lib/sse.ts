export interface SSEHandlers<TStatus = unknown, TResult = unknown> {
  status?: (payload: TStatus) => void;
  result?: (payload: TResult) => void;
  done?: (payload: unknown) => void;
  error?: (payload: { detail?: string }) => void;
}

export async function streamSSE<TStatus = unknown, TResult = unknown>(
  input: RequestInfo | URL,
  init: RequestInit,
  handlers: SSEHandlers<TStatus, TResult> = {},
): Promise<void> {
  const response = await fetch(input, init);
  if (!response.ok || !response.body) {
    throw new Error(`SSE request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const eventMatch = chunk.match(/^event:\s*(.+)$/m);
      const dataMatch = chunk.match(/^data:\s*(.+)$/m);
      if (!eventMatch || !dataMatch) continue;

      const event = eventMatch[1].trim();
      const payload = JSON.parse(dataMatch[1]);

      if (event === "status") handlers.status?.(payload as TStatus);
      if (event === "result") handlers.result?.(payload as TResult);
      if (event === "done") handlers.done?.(payload);
      if (event === "error") handlers.error?.(payload);
    }
  }
}
