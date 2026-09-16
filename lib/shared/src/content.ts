import type { RichContentDoc, RichContentNode } from "./types";

/**
 * Converts a plain string or markdown snippet into a valid ProseMirror / TipTap doc AST.
 */
export function textToProseMirrorDoc(text: string): RichContentDoc {
  if (!text || text.trim().length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const lines = text.split(/\r?\n/);
  const content: RichContentNode[] = lines.map((line) => {
    if (!line) {
      return { type: "paragraph" };
    }
    return {
      type: "paragraph",
      content: [{ type: "text", text: line }],
    };
  });

  return {
    type: "doc",
    content,
  };
}

/**
 * Extracts plain text from a ProseMirror / TipTap doc AST.
 */
export function proseMirrorDocToText(doc?: RichContentDoc | null): string {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return "";
  }

  function extractNodeText(node: RichContentNode): string {
    if (node.type === "text" && node.text) {
      return node.text;
    }
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractNodeText).join("");
    }
    return "";
  }

  return doc.content.map(extractNodeText).join("\n").trim();
}
