"use client";

import { useEffect, useState } from "react";
import { Canvas, Rect } from "fabric";

export default function FabricVideoEditor() {
  const [canvas, setCanvas] = useState<Canvas | null>(null);

  const addRectangle = () => {
    const RGB = ["red", "green", "blue"];
    const fill = RGB[Math.floor(Math.random() * 3)];
    const rect = new Rect({
      width: 100,
      height: 100,
      fill,
    });

    canvas?.add(rect);
    canvas?.centerObject(rect);
    canvas?.renderAll();
  };

  useEffect(() => {
    const c = new Canvas("canvas", {
      width: 960,
      height: 540,
      preserveObjectStacking: true,
    });
    setCanvas(c);

    return () => {
      c.dispose();
    };
  }, [setCanvas]);

  return (
    <>
      <div className="h-[540px] w-[960px] border-2 border-black">
        <canvas id="canvas" />
      </div>
      <button onClick={addRectangle}>Add RGB Block</button>
    </>
  );
}
