import { Fragment } from "react";
import type { ArchLayer } from "@/lib/case-studies";
import { StatusPill } from "@/components/StatusPill";
import { UI_COPY } from "@/lib/ui-copy";

// Vertical stack of glass-panel layers connected by an animated marching-ants
// SVG arrow. Status pills on each node reuse the project-card vocabulary so
// the design language carries across windows. Styles in case-study.css.
export function ArchitectureDiagram({ layers }: { layers: ArchLayer[] }) {
  return (
    <div
      className="arch-diagram"
      role="img"
      aria-label={UI_COPY.caseStudyDiagram.aria}
    >
      {layers.map((layer, i) => (
        <Fragment key={layer.id}>
          <section className="arch-layer">
            <header className="arch-layer-head">
              {layer.kicker && (
                <span className="arch-layer-kicker">{layer.kicker}</span>
              )}
              <h3 className="arch-layer-heading serif-i">{layer.heading}</h3>
            </header>
            <ul className="arch-layer-nodes">
              {layer.nodes.map((node) => (
                <li className="arch-node" key={node.id}>
                  <span className="arch-node-label">{node.label}</span>
                  {node.detail && (
                    <span className="arch-node-detail">{node.detail}</span>
                  )}
                  {node.status && <StatusPill status={node.status} />}
                </li>
              ))}
            </ul>
          </section>
          {i < layers.length - 1 && <ArchConnector />}
        </Fragment>
      ))}
    </div>
  );
}

// Animated downward arrow rendered between each pair of adjacent layers.
// Marching-ants stroke + soft accent glow signals "data flowing through".
function ArchConnector() {
  return (
    <svg
      className="arch-connector"
      viewBox="0 0 12 40"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <line className="arch-line" x1="6" y1="0" x2="6" y2="34" />
      <polyline className="arch-line-cap" points="2,32 6,40 10,32" />
    </svg>
  );
}
