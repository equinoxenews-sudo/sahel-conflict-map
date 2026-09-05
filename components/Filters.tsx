"use client";

import { EVENT_CATEGORIES, SAHEL_COUNTRIES } from "@/types/event";
import styles from "./Filters.module.css";

interface FiltersProps {
  country: string;
  category: string;
  onCountryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export default function Filters({
  country,
  category,
  onCountryChange,
  onCategoryChange,
}: FiltersProps) {
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        Pays
        <select value={country} onChange={(e) => onCountryChange(e.target.value)}>
          <option value="all">Tous les pays</option>
          {SAHEL_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        Catégorie
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          <option value="all">Toutes les catégories</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
