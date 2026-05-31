import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { formatGreeting } from "../lib/greeting.ts";
import { StringEnum } from "../lib/schema.ts";

const greetParameters = Type.Object({
  name: Type.String({ description: "Name to greet" }),
  mode: StringEnum(["short", "friendly"], {
    description: "Greeting style. Prefer short unless the user asks for more warmth.",
  }),
});

export default function (pi: ExtensionAPI) {
  pi.registerCommand("template-info", {
    description: "Show TypeScript template information",
    handler: async (_args, ctx) => {
      ctx.ui.notify("TypeScript-first Pi package template loaded.", "info");
    },
  });

  pi.registerTool({
    name: "template_greet",
    label: "Template Greet",
    description: "Return a typed greeting from the Pi package template",
    promptSnippet: "template_greet: return a typed greeting from the template package",
    promptGuidelines: [
      "Use template_greet only when testing this template package or greeting the user.",
    ],
    parameters: greetParameters,
    async execute(_toolCallId, params) {
      const message = formatGreeting(params);

      return {
        content: [{ type: "text", text: message }],
        details: { message, mode: params.mode },
      };
    },
  });
}