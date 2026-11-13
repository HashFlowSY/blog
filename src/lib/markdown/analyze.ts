import { normalizeText } from "./model";

import type { DocumentHeading } from "./model";
import type { Element, Nodes, Root } from "hast";

const headings = /^h[1-6]$/u;
const boundaries = /^(?:h[1-6]|p|li|ul|ol|blockquote|table|tr|section|hr)$/u;
const wordSegments = new Intl.Segmenter("zh-CN", { granularity: "word" });
const letter = /[\p{Letter}\p{Letter_Number}]/u;
const eastAsianScript =
  /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}\p{Script_Extensions=Bopomofo}]/u;

function omitted(node: Element): boolean {
  const { properties } = node;
  const classes = properties["className"];
  return (
    "dataFootnoteRef" in properties ||
    "dataFootnoteBackref" in properties ||
    (Array.isArray(classes) && classes.includes("sr-only"))
  );
}

function inlineText(node: Nodes): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element" || omitted(node)) return "";
  if (node.tagName === "br") return " ";
  if (node.tagName === "img" && typeof node.properties["alt"] === "string") {
    return node.properties["alt"];
  }
  return node.children.map(inlineText).join("");
}

function markGlossary(table: Element) {
  const head = table.children.find(
    (node) => node.type === "element" && node.tagName === "thead",
  );
  if (head?.type !== "element") return;
  const row = head.children.find(
    (node) => node.type === "element" && node.tagName === "tr",
  );
  if (row?.type !== "element") return;
  const cells = row.children.filter(
    (node): node is Element => node.type === "element" && node.tagName === "th",
  );
  const [term, explanation] = cells;
  if (cells.length !== 2 || !term || !explanation) return;
  if (
    normalizeText(inlineText(term)) !== "术语" ||
    normalizeText(inlineText(explanation)) !== "说明"
  )
    return;
  table.properties["className"] = ["markdown-glossary"];
  term.properties["scope"] = "col";
  explanation.properties["scope"] = "col";
}

function labelTask(node: Element) {
  const first = node.children.find(
    (child) =>
      child.type === "element" || (child.type === "text" && child.value.trim()),
  );
  const children =
    first?.type === "element" && first.tagName === "p"
      ? first.children
      : node.children;
  const checkbox = children.find(
    (child) => child.type === "element" && child.tagName === "input",
  );
  if (checkbox?.type !== "element") return;
  const label = normalizeText(
    children
      .map((child) =>
        child.type === "element" &&
        (child.tagName === "ul" || child.tagName === "ol")
          ? ""
          : inlineText(child),
      )
      .join(""),
  );
  checkbox.properties["ariaLabel"] = label || "任务";
}

export function analyzeDocument(tree: Root) {
  const outline: DocumentHeading[] = [];
  const searchBlocks: string[] = [];
  let fragments: string[] = [];
  let cjkCharacters = 0;
  let otherWords = 0;

  function flushProse() {
    const text = normalizeText(fragments.join(""));
    fragments = [];
    if (!text) return;
    searchBlocks.push(text);

    const otherText = Array.from(text.normalize("NFC"), (character) => {
      if (letter.test(character) && eastAsianScript.test(character)) {
        cjkCharacters++;
        return " ";
      }
      return character;
    }).join("");
    for (const part of wordSegments.segment(otherText)) {
      if (part.isWordLike) otherWords++;
    }
  }

  function walk(node: Nodes, inFootnotes: boolean) {
    if (node.type === "text") {
      fragments.push(node.value);
      return;
    }
    if (node.type !== "element" || omitted(node)) return;

    const { tagName, properties } = node;
    const insideNotes = inFootnotes || "dataFootnotes" in properties;
    if (tagName === "pre") {
      flushProse();
      const source = node.data?.fence?.source;
      if (source) {
        const text = normalizeText(source);
        if (text) searchBlocks.push(text);
      }
      return;
    }
    if (tagName === "br") {
      fragments.push(" ");
      return;
    }
    if (tagName === "table") markGlossary(node);
    if (tagName === "li") labelTask(node);

    const id = properties["id"];
    if (headings.test(tagName) && typeof id === "string") {
      properties["tabIndex"] = -1;
      const level =
        tagName === "h1"
          ? 1
          : tagName === "h2"
            ? 2
            : tagName === "h3"
              ? 3
              : null;
      if (level !== null && !insideNotes) {
        outline.push({ id, text: normalizeText(inlineText(node)), level });
      }
    }

    const boundary = boundaries.test(tagName);
    if (boundary) flushProse();
    for (const child of node.children) walk(child, insideNotes);
    if (boundary) flushProse();
    if (tagName === "th" || tagName === "td") fragments.push(" ");
  }

  for (const child of tree.children) walk(child, false);
  flushProse();
  return {
    outline,
    searchBlocks,
    readingStats: {
      cjkCharacters,
      otherWords,
      // 500 characters or 200 words per minute, with one rounding step.
      minutes: Math.ceil((2 * cjkCharacters + 5 * otherWords) / 1000),
    },
  };
}
