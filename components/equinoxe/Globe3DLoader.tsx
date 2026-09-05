"use client";

import dynamic from "next/dynamic";

const Globe3D = dynamic(() => import("./Globe3D"), { ssr: false });

export default function Globe3DLoader() {
  return <Globe3D />;
}
