"use client";

import { ELIJAH } from "@/lib/elijah";
import { APPS } from "@/lib/apps";
import { openApp } from "@/lib/app-launcher";
import { UI_COPY } from "@/lib/ui-copy";
import { ProjectCard } from "./ProjectCard";

export function ProjectsApp() {
  const projects = ELIJAH.projects;

  return (
    <div className="projects-app">
      <header className="projects-header">
        <span className="app-kicker">{APPS.projects.title}</span>
        <h1 className="projects-title serif-i">{UI_COPY.projects.title}</h1>
        <p className="projects-subtitle">{ELIJAH.projectsSubtitle}</p>
      </header>

      <div className="project-cards">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            // Featured projects route to the case-study app on either shell.
            onOpenCase={project.featured ? () => openApp("case") : undefined}
          />
        ))}
      </div>
    </div>
  );
}
