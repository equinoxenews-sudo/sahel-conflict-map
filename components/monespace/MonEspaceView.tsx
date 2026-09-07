"use client";

import { useMemo, useState } from "react";
import {
  LAC_TCHAD_ARTICLES,
  LAC_TCHAD_POINTS,
  LAC_TCHAD_SUMMARY,
} from "@/lib/lacTchad";
import KeywordSearch from "./KeywordSearch";
import LacTchadMapLoader from "./LacTchadMapLoader";
import styles from "./MonEspaceView.module.css";
import ThreatGauge from "./ThreatGauge";
import TodoList from "./TodoList";

const INITIAL_KEYWORDS = ["Boko Haram", "ISWAP", "JAS"];

export default function MonEspaceView() {
  const [keywords, setKeywords] = useState<string[]>(INITIAL_KEYWORDS);
  const [active, setActive] = useState<Set<string>>(new Set(INITIAL_KEYWORDS));

  const addKeyword = (kw: string) => {
    setKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
    setActive((prev) => new Set(prev).add(kw));
  };

  const toggleKeyword = (kw: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  };

  const filteredPoints = useMemo(
    () => LAC_TCHAD_POINTS.filter((p) => active.has(p.keyword)),
    [active]
  );

  return (
    <div className={styles.page}>
      <div className={styles.zoneLabel}>Zone suivie : Lac Tchad</div>

      <div className={styles.topRow}>
        <div className={styles.mapArea}>
          <LacTchadMapLoader points={filteredPoints} />
        </div>

        <div className={styles.middleColumn}>
          <ThreatGauge value={22} />
          <KeywordSearch
            keywords={keywords}
            active={active}
            onAddKeyword={addKeyword}
            onToggle={toggleKeyword}
          />
        </div>

        <div className={styles.todoArea}>
          <TodoList />
        </div>
      </div>

      <div className={styles.bottomRow}>
        {LAC_TCHAD_ARTICLES.map((article) => (
          <article key={article.title} className={styles.articleCard}>
            <span className={styles.articleTag}>Généré par IA</span>
            <span className={styles.articleDate}>{article.date}</span>
            <h3 className={styles.articleTitle}>{article.title}</h3>
            <p className={styles.articleSummary}>{article.summary}</p>
          </article>
        ))}

        <div className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>Résumé de la situation</h3>
          <p className={styles.summaryText}>{LAC_TCHAD_SUMMARY}</p>
        </div>
      </div>
    </div>
  );
}
