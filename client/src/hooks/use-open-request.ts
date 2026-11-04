import { useEffect } from "react";

/**
 * Lets a parent (for example a dashboard Quick Action) ask a section to open its
 * "Add" dialog. The request is acted on once and then acknowledged, so the dialog
 * does not reopen the next time the section is shown.
 */
export function useOpenRequest(
  requested: boolean | undefined,
  open: () => void,
  onHandled?: () => void,
) {
  useEffect(() => {
    if (!requested) return;
    open();
    onHandled?.();
    // Keyed on the request only; `open` and `onHandled` are fresh closures every render.
  }, [requested]);
}
