// Inline brand and utility marks shared across the app components.
// Kept in one file because they're plain stateless SVGs with no logic
// — adding a dep on an icon library for four glyphs would be overkill.

export function GithubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M13.63 13.63h-2.36V9.94c0-.88-.02-2.01-1.22-2.01-1.23 0-1.42.96-1.42 1.95v3.75H6.27V6.02h2.26v1.04h.03c.32-.6 1.09-1.22 2.23-1.22 2.39 0 2.84 1.57 2.84 3.62v4.17ZM3.61 4.98a1.37 1.37 0 1 1 0-2.74 1.37 1.37 0 0 1 0 2.74Zm1.18 8.65H2.43V6.02h2.36v7.61ZM14.81.05H1.18C.55.05.05.54.05 1.15v13.7c0 .61.5 1.1 1.13 1.1h13.63c.63 0 1.14-.49 1.14-1.1V1.15c0-.61-.51-1.1-1.14-1.1Z"
      />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M2.25 3h11.5c.69 0 1.25.56 1.25 1.25v7.5c0 .69-.56 1.25-1.25 1.25H2.25C1.56 13 1 12.44 1 11.75v-7.5C1 3.56 1.56 3 2.25 3Zm0 1.16v.18L8 8.03l5.75-3.69v-.18H2.25Zm11.5 1.56-5.41 3.47a.62.62 0 0 1-.68 0L2.25 5.72v6.03h11.5V5.72Z"
      />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M9.25 2.5a.75.75 0 0 1 0-1.5h4.5c.41 0 .75.34.75.75v4.5a.75.75 0 0 1-1.5 0V3.56L7.53 9.03a.75.75 0 0 1-1.06-1.06L11.94 2.5H9.25ZM3 4.25C3 3.56 3.56 3 4.25 3H7a.75.75 0 0 1 0 1.5H4.5v7h7V9a.75.75 0 0 1 1.5 0v2.75c0 .69-.56 1.25-1.25 1.25h-7.5C3.56 13 3 12.44 3 11.75v-7.5Z"
      />
    </svg>
  );
}
