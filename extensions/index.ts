import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isYoutubeConfigured } from "../lib/config.ts";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("youtube:status", {
    description: "Show YouTube API key configuration status without exposing secrets",
    handler: async (_args, ctx) => {
      const configured = isYoutubeConfigured();
      ctx.ui.notify(
        configured
          ? "YouTube API key configured via YOUTUBE_API_KEY."
          : "YouTube API key missing. Set YOUTUBE_API_KEY env var.",
        configured ? "info" : "warning",
      );
    },
  });
}
