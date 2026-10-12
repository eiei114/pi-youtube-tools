import { createAssistantMessageEventStream, getCurrentTools } from "@earendil-works/pi-ai";
import "./offline-youtube-api.mjs";

const providerName = "pi-youtube-tools-smoke";
const requestCounts = new Map();
const zeroUsage = () => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
});

function messageText(message) {
  if (typeof message.content === "string") return message.content;
  return (message.content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function callsForCase(caseName) {
  if (caseName === "happy_path") {
    return [
      { name: "youtube_search", arguments: { query: "deterministic smoke", maxResults: 1 } },
      { name: "youtube_video_details", arguments: { videoId: "p1SmokeTest", includeDescription: true } },
      { name: "youtube_transcript", arguments: { videoId: "p1SmokeTest", lang: "en", format: "full_text" } },
    ];
  }
  if (caseName === "error_path") {
    return [{ name: "youtube_search", arguments: { query: "offline-error", maxResults: 1 } }];
  }
  if (caseName === "reload_cleanup") {
    return [{ name: "youtube_search", arguments: { query: "reload smoke", maxResults: 1 } }];
  }
  return [];
}

function responseStream(model, text, toolCalls) {
  const stream = createAssistantMessageEventStream();
  const message = {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: zeroUsage(),
    stopReason: toolCalls.length > 0 ? "toolUse" : "stop",
    timestamp: Date.now(),
  };

  stream.push({ type: "start", partial: message });
  for (const [index, call] of toolCalls.entries()) {
    const toolCall = {
      type: "toolCall",
      id: `smoke-${Date.now()}-${index}`,
      name: call.name,
      arguments: call.arguments,
    };
    message.content.push(toolCall);
    stream.push({ type: "toolcall_start", contentIndex: index, partial: message });
    stream.push({ type: "toolcall_end", contentIndex: index, toolCall, partial: message });
  }

  if (toolCalls.length === 0) {
    const textBlock = { type: "text", text: "" };
    const contentIndex = message.content.length;
    message.content.push(textBlock);
    const responseText = text;
    stream.push({ type: "text_start", contentIndex, partial: message });
    textBlock.text = responseText;
    stream.push({ type: "text_delta", contentIndex, delta: responseText, partial: message });
    stream.push({ type: "text_end", contentIndex, content: responseText, partial: message });
  }

  stream.push({
    type: "done",
    reason: message.stopReason,
    message,
  });
  stream.end();
  return stream;
}

export default function (pi) {
  pi.registerProvider(providerName, {
    name: "Pi YouTube Tools Offline Smoke",
    api: "openai-completions",
    baseUrl: "https://offline.invalid/v1",
    apiKey: "offline-smoke-only",
    models: [{
      id: "deterministic",
      name: "Deterministic offline smoke model",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 64000,
      maxTokens: 2048,
    }],
    streamSimple(model, context) {
      const prompt = context.messages
        .filter((message) => message.role === "user")
        .map(messageText)
        .join("\n");
      const caseName = prompt.match(/pi-youtube-tools-smoke:([a-z_]+)/)?.[1] ?? "unknown";
      const requestCount = (requestCounts.get(caseName) ?? 0) + 1;
      requestCounts.set(caseName, requestCount);
      const registeredTools = getCurrentTools(context.messages)
        .map((tool) => tool.name)
        .filter((name) => name.startsWith("youtube_"))
        .sort();
      const calls = requestCount === 1 ? callsForCase(caseName) : [];
      const text = JSON.stringify({ case: caseName, registeredTools });
      return responseStream(model, text, calls);
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    await ctx.ui.setStatus("pi-youtube-tools-smoke", "probe-ready");
  });
}
