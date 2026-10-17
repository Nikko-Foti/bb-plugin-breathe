import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
const duration = z.number().int().min(1).max(30);
const holdDuration = z.number().int().min(0).max(30);
const timing = z.object({ inhale: duration, hold: holdDuration, exhale: duration }).strict();
const settingsPatch = timing.extend({ enabled: z.boolean() }).partial().strict();
const allSettings = timing.extend({ enabled: z.boolean() }).strict();
export const rpcContract = defineRpcContract({
  saveSettings: { input: settingsPatch, output: allSettings },
  saveTiming: { input: timing, output: timing },
});
export default function breathe(bb: BbPluginApi) {
  const settings = bb.settings.define({
    enabled: { type: "boolean", label: "Show Breathe while agents work", default: true },
    inhale: { type: "number", label: "Breathe in (seconds)", default: 4, experimental_schema: duration },
    hold: { type: "number", label: "Hold (seconds, 0 to skip)", default: 7, experimental_schema: holdDuration },
    exhale: { type: "number", label: "Breathe out (seconds)", default: 8, experimental_schema: duration },
  });
  bb.rpc.register(rpcContract, {
    async saveSettings(input) {
      return allSettings.parse(await settings.experimental_set(input));
    },
    async saveTiming(input) {
      const saved = await settings.experimental_set(input);
      return { inhale: saved.inhale, hold: saved.hold, exhale: saved.exhale };
    },
  });
}
