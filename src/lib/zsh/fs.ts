// In-memory fake filesystem for the /zsh terminal.
//
// Plain JS object tree. Files are either:
//   - static string content
//   - a function `() => string` for content that depends on session state
//   - perm: "denied" — listed by `ls -la` (with permission bits) but reading
//     the path returns "Permission denied"
//
// The tree is intentionally small (~22 nodes). Don't grow it without a
// reason — every node is a thing the player might `cat` and we don't want
// to scatter clue-shaped lines that aren't actually clues.

import { ELIJAH } from "@/lib/elijah";

export type FsFile = {
  kind: "file";
  // String for static content; function for content that needs to read state
  // (e.g. /etc/motd flips wording after unlock).
  content: string | (() => string);
  // "denied" means cat / cd / ls of THIS path returns Permission denied,
  // but the entry itself is visible in `ls -la` of the parent directory.
  perm?: "denied";
  // Permission string shown in `ls -la` output. Defaults vary by perm.
  mode?: string;
  // Owner / group strings shown in `ls -la`. Defaults: guest guest, except
  // for /root and /etc/shadow which read root root.
  owner?: string;
  group?: string;
  // Visible byte size in `ls -la`. Computed on the fly if omitted.
  size?: number;
};

export type FsDir = {
  kind: "dir";
  children: Record<string, FsNode>;
  perm?: "denied";
  mode?: string;
  owner?: string;
  group?: string;
};

export type FsNode = FsFile | FsDir;

// Path utilities — minimal POSIX-ish.

export function normalizePath(cwd: string, raw: string): string {
  let p = raw;
  if (p === "" || p === ".") p = cwd;
  if (p === "~") p = "/home/guest";
  if (p.startsWith("~/")) p = "/home/guest/" + p.slice(2);
  if (!p.startsWith("/")) p = (cwd === "/" ? "" : cwd) + "/" + p;

  const parts: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return "/" + parts.join("/");
}

export function dirname(path: string): string {
  if (path === "/" || path === "") return "/";
  const i = path.lastIndexOf("/");
  if (i <= 0) return "/";
  return path.slice(0, i);
}

export function basename(path: string): string {
  if (path === "/") return "/";
  return path.slice(path.lastIndexOf("/") + 1);
}

// Walk: returns the node at an absolute, normalized path, or null.
export function walk(root: FsDir, path: string): FsNode | null {
  if (path === "/" || path === "") return root;
  const segments = path.split("/").filter(Boolean);
  let node: FsNode = root;
  for (const seg of segments) {
    if (node.kind !== "dir") return null;
    const next: FsNode | undefined = node.children[seg];
    if (!next) return null;
    node = next;
  }
  return node;
}

// Read: returns string content for a file, "denied" sentinel, or null.
export function readFile(
  root: FsDir,
  path: string,
): { kind: "ok"; text: string } | { kind: "denied" } | { kind: "missing" } | { kind: "is-dir" } {
  const node = walk(root, path);
  if (!node) return { kind: "missing" };
  if (node.kind === "dir") return { kind: "is-dir" };
  if (node.perm === "denied") return { kind: "denied" };
  const text = typeof node.content === "function" ? node.content() : node.content;
  return { kind: "ok", text };
}

// List: returns child names of a directory, or null sentinels.
export function listDir(
  root: FsDir,
  path: string,
): { kind: "ok"; entries: { name: string; node: FsNode }[] } | { kind: "denied" } | { kind: "missing" } | { kind: "is-file" } {
  const node = walk(root, path);
  if (!node) return { kind: "missing" };
  if (node.kind === "file") return { kind: "is-file" };
  if (node.perm === "denied") return { kind: "denied" };
  const names = Object.keys(node.children).sort();
  return {
    kind: "ok",
    entries: names.map((name) => ({ name, node: node.children[name]! })),
  };
}

// MOTD content — built lazily so it can flip post-unlock.
function buildMotd(unlocked: boolean): string {
  const banner = `${ELIJAH.osName} 4.7.0 (zsh)`;
  if (unlocked) {
    return [
      banner,
      "Last login: Tue Apr 28 03:14:22 from /root/.real",
      "[ok] /root/.real — verified.",
      "",
      "Type 'help' for available commands.",
    ].join("\n");
  }
  return [
    banner,
    "Last login: Tue Apr 28 03:14:22 from 127.0.0.1",
    "[warn] /root/.real — checksum mismatch (3 fragments unverified)",
    "",
    "Type 'help' for available commands.",
  ].join("\n");
}

// Public entry point — builds the FS root with a unlocked-state closure so
// /etc/motd and /root/.real respond to the current state at read time.
export function buildFs(getUnlocked: () => boolean): FsDir {
  return {
    kind: "dir",
    children: {
      bin: {
        kind: "dir",
        children: {
          ls: { kind: "file", content: "ELF 64-bit LSB executable\n" },
          cd: { kind: "file", content: "ELF 64-bit LSB executable\n" },
          cat: { kind: "file", content: "ELF 64-bit LSB executable\n" },
          sudo: {
            kind: "file",
            mode: "-rwsr-xr-x",
            content: "ELF 64-bit LSB executable (setuid root)\n",
          },
        },
      },
      etc: {
        kind: "dir",
        children: {
          motd: {
            kind: "file",
            content: () => buildMotd(getUnlocked()),
          },
          passwd: {
            kind: "file",
            content:
              "guest:x:1000:1000:visitor:/home/guest:/bin/zsh\n" +
              "elijah:x:0:0:elijah:/root:/bin/zsh\n",
          },
          shadow: {
            kind: "file",
            perm: "denied",
            mode: "-rw-------",
            owner: "root",
            group: "root",
            content: "(redacted)\n",
          },
        },
      },
      root: {
        kind: "dir",
        perm: "denied",
        mode: "dr-x------",
        owner: "root",
        group: "root",
        children: {
          ".real": {
            kind: "file",
            perm: "denied",
            mode: "-r--------",
            owner: "root",
            group: "root",
            content: "(use sudo)\n",
          },
        },
      },
      home: {
        kind: "dir",
        children: {
          guest: {
            kind: "dir",
            children: {
              ".bash_history": {
                kind: "file",
                content:
                  // Plausible past commands. The puzzle does NOT depend on
                  // these — the cryptic ~/.notes file is the real path.
                  // These are flavor that rewards looking, without
                  // shortcutting the cross-UI design.
                  "ls -la\n" +
                  "cd ~/projects\n" +
                  "git status\n" +
                  "echo $SHELL\n" +
                  "cat /etc/motd\n" +
                  "whoami\n" +
                  "clear\n",
              },
              ".notes": {
                kind: "file",
                content:
                  "~ password reconstruction ~\n" +
                  "\n" +
                  "three highlights in gold across /about\n" +
                  "the year wobbles arrived\n" +
                  "the warning in the logs\n" +
                  "\n" +
                  "hyphenate. lowercase.\n" +
                  "\n" +
                  "— e\n",
              },
              ".zshrc": {
                kind: "file",
                content:
                  "# zsh config (read-only sample)\n" +
                  "export EDITOR=nano\n" +
                  "alias ll='ls -la'\n" +
                  "alias gs='git status'\n" +
                  "echo \"welcome back, $USER\"\n",
              },
              ".ssh": {
                kind: "dir",
                mode: "drwx------",
                children: {
                  id_rsa: {
                    kind: "file",
                    perm: "denied",
                    mode: "-rw-------",
                    content: "(private key)\n",
                  },
                  known_hosts: {
                    kind: "file",
                    content:
                      "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n",
                  },
                },
              },
            },
          },
        },
      },
      tmp: { kind: "dir", children: {} },
      var: {
        kind: "dir",
        children: {
          log: {
            kind: "dir",
            children: {
              "auth.log": {
                kind: "file",
                content:
                  // Hints toward System Pulse without revealing alpha7.
                  // The line about handshake_id is the relevant clue;
                  // everything else is plausible flavor.
                  "[auth] guest login: tty1 (pam_unix)\n" +
                  "[auth] sudo session opened for root by guest\n" +
                  "[auth] sudo session closed\n" +
                  "[auth] handshake_id rotated; current value visible to system pulse only\n" +
                  "[auth] keyring unlocked (default)\n" +
                  "[auth] guest login: tty1 (pam_unix)\n" +
                  "[auth] policy reload (no changes)\n" +
                  "[auth] tally reset for guest\n" +
                  "[auth] cron session opened for root\n" +
                  "[auth] cron session closed\n",
              },
            },
          },
        },
      },
    },
  };
}
