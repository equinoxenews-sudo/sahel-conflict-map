"use client";

import { useState } from "react";
import styles from "./KeywordSearch.module.css";

interface KeywordSearchProps {
  keywords: string[];
  active: Set<string>;
  onAddKeyword: (keyword: string) => void;
  onToggle: (keyword: string) => void;
}

export default function KeywordSearch({
  keywords,
  active,
  onAddKeyword,
  onToggle,
}: KeywordSearchProps) {
  const [value, setValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onAddKeyword(trimmed);
    setValue("");
  };

  return (
    <div className={styles.wrapper}>
      <input
        type="text"
        placeholder="Rechercher un mot-clé…"
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.list}>
        {keywords.map((kw) => (
          <label key={kw} className={styles.item}>
            <input
              type="checkbox"
              checked={active.has(kw)}
              onChange={() => onToggle(kw)}
            />
            {kw}
          </label>
        ))}
      </div>
    </div>
  );
}
