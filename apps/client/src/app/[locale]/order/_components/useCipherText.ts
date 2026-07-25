"use client";

import { useState, useEffect, useMemo } from "react";

const FEMALE_NAMES = ["Марина", "Софія", "Діана", "Оксана", "Тетяна", "Наталія", "Ірина", "Олена", "Юлія", "Людмила"];
const MALE_NAMES = ["Руслан", "Василь", "Богдан", "Микола", "Олег", "Андрій", "Дмитро", "Сергій", "Іван", "Тарас"];
const SURNAMES: [string, string][] = [
  ["Шевченко", "Шевченко"], ["Франко", "Франко"], ["Коваленко", "Коваленко"], ["Бондаренко", "Бондаренко"],
  ["Ткаченко", "Ткаченко"], ["Кравченко", "Кравченко"], ["Мельник", "Мельник"], ["Лисенко", "Лисенко"],
  ["Марченко", "Марченко"], ["Савченко", "Савченко"], ["Романенко", "Романенко"], ["Олійник", "Олійник"],
];
const CHARS = "АБВГДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгдеєжзиіїйклмнопрстуфхцчшщьюя";

function generateNames(): string[] {
  const result: string[] = [];
  const used = new Set<string>();
  while (result.length < 24) {
    const isFemale = Math.random() > 0.5;
    const first = isFemale ? FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)] : MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)];
    const [femS, maleS] = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const full = `${first} ${isFemale ? femS : maleS}`;
    if (!used.has(full)) { used.add(full); result.push(full); }
  }
  return result;
}

export function useCipherText(active: boolean): string {
  const names = useMemo(() => generateNames(), []);
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * names.length));
  const [text, setText] = useState(names[0] ?? "Ім'я Прізвище");

  // Cycle through names
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setIdx((i) => (i + 1) % names.length), 3200);
    return () => clearInterval(interval);
  }, [active, names.length]);

  // Scramble animation
  useEffect(() => {
    if (!active) return;
    const target = names[idx] ?? "Ім'я Прізвище";
    let frame = 0;
    let animId: ReturnType<typeof setTimeout>;
    const scramble = () => {
      const progress = frame / (target.length * 2);
      const revealed = Math.floor(progress * target.length);
      const result = target.split("").map((ch, i) => {
        if (ch === " ") return " ";
        if (i < revealed) return ch;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join("");
      setText(result);
      frame++;
      if (frame <= target.length * 2 + 4) animId = setTimeout(scramble, 35);
      else setText(target);
    };
    scramble();
    return () => clearTimeout(animId);
  }, [idx, active, names]);

  return text;
}
