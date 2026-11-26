import type { ReactNode } from "react";
import type { FailureExplanation as Explanation } from "../lib/runFailureExplanation";

/** Two plain lines, then the untouched original error behind a closed Details toggle. */
export function FailureExplanation({ explanation, details, children }: {
  explanation: Explanation; details?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm" data-testid="failure-explanation">
      <p><span className="font-medium">What happened:</span> {explanation.whatHappened}</p>
      <p><span className="font-medium">What you can do:</span> {explanation.whatToDo}</p>
      {children}
      {details ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Details</summary>
          <div className="mt-1 select-text">{details}</div>
        </details>
      ) : null}
    </div>
  );
}
