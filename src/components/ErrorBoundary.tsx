"use client";

// Minimal class-based error boundary. React only catches render-time errors in
// class components (or Next's unstable_catchError), so this stays a class. Used
// to isolate the WebGL particle field: if Canvas creation throws on a machine
// without a usable GPU, we render the fallback (or nothing) instead of letting
// the whole desktop white-screen.

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary]", error);
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
