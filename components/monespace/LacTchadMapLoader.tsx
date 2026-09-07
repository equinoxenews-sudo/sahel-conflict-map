"use client";

import dynamic from "next/dynamic";
import type { LacTchadPoint } from "@/lib/lacTchad";

const LacTchadMap = dynamic(() => import("./LacTchadMap"), { ssr: false });

export default function LacTchadMapLoader({ points }: { points: LacTchadPoint[] }) {
  return <LacTchadMap points={points} />;
}
