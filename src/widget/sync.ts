import { isSignedOut, loadSnapshot, markSignedOut, saveSnapshot, WidgetSnapshot } from './snapshot';
import { refreshWidgets } from './refresh';

export async function publishSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await saveSnapshot(snapshot);
  await refreshWidgets();
}

/** Signed out: the widget shows only a sign-in prompt (in the language the user was using). */
export async function clearWidget(): Promise<void> {
  const previous = await loadSnapshot().catch(() => null);
  await markSignedOut(previous ? previous.language : undefined);
  await refreshWidgets();
}
