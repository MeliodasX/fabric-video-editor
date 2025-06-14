"use client";

import dynamic from "next/dynamic";

export default function home() {
  const FabricVideoEditor = dynamic(() => import("@/components/fabric-video-editor"), {
    ssr: false,
  });

  return <FabricVideoEditor />;
}
