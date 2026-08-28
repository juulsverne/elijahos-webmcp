type TraceRetrieval = {
  dense: "none" | "in-process" | "vercel-postgres";
};

export const UI_COPY = {
  chrome: {
    window: {
      close: "Close",
      minimize: "Minimize",
      maximize: "Maximize",
      restore: "Restore",
      closeApp: (title: string) => `Close ${title}`,
      minimizeApp: (title: string) => `Minimize ${title}`,
      maximizeApp: (title: string) => `Maximize ${title}`,
      restoreApp: (title: string) => `Restore ${title}`,
    },
    launchpad: {
      title: "Apps",
      caption: "/apps",
      open: "Open apps",
      close: "Close apps",
      openApp: (title: string) => `Open ${title}`,
    },
    topbar: {
      building: (thing: string) => `/${thing}`,
      widgets: "widgets",
      openWidgets: "open widgets",
      closeWidgets: "close widgets",
    },
    mobile: {
      primaryApps: "Primary apps",
      home: "home",
      apps: "apps",
      backToHome: "Back to home",
      openApp: (title: string) => `Open ${title}`,
      // Live clock in the masthead's metadata row: "wed, jul 9 · 10:42".
      // Built from parts so the separator lives in one place.
      statusSeparator: " · ",
      // The home screen's <h1> shows the OS brand and nothing else. This is
      // the rest of the heading — name · role — appended visually hidden, so
      // assistive tech and search still read the full identity.
      headingSuffix: (subtitle: string) => ` — ${subtitle}`,
      // Ask affordance pinned above the dock. The chip is a desktop hint —
      // hidden on touch-only phones (see .mobile-ask-chip in mobile.css).
      ask: {
        placeholder: "ask elijah anything",
        chip: "⌘K",
        open: "Ask Elijah",
      },
      nowBuilding: {
        kicker: "now building",
        open: (title: string) => `Open ${title}`,
      },
      // Changelog card pinned under the "now building" card — surfaces the
      // newest release note and deep-links into the /changelog app.
      changelog: {
        kicker: "changelog",
        open: (title: string) => `Open changelog — ${title}`,
      },
    },
    desktopMenu: {
      aria: "Desktop menu",
      title: (osName: string) => `${osName} Desktop`,
      bringToFront: "Bring to Front",
      minimizeWindow: "Minimize Window",
      closeWindow: "Close Window",
      // "Open App ▸" submenu — friendly labels for the app launches that the
      // dock already advertises, tucked behind one row so the menu leads with
      // desktop actions instead of cloning the dock.
      openApp: "Open App",
      apps: {
        about: "About",
        projects: "Projects",
        resume: "Resume",
        contact: "Contact",
        ask: (firstName: string) => `Ask ${firstName}`,
        zsh: "Terminal",
      },
      // The "About This Mac" analog — routes to the ElijahOS case study.
      aboutThisOs: (osName: string) => `About ${osName}`,
      tidyWindows: "Tidy Windows",
      showWidgets: "Show Widgets",
      hideWidgets: "Hide Widgets",
      openAllWindows: "Open All Windows",
      minimizeAllWindows: "Minimize All Windows",
      closeAllWindows: "Close All Windows",
      // Footer action — a soft "restart the OS." Reloads the page so the boot
      // sequence replays from a clean slate; same end state as the ⌘⌥R / Ctrl+⌥+R
      // reboot shortcut wired in page.tsx.
      reboot: (osName: string) => `Reboot ${osName}`,
    },
  },
  error: {
    title: "Kernel panic.",
    message: "Something crashed while booting the desktop. A reboot usually fixes it.",
    reboot: "Reboot",
    notFoundCode: "404",
    notFoundMessage: "That route isn't mounted. The desktop is back home.",
    backToOs: (osName: string) => `Back to ${osName}`,
  },
  boot: {
    progress: (osName: string) => `${osName} startup progress`,
  },
  about: {
    askCta: (firstName: string) => `Ask ${firstName}`,
    seeProjects: "See projects →",
    viewResume: "View résumé →",
    contact: "Contact →",
  },
  projects: {
    title: "Selected builds",
    openCase: "Open case study →",
    github: "GitHub ↗",
    liveDemo: "Live ↗",
  },
  resume: {
    sections: {
      experience: "Experience",
      capabilities: "Capabilities",
      education: "Education",
    },
  },
  caseStudy: {
    sections: {
      architecture: "Architecture",
      decisions: "Decisions",
      stack: "Stack",
    },
    decisionLabels: {
      considered: "Considered",
      picked: "Picked",
    },
  },
  contact: {
    email: {
      label: "email",
      copied: "Copied",
      copyAddress: "Copy address",
      ready: "ready",
      copy: "copy",
      ariaCopy: "Copy email address",
    },
    compose: {
      title: "Draft an email",
      mode: "mailto",
      subject: "Subject",
      subjectPlaceholder: "AI workflow, portfolio chat, or collaboration",
      message: "Message",
      messagePlaceholder: (firstName: string) =>
        `Hey ${firstName}, I wanted to ask about...`,
      openEmail: "Open email",
      send: "Send",
    },
  },
  ask: {
    publicBuild: {
      title: (firstName: string) => `Ask ${firstName}`,
      body:
        "The private model, retrieval, tracing, and query-log implementation is intentionally not included in this clean challenge repository.",
      next:
        "The WebMCP challenge build will add public, read-only evidence tools here without exposing private infrastructure or making hiring decisions for the visitor.",
    },
    tabsAria: "Ask tabs",
    tabs: [
      { id: "chat", label: "chat" },
      { id: "trace", label: "trace" },
      { id: "spec", label: "spec" },
      { id: "evals", label: "evals" },
    ],
    suggestions: (firstName: string) => [
      `What makes ${firstName} useful on an AI team?`,
      "Walk me through the Ask Elijah architecture.",
      "Show me his projects",
      "Copy his contact email",
    ],
    emptyPrompt:
      "Ask Elijah is wired into the portfolio, not bolted beside it. Try a prompt that makes it retrieve evidence, call a tool, or explain its own architecture:",
    inputPlaceholder: "ask anything",
    inputEnterKeyHint: "send",
    send: "send",
    busy: "...",
    errorPrefix: "stream error",
    streamFailed: "stream failed",
    status: {
      default: "thinking",
    },
    messageLabels: {
      user: "you",
      assistant: "ask-elijah",
    },
    citation: {
      foundTitle: (topic: string) => `Open source: ${topic}`,
      missingTitle: "Source not found",
    },
    confidence: {
      label: (pct: number) => `confidence ${pct}%`,
      low: " · low",
    },
    evals: {
      emptyTitle: "No eval report committed yet.",
      emptyBeforeCommand: "Run ",
      command: "npm run evals",
      emptyAfterCommand: " locally; the runner writes a report to ",
      reportPath: "public/evals/latest.json",
      emptyAfterPath: ". Commit that file and recruiters can audit pass rates here.",
      latestRun: "latest eval run",
      generated: (value: string) => `Generated ${value}`,
      failures: (count: number) => `failures (${count})`,
      allPassed: "All cases passed.",
      retrievalHeadline: "hybrid retrieval lift",
      retrievalValue: (bm25Recall: number, hybridRecall: number) =>
        `recall ${Math.round(bm25Recall * 100)}% → ${Math.round(hybridRecall * 100)}%`,
    },
    trace: {
      emptyTitle: "Ask something first. Retrieval traces show up here.",
      emptyBody:
        "You will see scored chunks (including rejected ones below the relevance threshold), tool calls in firing order, latency, token counts, and the per-turn cost.",
      lastQuery: "last query",
      emptyQuery: "(empty)",
      latency: "latency",
      timingBreakdown: "timing",
      tokens: "tokens",
      tokensValue: (tokensIn: number, tokensOut: number) =>
        `${tokensIn} in · ${tokensOut} out`,
      cost: "cost",
      model: "model",
      stopReason: "stop",
      retrievalBackend: "retrieval",
      confidence: "confidence",
      providerModel: (provider: string, model: string) => `${provider} · ${model}`,
      retrievalBackendValue: (
        dense: TraceRetrieval["dense"],
        embedMs?: number,
      ): string => {
        const embed = typeof embedMs === "number" ? ` · embed ${embedMs} ms` : "";
        if (dense === "none") return "bm25 only";

        const backendLabel: Record<Exclude<TraceRetrieval["dense"], "none">, string> = {
          "in-process": "in-process",
          "vercel-postgres": "vercel postgres",
        };
        return `bm25 + ${backendLabel[dense]} · cosine · 1536d · rrf${embed}`;
      },
      timingValue: (label: string, ms: number) => `${label} ${ms} ms`,
      usedChunks: (count: number) => `used chunks (${count})`,
      noChunks: "No chunks above threshold.",
      belowThreshold: (count: number) => `below threshold (${count})`,
      toolCalls: (count: number) => `tool calls (${count})`,
      toolWhere: {
        server: "server",
        client: "client",
      },
      toolDescription: {
        server: "resolved with knowledge and fed back into the answer",
        client: "ran in the browser against the portfolio UI",
      },
      score: (score: number) => `score ${score.toFixed(2)}`,
      rankedScore: (score: number, rank: number) =>
        `score ${score.toFixed(2)} · #${rank}`,
      fusion: (
        bm25Rank: number | undefined,
        denseRank: number | undefined,
        fusedRank: number,
        rrf: number,
      ): string =>
        [
          bm25Rank === undefined ? "bm25 —" : `bm25 #${bm25Rank}`,
          denseRank === undefined ? "semantic —" : `semantic #${denseRank}`,
          `fused #${fusedRank} (${rrf.toFixed(4)})`,
        ].join(" · "),
    },
    blocks: {
      // StatPanel — labels for SYSTEM_METRICS (keyed by metric id).
      metrics: {
        apps:         "apps in the OS",
        "kb-chunks":  "knowledge chunks",
        "recall-lift": "retrieval recall",
        "eval-pass":  "eval pass rate",
      },
      // ComparisonPanel — heading and column headers.
      comparison: {
        heading:     "two worlds, one person",
        leftLabel:   "finance + ops",
        rightLabel:  "AI + engineering",
      },
      // ProjectCard — small caption labels for the result/stack sections.
      project: {
        result: "result",
      },
      // CapabilityGrid — heading shown above the four pillars.
      capability: {
        heading: "what I do",
      },
      // StatPanel — heading shown above the live system metrics.
      stats: {
        heading: "by the numbers",
      },
      // ContactCard — heading, per-field labels, and copy-button copy. The
      // "copied" confirmation reuses the existing contact key.
      contact: {
        heading: "say hello",
        emailLabel: "email",
        githubLabel: "github",
        linkedinLabel: "linkedin",
        copy: (label: string) => `Copy ${label}`,
        copied: "Copied",
      },
      // Timeline — heading above the career entries.
      timeline: {
        heading: "where he's been",
      },
      // MediaBlock — alt-text fallbacks and the optional "open Wobbles" action.
      media: {
        // Fallback alt when a track has no descriptive alt (uses its title).
        trackAlt: (title: string) => `Track: ${title}`,
        openWobbles: "Open the Wobbles widget →",
      },
      // ArchitectureBlock — heading and a one-line lead framing.
      architecture: {
        heading: "how this assistant works",
        lead: "Typed source data flows through retrieval into a grounded agent loop.",
      },
      // Accessible region labels — each block is a labeled group. The label
      // is the block type plus a one-line summary so a screen reader announces
      // what the panel is about (spec §9).
      aria: {
        projectCard: (name: string) => `Project card: ${name}`,
        capabilityGrid: "Capabilities: what Elijah does",
        comparison: (heading: string) => `Comparison: ${heading}`,
        stats: "System metrics: ElijahOS by the numbers",
        contact: "Contact: how to reach Elijah",
        timeline: "Timeline: Elijah's experience",
        media: (alt: string) => `Media: ${alt}`,
        architecture: "Architecture: how the Ask Elijah system is built",
      },
    },
    spec: {
      kicker: "public operating spec",
      description:
        "The contract this assistant operates under. Private guardrails (exact wording, anti-injection clauses) are server-only and shown here as [private] markers.",
      privateMarker: "[private]",
      privateTitle: (label: string) => `Private: ${label}`,
    },
  },
  snake: {
    scoreLabel: "Score",
    highScoreLabel: "High",
    mobileHint: "Swipe to steer.",
    desktopHint: "Arrow keys or WASD.",
    goalHint: "Eat the gold dot.",
    avoidHint: "Don't bite yourself.",
    gameOver: "Game over",
    score: (score: number) => `Score: ${score}`,
    enterName: "Enter your name",
    submit: "Submit",
    submitting: "Submitting...",
    leaderboard: "Leaderboard",
    rank: "#",
    name: "Name",
    scoreHead: "Score",
    noScores: "No scores yet",
    playAgain: "Play again",
    restartHint: "Press Space to restart",
  },
  clock: {
    modes: {
      clock: "Clock",
      stopwatch: "Stopwatch",
      timer: "Timer",
    },
    status: {
      running: "Running",
      paused: "Paused",
      ready: "Ready",
      done: "Done",
    },
    actions: {
      start: "Start",
      stop: "Stop",
      pause: "Pause",
      lap: "Lap",
      reset: "Reset",
    },
    timer: {
      minutes: "MIN",
      seconds: "SEC",
    },
    stepper: {
      decrease: (label: string) => `Decrease ${label}`,
      increase: (label: string) => `Increase ${label}`,
    },
    lapLabel: (lap: number) => `Lap ${lap}`,
  },
  root: {
    deniedLine: "cat: /root/.real: Permission denied",
    deniedHint: "solve the puzzle in /zsh first.",
    title: "Off the record.",
    compose: "Compose email →",
  },
  caseStudyDiagram: {
    aria: "Architecture diagram: data flow when a visitor asks the chatbot a question",
  },
  widgets: {
    region: "Widgets",
    musicPaused: "paused",
    // Release status for a Track with `unreleased: true`. `titleSuffix` keeps
    // the desktop widget's long-standing "NAME (UNRELEASED)" rendering; the
    // mobile player uses the bare word in its kicker instead.
    music: {
      unreleased: "unreleased",
      titleSuffix: (title: string) => `${title} (UNRELEASED)`,
    },
    playback: {
      seek: "seek",
      previousTrack: "previous track",
      nextTrack: "next track",
      pause: "pause",
      play: "play",
      listenOnSpotify: "Listen on Spotify ↗",
    },
    weather: {
      toggleUnit: "Toggle Celsius and Fahrenheit",
      fetching: "fetching…",
      unavailable: "unavailable",
      clickToToggle: "click to toggle °C / °F",
      // Today's range bar bounds and the UV foot line on the mobile card.
      low: (deg: string) => `L${deg}`,
      high: (deg: string) => `H${deg}`,
      uv: (index: number) => `uv ${Math.round(index)}`,
    },
    // Mobile index card — the knowledge base drawn as itself. Areas are named
    // from APPS; only the app-less cluster needs a word of its own.
    index: {
      title: "index",
      vectors: "vectors",
      // Not "asked": the counter credits every area an answer drew on, so the
      // total runs ahead of the question count. Naming it "asked" would
      // overstate traffic on a card whose whole point is that the numbers are
      // real. Kept to "vectors" width — on a 320px viewport the card is 137px
      // and the unit gets 42px, which fits "vectors" and "lookups" exactly and
      // clips "retrievals" (60px).
      asked: "lookups",
      core: "core",
      // Two footers because the card measures two different things depending
      // on whether anyone has asked it anything yet.
      foot: (total: number, areas: number) =>
        `${total} vectors · ${areas} areas`,
      footAsked: (total: number, areas: number) =>
        `${total} lookups · ${areas} areas`,
    },
    pulse: {
      live: "live",
      fps: "FPS",
      fpsUnit: "fps",
      heap: "heap",
      jsHeap: "JS HEAP",
      cores: "CORES",
      net: "NET",
      cpu: "your cpu",
      rtt: (ms: number) => `${ms} ms rtt`,
      processes: (count: number) => `processes (${count})`,
      killAll: "kill all",
      killAllTitle: "kill all processes",
      idle: "idle",
      focus: (label: string) => `focus ${label}`,
      kill: (label: string) => `kill ${label}`,
      moreProcesses: (count: number) => `${count} more processes`,
      moreRow: (count: number) => `… +${count} more`,
      log: "log",
      waiting: "[—] waiting…",
    },
    wobbles: {
      tip: "← prev · next →",
      // Stat-cell labels on the vitals page. Kept short — each one sits above
      // its value in a half-width cell roughly 100px wide.
      birthday: "BORN",
      age: "AGE",
      color: "COLOR",
      breed: "BREED",
      weight: "WEIGHT",
      treats: "TREATS",
      // Accessible name for the vitals page as a whole; the stat cells are a
      // <dl>, so their own labels carry the rest.
      vitalsAria: (name: string) => `${name} vitals`,
    },
  },
  changelog: {
    // Serif H1 under the /changelog kicker.
    title: "Changelog",
    tagline:
      "What's shipped, improved, and retired across ElijahOS — newest first.",
    // Tag chip labels, keyed by ChangeKind (see src/lib/changelog.ts).
    kinds: {
      added: "added",
      improved: "improved",
      fixed: "fixed",
      deprecated: "deprecated",
      removed: "removed",
    },
    // "Open ↗" deep-link button (the arrow is decorative, in the component).
    open: "Open",
    openApp: (title: string) => `Open ${title}`,
  },
  // Generic labels for the server-rendered document routes. Personal facts
  // (name, OS name) arrive as arguments so nothing here duplicates ELIJAH.
  docs: {
    // Homepage disclosure, docked into the topbar band. The visible label is
    // deliberately terse — "☰ docs" mirrors the bar's own "⊞ widgets" button —
    // because the text search engines actually read is the anchor text inside
    // (aboutLink / projectsLink / resumeLink), not the summary. The full name
    // stays available to humans on hover via navTitle.
    navGlyph: "☰",
    navSummary: "docs",
    navTitle: (name: string) => `${name} — Documents`,
    navAriaLabel: "Site documents",
    aboutLink: (name: string) => `About ${name}`,
    projectsLink: (name: string) => `Projects by ${name}`,
    resumeLink: (name: string) => `${name} résumé`,
    homeLink: (osName: string) => `Back to ${osName}`,
    breadcrumbHome: "Home",
    breadcrumbAriaLabel: "Breadcrumb",
    identityHeading: (name: string) => `Who is ${name}?`,
    answersHeading: (name: string) => `Questions recruiters ask about ${name}`,
    answersIntro:
      "Direct, evidence-linked answers for recruiters, hiring managers, and anyone evaluating the work.",
    answersAriaLabel: (name: string) => `Questions about ${name}`,
    evidenceLabel: "Evidence",
    evidenceSeparator: " · ",
    contactLink: (name: string) => `Contact ${name}`,
    projectEvidenceLink: (project: string, name: string) =>
      `${project} by ${name} — case study`,
    byline: (name: string) => `By ${name}`,
    updatedLabel: "Updated",
    sections: {
      capabilities: "Capabilities",
      experience: "Experience",
      education: "Education",
      stack: "Stack",
      decisions: "Decisions",
      architecture: "Architecture",
      elsewhere: "Elsewhere",
      status: "Status",
    },
  },
} as const;
