/** Server capture may replace the editor only before the teacher has typed in this session. */
export function shouldApplyServerSessionCapture(input: {
  dirty: boolean;
  requestedSessionId: string;
  activeSessionId: string;
}) {
  return !input.dirty && input.requestedSessionId === input.activeSessionId;
}
