import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("template", "Pi template loaded");
  });

  pi.registerCommand("template-hello", {
    description: "Show a hello message from this Pi package template",
    handler: async (args, ctx) => {
      const name = args.trim() || "Pi";
      ctx.ui.notify(`Hello, ${name}!`, "info");
    },
  });
}