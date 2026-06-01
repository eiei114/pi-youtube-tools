import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { authStatusText, clearStoredApiKey, saveStoredApiKey } from "../lib/config.ts";
import { registerYoutubeTools } from "./youtube-tools.ts";

export default function (pi: ExtensionAPI) {
  registerYoutubeTools(pi);

  pi.registerCommand("youtube:status", {
    description: "Show YouTube API key configuration status without exposing secrets",
    handler: async (_args, ctx) => {
      const text = authStatusText();
      const configured = !text.includes("missing");
      ctx.ui.notify(text, configured ? "info" : "warning");
    },
  });

  pi.registerCommand("youtube:login", {
    description: "Enter and store YouTube Data API key via Pi UI",
    handler: async (_args, ctx) => {
      const entered = await ctx.ui.input("YouTube Data API key:", "paste API key here");
      const apiKey = String(entered ?? "").trim();
      if (!apiKey) {
        ctx.ui.notify("API key was not saved.", "warning");
        return;
      }

      saveStoredApiKey(apiKey);
      ctx.ui.notify(
        "Saved YouTube API key for pi-youtube-tools. The key was handled by the extension UI and not sent to the model.",
        "info",
      );
    },
  });

  pi.registerCommand("youtube:logout", {
    description: "Remove stored YouTube API key from pi-youtube-tools auth file",
    handler: async (_args, ctx) => {
      clearStoredApiKey();
      ctx.ui.notify(
        "Removed stored pi-youtube-tools API key. YOUTUBE_API_KEY environment variable is unchanged.",
        "info",
      );
    },
  });
}
