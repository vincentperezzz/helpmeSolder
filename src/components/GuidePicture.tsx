"use client";

import { WokwiDiagram } from "@/components/WokwiDiagram";
import { EXAMPLE_GUIDE } from "@/lib/home/example-guide";

export function GuidePicture() {
  return (
    <figure
      className="snippet-frame h-full min-h-0"
      aria-label={`${EXAMPLE_GUIDE.title} wiring picture`}
    >
      <WokwiDiagram guide={EXAMPLE_GUIDE} />
    </figure>
  );
}
