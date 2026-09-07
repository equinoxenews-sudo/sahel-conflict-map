"use client";

import { useEffect, useState } from "react";
import styles from "./TodoList.module.css";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const STORAGE_KEY = "monespace-todo";

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load of persisted client-only state on mount
      if (raw) setTasks(JSON.parse(raw));
    } catch {
      // ignore — private browsing / storage blocked
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks, loaded]);

  const addTask = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), text: trimmed, done: false }]);
    setValue("");
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Mes travaux</h2>
      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="Ajouter une tâche…"
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
      </div>
      <div className={styles.list}>
        {tasks.map((task) => (
          <div key={task.id} className={styles.item}>
            <label className={styles.itemLabel}>
              <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
              <span className={task.done ? styles.done : undefined}>{task.text}</span>
            </label>
            <button
              type="button"
              className={styles.remove}
              onClick={() => removeTask(task.id)}
              aria-label="Supprimer"
            >
              ×
            </button>
          </div>
        ))}
        {tasks.length === 0 && <p className={styles.empty}>Aucune tâche pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
