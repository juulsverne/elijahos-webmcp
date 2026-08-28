"use client";

import type { Project } from "@/lib/elijah";
import { StatusPill } from "@/components/StatusPill";
import { UI_COPY } from "@/lib/ui-copy";
import { ensureHttps } from "./contact-helpers";
import { GithubIcon } from "./icons";

type ProjectCardProps = {
  project: Project;
  onOpenCase?: () => void;
};

export function ProjectCard({ project, onOpenCase }: ProjectCardProps) {
  // Default accent so the left-edge stripe + glyph color always render.
  const accent = project.accent ?? "blue";
  const hasActions =
    !!onOpenCase || !!project.links?.repo || !!project.links?.demo;

  return (
    <article
      className={`project-card accent-${accent}`}
      id={`project-${project.id}`}
    >
      <div className="project-card-head">
        {project.glyph && (
          <span className="project-card-glyph" aria-hidden="true">
            {project.glyph}
          </span>
        )}
        <h2 className="project-card-name serif-i">{project.name}</h2>
        {project.status && <StatusPill status={project.status} />}
      </div>
      <div className="project-card-kicker">
        <span>{project.kind}</span>
        <span>{project.year}</span>
      </div>
      <p className="project-card-desc">{project.desc}</p>
      {project.stack.length > 0 && (
        <div className="app-stack">
          {project.stack.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
      {hasActions && (
        <div className="project-card-actions">
          {onOpenCase && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenCase}
            >
              {UI_COPY.projects.openCase}
            </button>
          )}
          {project.links?.repo && (
            <a
              className="btn btn-ghost"
              href={ensureHttps(project.links.repo)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.name} on GitHub`}
              title={`${project.name} on GitHub`}
            >
              <GithubIcon />
              {UI_COPY.projects.github}
            </a>
          )}
          {project.links?.demo && (
            <a
              className="btn btn-ghost"
              href={ensureHttps(project.links.demo)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {UI_COPY.projects.liveDemo}
            </a>
          )}
        </div>
      )}
    </article>
  );
}
