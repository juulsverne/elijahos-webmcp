import Link from "next/link";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";

export default function NotFound() {
  return (
    <div className="error-screen">
      <div className="error-screen-panel">
        <div className="error-screen-kicker">{ELIJAH.osName}</div>
        <h1 className="error-screen-code">{UI_COPY.error.notFoundCode}</h1>
        <p className="error-screen-message">
          {UI_COPY.error.notFoundMessage}
        </p>
        <Link href="/" className="error-screen-action">
          {UI_COPY.error.backToOs(ELIJAH.osName)}
        </Link>
      </div>
    </div>
  );
}
