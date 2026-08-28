import type { ProjectStatus } from "@/lib/elijah";

// Small status badge used by project cards, the architecture diagram, and
// anywhere else that needs to mark a subsystem live / in flight / planned.
// Styles live in web/src/app/styles/apps.css under .status-pill*.
export function StatusPill({ status }: { status: ProjectStatus }) {
  // "in flight" -> "in-flight" so the modifier class is a valid CSS identifier.
  const slug = status.replace(/\s+/g, "-");
  return (
    <span className={`status-pill status-pill--${slug}`}>
      <span className="status-pill-dot" aria-hidden="true" />
      {status}
    </span>
  );
}
