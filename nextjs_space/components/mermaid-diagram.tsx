'use client';

/**
 * Mermaid diagram renderer for lesson visuals. Defensive by design: a
 * malformed diagram renders nothing (with a quiet note) — it can never break
 * a lesson. Mermaid is imported dynamically so it stays out of the main
 * bundle until a lesson actually has diagrams.
 */

import { useEffect, useRef, useState } from 'react';

let mermaidInit: Promise<any> | null = null;
function loadMermaid() {
  if (!mermaidInit) {
    mermaidInit = import('mermaid').then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'strict',
        fontFamily: 'inherit',
        themeVariables: {
          primaryColor: '#3b2a63',
          primaryTextColor: '#e5e7eb',
          primaryBorderColor: '#8b5cf6',
          lineColor: '#8b5cf6',
          secondaryColor: '#1f2637',
          tertiaryColor: '#111827',
        },
      });
      return m.default;
    });
  }
  return mermaidInit;
}

let uid = 0;

export default function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    loadMermaid()
      .then(async (mermaid) => {
        // parse() validates without touching the DOM — reject bad diagrams quietly
        await mermaid.parse(code);
        const { svg } = await mermaid.render(`colearn-diagram-${++uid}`, code);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (failed) {
    return (
      <div className="text-xs text-gray-500 italic">
        (This diagram could not be displayed.)
      </div>
    );
  }
  return <div ref={ref} className="overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto" />;
}
