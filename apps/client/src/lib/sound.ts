"use client";

// SND UI Sound Library — https://snd.dev
// Kit SND01 "sine" — clean, minimal, fits the brand.
// Loaded on first play so the library stays out of the initial page bundle.
type SndClass = (typeof import("snd-lib"))["default"];
type SoundKey = keyof SndClass["SOUNDS"];

let instance: Promise<{ snd: InstanceType<SndClass>; Snd: SndClass }> | null = null;

function getSnd() {
  if (!instance) {
    instance = import("snd-lib").then(async ({ default: Snd }) => {
      const snd = new Snd();
      await snd.load(Snd.KITS.SND01);
      return { snd, Snd };
    });
  }
  return instance;
}

function play(key: SoundKey): Promise<void> {
  return getSnd()
    .then(({ snd, Snd }) => snd.play(Snd.SOUNDS[key]))
    .then(() => undefined)
    .catch(() => {});
}

export const sound = {
  tap: () => play("TAP"),
  button: () => play("BUTTON"),
  toggle: (on: boolean) => play(on ? "TOGGLE_ON" : "TOGGLE_OFF"),
  select: () => play("SELECT"),
  open: () => play("TRANSITION_UP"),
  close: () => play("TRANSITION_DOWN"),
  type: () => play("TYPE"),
  notification: () => play("NOTIFICATION"),
  caution: () => play("CAUTION"),
  celebration: () => play("CELEBRATION"),
};
