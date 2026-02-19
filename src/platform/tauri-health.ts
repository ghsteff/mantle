import { invokeTauriCommand } from "./runtime-command-result";

export async function runTauriHealthCheck() {
  const result = await invokeTauriCommand("healthCheck");
  if (!result.success) {
    return null;
  }

  return result.data;
}
