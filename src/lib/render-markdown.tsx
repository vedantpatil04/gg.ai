/**
 * Lightweight inline markdown renderer (no dangerouslySetInnerHTML).
 * Supports headings (#/##/###), bullet + numbered lists, bold/italic/code
 * spans, and paragraphs. Shared by any surface that displays structured
 * AI output — originally lived only in WorkspacePreview; extracted here so
 * the Intelligence Center assistant can render the same structured
 * responses (headings, lists, tables-of-text) without a duplicate copy.
 */

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p))
          return (
            <strong key={i} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          );
        if (/^\*[^*]+\*$/.test(p))
          return (
            <em key={i} className="italic">
              {p.slice(1, -1)}
            </em>
          );
        if (/^`[^`]+`$/.test(p))
          return (
            <code key={i} className="font-mono text-[0.85em] bg-muted/60 px-1 py-0.5 rounded">
              {p.slice(1, -1)}
            </code>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let key = 0;

  const flush = () => {
    if (!listBuf.length) return;
    const items = listBuf.map((item, i) => (
      <li key={i} className="ml-4">
        {renderInline(item)}
      </li>
    ));
    nodes.push(
      listType === "ol" ? (
        <ol key={key++} className="list-decimal space-y-0.5 my-1.5">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="list-disc space-y-0.5 my-1.5">
          {items}
        </ul>
      ),
    );
    listBuf = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^### /.test(line)) {
      flush();
      nodes.push(
        <h4 key={key++} className="font-semibold text-foreground text-sm mt-3 mb-0.5">
          {line.slice(4)}
        </h4>,
      );
      continue;
    }
    if (/^## /.test(line)) {
      flush();
      nodes.push(
        <h3 key={key++} className="font-semibold text-foreground text-sm mt-3 mb-0.5">
          {line.slice(3)}
        </h3>,
      );
      continue;
    }
    if (/^# /.test(line)) {
      flush();
      nodes.push(
        <h2 key={key++} className="font-bold text-foreground mt-3 mb-1">
          {line.slice(2)}
        </h2>,
      );
      continue;
    }
    const ul = line.match(/^[-*•] (.+)/);
    if (ul) {
      if (listType === "ol") flush();
      listType = "ul";
      listBuf.push(ul[1]);
      continue;
    }
    const ol = line.match(/^\d+\. (.+)/);
    if (ol) {
      if (listType === "ul") flush();
      listType = "ol";
      listBuf.push(ol[1]);
      continue;
    }
    if (!line.trim()) {
      flush();
      nodes.push(<br key={key++} />);
      continue;
    }
    flush();
    nodes.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(line)}
      </p>,
    );
  }
  flush();
  return <>{nodes}</>;
}
