"use client";

import { fontVariableClassName } from "@/app/fonts";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={fontVariableClassName}>
      <body className="error-screen-body">
        <div className="error-screen">
          <div className="error-screen-panel">
            <div className="error-screen-kicker">{ELIJAH.osName}</div>
            <h1 className="error-screen-title">{UI_COPY.error.title}</h1>
            <p className="error-screen-message">
              {UI_COPY.error.message}
            </p>
            <button
              type="button"
              className="error-screen-action"
              onClick={() => reset()}
            >
              {UI_COPY.error.reboot}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
