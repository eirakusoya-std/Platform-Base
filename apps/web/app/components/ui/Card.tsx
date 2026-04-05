"use client";

import { ElementType, PropsWithChildren } from "react";

type CardTone = "default" | "subtle";

type CardProps<T extends ElementType = "div"> = PropsWithChildren<{
  as?: T;
  className?: string;
  tone?: CardTone;
}>;

export function Card<T extends ElementType = "div">({ as, className = "", tone = "default", children }: CardProps<T>) {
  const Component = (as ?? "div") as ElementType;
  const toneClass = tone === "subtle" ? "ui-card-subtle" : "ui-card";
  return <Component className={`${toneClass} ${className}`.trim()}>{children}</Component>;
}
