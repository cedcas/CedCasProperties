/**
 * Soft "ding" sound rules (haven-chat-usage-2026-11-09.md fix #2 / hil-pm-handoff). Never
 * autoplays on arrival — it may only play after the guest's own first tap/interaction with
 * Haven (a user gesture, required anyway for Web Audio to be allowed to start) and only when
 * Haven actually replies. Respects prefers-reduced-motion, same as the launcher's bounce.
 */

/** Pure gate: both conditions are required, independent of whether audio itself is available. */
export function shouldPlayHavenDing(opts: {
  hasUserInteracted: boolean;
  prefersReducedMotion: boolean;
}): boolean {
  return opts.hasUserInteracted && !opts.prefersReducedMotion;
}

/**
 * Tiny two-tone chime via Web Audio — no asset to fetch. Fails silent (caught, no throw) if
 * audio is blocked/unavailable, per the spec ("no sound ... if audio is blocked").
 */
export function playHavenDing(): void {
  try {
    const Ctor: typeof AudioContext | undefined =
      typeof AudioContext !== "undefined"
        ? AudioContext
        : (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    /* audio blocked/unavailable — stay quiet */
  }
}
