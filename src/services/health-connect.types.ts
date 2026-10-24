/**
 * What the step counter can do on this device:
 * `unsupported` (iOS/web or an error), `not_installed` / `update_required` (Health Connect
 * app), `needs_permission` (installed, steps not yet allowed) or `ready`.
 */
export type StepsAvailability = 'unsupported' | 'not_installed' | 'update_required' | 'needs_permission' | 'ready';
