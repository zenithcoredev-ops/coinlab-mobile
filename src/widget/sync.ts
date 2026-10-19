import { clearSnapshot, saveSnapshot, WidgetSnapshot } from './snapshot';
import { refreshWidgets } from './refresh';

export async function publishSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await saveSnapshot(snapshot);
  await refreshWidgets();
}

/** Signed out: the widget goes back to its sign-in prompt. */
export async function clearWidget(): Promise<void> {
  await clearSnapshot();
  await refreshWidgets();
}
