import { useCallback, useEffect, useRef, useState } from "react";

/** How long the wheel turns before the result is shown, in milliseconds. */
export const SPIN_DURATION_MS = 4000;

const FULL_TURNS = 5;
// Where inside the winning slice the pointer stops, as a share of the slice width, so the stop looks natural.
const STOP_SPREAD = 0.7;

function randomUnit(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 2 ** 32;
}

/**
 * Uniform integer in [0, count) without modulo bias: values from the biased tail of the 32-bit range are discarded.
 */
export function randomIndex(count: number): number {
  const range = 2 ** 32;
  const limit = range - (range % count);
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % count;
}

/** Rotation (degrees, clockwise) that puts the given slice under a pointer at the top of the wheel. */
function rotationFor(count: number, index: number, offset = 0): number {
  return -((index + 0.5) * (360 / count) + offset);
}

/**
 * State of a wheel with `count` equal slices. The winner is drawn first, then the wheel turns to it.
 * `initialWinnerIndex` shows a finished draw without spinning (used by the state sink).
 */
export function useWheelSpin(count: number, initialWinnerIndex?: number) {
  const initial =
    initialWinnerIndex !== undefined && initialWinnerIndex >= 0 && initialWinnerIndex < count
      ? initialWinnerIndex
      : null;
  const [rotation, setRotation] = useState(initial === null ? 0 : rotationFor(count, initial));
  const [animate, setAnimate] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(initial);

  const rotationRef = useRef(rotation);
  const pendingRef = useRef<number | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  // Idempotent: both the transition end and the timeout fallback call it.
  const finish = useCallback(() => {
    window.clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    setSpinning(false);
    setWinnerIndex(pending);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    [],
  );

  const spin = useCallback(() => {
    if (spinning || count < 2) return;

    const index = randomIndex(count);
    const step = 360 / count;
    const offset = (randomUnit() - 0.5) * step * STOP_SPREAD;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const current = rotationRef.current;
    const target = rotationFor(count, index, offset);
    const delta = (((target - current) % 360) + 360) % 360;
    const next = current + (reduced ? 0 : FULL_TURNS * 360) + delta;
    rotationRef.current = next;

    setAnimate(!reduced);
    setRotation(next);

    if (reduced) {
      setWinnerIndex(index);
      return;
    }

    setWinnerIndex(null);
    setSpinning(true);
    pendingRef.current = index;
    timerRef.current = window.setTimeout(finish, SPIN_DURATION_MS + 250);
  }, [count, finish, spinning]);

  return { rotation, animate, spinning, winnerIndex, spin, finish };
}
