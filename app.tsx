import { useEffect, useState } from "react";
import { definePluginApp, useComposer, useSettings, useRealtimeConnectionState, experimental_useSidebarThreads } from "@get-bb/plugin-sdk/app";
import { Button } from "./components/ui/button";
import { Icon } from "./components/ui/icon";
import { BreatheWave } from "./components/breathe-wave";
import { SceneGlyph } from './components/scene-glyph';
import { BreatheSettings } from './components/breathe-settings';
import { shouldShowScene } from "./lib/visibility";
import { readBreatheSettings } from "./lib/settings";
import "./style.css";

export function BreatheBanner() {
  const composer = useComposer();
  const { values, isLoading } = useSettings();
  const { threads, status } = experimental_useSidebarThreads();
  const connection = useRealtimeConnectionState();
  const threadId = composer.scope.kind === "thread" ? composer.scope.threadId : null;
  const thread = threads.find(row => row.id === threadId);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { if (!composer.isRunning) setDismissed(false); }, [composer.isRunning]);
  useEffect(() => { setDismissed(false); }, [threadId]);
  const show = threadId !== null && composer.isRunning && shouldShowScene(
    thread, connection, status === "ready" && !isLoading, values?.enabled !== false,
  );
  if (!show || dismissed) return null;
  const settings = readBreatheSettings(values);
  return <div className="breathe-banner" role="region" aria-label="Breathe animation">
    <button type="button" className="breathe-scene-menu" aria-label="Breathe settings" onClick={() => composer.experimental_openPopup("settings")}>
      <SceneGlyph /><span>Breathe</span><Icon name="ChevronDown" />
    </button>
    <BreatheWave timing={settings} palette={settings.palette} />
    <div className="breathe-actions">
      <Button type="button" variant="ghost" size="icon" className="breathe-control text-muted-foreground"
        aria-label="Hide Breathe for this turn" onClick={() => setDismissed(true)}><Icon name="X" /></Button>
    </div>
  </div>;
}
function SettingsPopup() {
  const composer = useComposer();
  return <BreatheSettings onClose={() => composer.experimental_closePopup()} />;
}
export default definePluginApp(app => {
  app.composer.customize({
    id: "breathe", scopes: ["thread"],
    banners: [{ id: "scene", chrome: "bare", component: BreatheBanner }],
    experimental_popups: [{ id: "settings", label: "Breathe settings", component: SettingsPopup }],
    plusMenu: [{ id: "settings", label: "Breathe settings",
      run: ({ composer }) => { composer.experimental_openPopup("settings"); } }],
  });
  app.slots.settingsSection({ id: "preview", component: BreatheSettings });
});
