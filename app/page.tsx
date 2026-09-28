"use client";

import dynamic from "next/dynamic";

const FabricVideoEditor = dynamic(() => import("@/components/fabric-video-editor"), {
  ssr: false,
});

export default function Home() {
  return <FabricVideoEditor />;
}
