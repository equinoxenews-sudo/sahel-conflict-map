"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { INPUT_TYPE_LABELS, type InputType } from "@/lib/investigation/connectors";
import styles from "./SearchBar.module.css";

const INPUT_TYPES = Object.keys(INPUT_TYPE_LABELS) as InputType[];

interface SearchBarProps {
  initialType?: InputType;
  initialQuery?: string;
  /** When provided, the form calls this instead of navigating (used on the Recherche page itself). */
  onSearch?: (type: InputType, query: string) => void;
}

export default function SearchBar({ initialType = "keyword", initialQuery = "", onSearch }: SearchBarProps) {
  const [type, setType] = useState<InputType>(initialType);
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (onSearch) {
      onSearch(type, trimmed);
    } else {
      router.push(`/investigation/recherche?type=${type}&q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <select
        className={styles.select}
        value={type}
        onChange={(e) => setType(e.target.value as InputType)}
        aria-label="Type de recherche"
      >
        {INPUT_TYPES.map((t) => (
          <option key={t} value={t}>
            {INPUT_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <input
        className={styles.input}
        type="text"
        placeholder="Nom, pseudonyme, domaine, mot-clé, IMO..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className={styles.button}>
        Rechercher
      </button>
    </form>
  );
}
