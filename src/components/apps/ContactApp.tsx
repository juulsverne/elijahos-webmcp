"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ELIJAH, type Contact, type ProjectAccent } from "@/lib/elijah";
import { APPS } from "@/lib/apps";
import { UI_COPY } from "@/lib/ui-copy";
import { contactEmail, ensureHttps, mailtoFor } from "./contact-helpers";
import { ExternalIcon, GithubIcon, LinkedInIcon, MailIcon } from "./icons";

type ContactChannel = {
  label: string;
  value: string;
  href: string;
  accent: Exclude<ProjectAccent, "gold">;
  icon: "github" | "linkedin";
  external?: boolean;
};

const CONTACT_ICONS: Record<ContactChannel["icon"], () => ReactNode> = {
  github: GithubIcon,
  linkedin: LinkedInIcon,
};

function ContactLink({ label, value, href, accent, icon, external }: ContactChannel) {
  const Icon = CONTACT_ICONS[icon];

  return (
    <a
      className={`contact-row accent-${accent}`}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      <span className="contact-row-icon">
        <Icon />
      </span>
      <span className="contact-row-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
      {external && (
        <span className="contact-row-external">
          <ExternalIcon />
        </span>
      )}
    </a>
  );
}

function EmailContactButton({
  copied,
  onCopy,
}: {
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      className="contact-row accent-pink"
      onClick={onCopy}
      aria-label={UI_COPY.contact.email.ariaCopy}
    >
      <span className="contact-row-icon">
        <MailIcon />
      </span>
      <span className="contact-row-copy">
        <span>{UI_COPY.contact.email.label}</span>
        <strong>
          {copied
            ? UI_COPY.contact.email.copied
            : UI_COPY.contact.email.copyAddress}
        </strong>
      </span>
      <span className="contact-row-action">
        {copied ? UI_COPY.contact.email.ready : UI_COPY.contact.email.copy}
      </span>
    </button>
  );
}

function contactLinks(contact: Contact): ContactChannel[] {
  return [
    {
      label: "github",
      value: contact.github.replace(/^https?:\/\//, ""),
      href: ensureHttps(contact.github),
      accent: "blue",
      icon: "github",
      external: true,
    },
    {
      label: "linkedin",
      value: contact.linkedin.replace(/^https?:\/\//, ""),
      href: ensureHttps(contact.linkedin),
      accent: "violet",
      icon: "linkedin",
      external: true,
    },
  ];
}

export function ContactApp() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const mailtoHref = useMemo(() => {
    return mailtoFor(ELIJAH.contact, subject, message);
  }, [subject, message]);

  const copyEmail = async () => {
    const email = contactEmail(ELIJAH.contact);

    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const field = document.createElement("textarea");
      field.value = email;
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.focus();
      field.select();
      document.execCommand("copy");
      field.remove();
    }

    setCopiedEmail(true);
    window.setTimeout(() => setCopiedEmail(false), 1800);
  };

  return (
    <div className="contact-app">
      <header className="contact-header">
        <span className="app-kicker">{APPS.contact.title}</span>
        <h1 className="contact-title serif-i">{ELIJAH.contactTitle}</h1>
        <p className="contact-subtitle">{ELIJAH.contactSubtitle}</p>
      </header>

      <div className="contact-list">
        <EmailContactButton copied={copiedEmail} onCopy={copyEmail} />
        {contactLinks(ELIJAH.contact).map((link) => (
          <ContactLink key={link.label} {...link} />
        ))}
      </div>

      <form
        className="contact-compose"
        onSubmit={(event) => {
          event.preventDefault();
          window.location.href = mailtoHref;
        }}
      >
        <div className="contact-compose-head">
          <h2>{UI_COPY.contact.compose.title}</h2>
          <span>{UI_COPY.contact.compose.mode}</span>
        </div>
        <label className="contact-field">
          <span>{UI_COPY.contact.compose.subject}</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={UI_COPY.contact.compose.subjectPlaceholder}
          />
        </label>
        <label className="contact-field">
          <span>{UI_COPY.contact.compose.message}</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={UI_COPY.contact.compose.messagePlaceholder(
              ELIJAH.firstName,
            )}
            rows={4}
          />
        </label>
        <div className="contact-compose-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              window.location.href = mailtoFor(ELIJAH.contact);
            }}
          >
            {UI_COPY.contact.compose.openEmail}
          </button>
          <button type="submit" className="btn btn-primary">
            {UI_COPY.contact.compose.send}
          </button>
        </div>
      </form>
    </div>
  );
}
