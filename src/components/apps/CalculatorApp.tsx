"use client";

import { useCallback, useEffect, useState } from "react";
import { APPS } from "@/lib/apps";
import { useDesktopStore } from "@/lib/desktop-store";

type Op = "+" | "-" | "*" | "/";

const CALC_KEYS: Array<
  Array<{ label: string; value: string; kind?: "op" | "fn" | "eq" | "zero" }>
> = [
  [
    { label: "C", value: "C", kind: "fn" },
    { label: "±", value: "+/-", kind: "fn" },
    { label: "%", value: "%", kind: "fn" },
    { label: "÷", value: "/", kind: "op" },
  ],
  [
    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: "×", value: "*", kind: "op" },
  ],
  [
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "−", value: "-", kind: "op" },
  ],
  [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "+", value: "+", kind: "op" },
  ],
  [
    { label: "0", value: "0", kind: "zero" },
    { label: ".", value: "." },
    { label: "=", value: "=", kind: "eq" },
  ],
];

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? NaN : a / b;
  }
}

function format(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  // Trim trailing zeros, cap precision so the readout fits.
  const s = Number(n.toPrecision(12)).toString();
  return s.length > 12 ? n.toExponential(6) : s;
}

export function CalculatorApp() {
  const [display, setDisplay] = useState("0");
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const inputDigit = useCallback(
    (d: string) => {
      setDisplay((cur) => {
        if (justEvaluated) return d === "." ? "0." : d;
        if (d === "." && cur.includes(".")) return cur;
        if (cur === "0" && d !== ".") return d;
        return cur + d;
      });
      setJustEvaluated(false);
    },
    [justEvaluated],
  );

  const applyOp = useCallback(
    (op: Op) => {
      const cur = parseFloat(display);
      if (accumulator === null || pendingOp === null) {
        setAccumulator(cur);
      } else {
        const result = compute(accumulator, cur, pendingOp);
        setAccumulator(result);
        setDisplay(format(result));
      }
      setPendingOp(op);
      setJustEvaluated(true);
    },
    [accumulator, display, pendingOp],
  );

  const evaluate = useCallback(() => {
    if (accumulator === null || pendingOp === null) return;
    const cur = parseFloat(display);
    const result = compute(accumulator, cur, pendingOp);
    setDisplay(format(result));
    setAccumulator(null);
    setPendingOp(null);
    setJustEvaluated(true);
  }, [accumulator, display, pendingOp]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setAccumulator(null);
    setPendingOp(null);
    setJustEvaluated(false);
  }, []);

  const negate = useCallback(() => {
    setDisplay((cur) => (cur.startsWith("-") ? cur.slice(1) : cur === "0" ? cur : "-" + cur));
  }, []);

  const percent = useCallback(() => {
    const n = parseFloat(display);
    setDisplay(format(n / 100));
    setJustEvaluated(true);
  }, [display]);

  const backspace = useCallback(() => {
    setDisplay((cur) => {
      if (justEvaluated) return "0";
      if (cur.length <= 1 || (cur.length === 2 && cur.startsWith("-"))) return "0";
      return cur.slice(0, -1);
    });
  }, [justEvaluated]);

  // Keyboard input is only consumed when the calculator window is the
  // focused window so keys are not swallowed when another app is in front.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { focusId, launchpadOpen } = useDesktopStore.getState();
      // Bail when the calculator is not the focused window OR the launchpad
      // overlay is open. The launchpad owns ESC and Tab while visible, so
      // we must not consume those keys behind it.
      if (launchpadOpen || focusId !== "calculator") return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) { inputDigit(k); e.preventDefault(); return; }
      if (k === ".") { inputDigit("."); e.preventDefault(); return; }
      if (k === "+" || k === "-" || k === "*" || k === "/") {
        applyOp(k as Op); e.preventDefault(); return;
      }
      if (k === "Enter" || k === "=") { evaluate(); e.preventDefault(); return; }
      if (k === "Escape") { clearAll(); e.preventDefault(); return; }
      if (k === "Backspace") { backspace(); e.preventDefault(); return; }
      if (k === "%") { percent(); e.preventDefault(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputDigit, applyOp, evaluate, clearAll, backspace, percent]);

  const onKey = (key: string) => {
    if (key === "C") return clearAll();
    if (key === "+/-") return negate();
    if (key === "%") return percent();
    if (key === "=") return evaluate();
    if (key === "+" || key === "-" || key === "*" || key === "/") return applyOp(key);
    return inputDigit(key);
  };

  return (
    <div className="calculator-app">
      <span className="app-kicker">{APPS.calculator.title}</span>
      <div className="calc-readout" aria-live="polite">{display}</div>
      <div className="calc-pad">
        {CALC_KEYS.map((row, i) => (
          <div className="calc-row" key={i}>
            {row.map((k) => (
              <button
                key={k.value}
                type="button"
                className={`calc-key${k.kind ? ` calc-key--${k.kind}` : ""}`}
                onClick={() => onKey(k.value)}
              >
                {k.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
