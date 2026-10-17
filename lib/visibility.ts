export function shouldShowScene(thread: {
  status: string; runtimeStatus: string; hasPendingInteraction: boolean;
} | undefined, connection: string, ready: boolean, enabled: boolean): boolean {
  return enabled && ready && connection === "connected" && thread?.status === "active"
    && thread.runtimeStatus === "active" && !thread.hasPendingInteraction;
}
