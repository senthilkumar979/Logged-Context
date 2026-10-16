export interface LogContextActionParams<TState, TAction> {
  name: string;
  action: TAction;
  prevState: TState;
  nextState: TState;
}

export function logContextAction<TState, TAction>({
  name,
  action,
  prevState,
  nextState,
}: LogContextActionParams<TState, TAction>): void {
  if (!import.meta.env.DEV) return;

  const actionRecord =
    action !== null && typeof action === 'object'
      ? (action as Record<string, unknown>)
      : { value: action };

  console.groupCollapsed(
    `%c${name} %c${String(actionRecord.type ?? 'ACTION')}`,
    'color: #7c3aed; font-weight: bold;',
    'color: #0f766e; font-weight: bold;',
  );
  console.log('%caction', 'color: #2563eb; font-weight: bold;', action);
  console.log('%cprev state', 'color: #b45309; font-weight: bold;', prevState);
  console.log('%cnext state', 'color: #16a34a; font-weight: bold;', nextState);
  console.groupEnd();
}
