export function cleanMarkdownForPreview(markdownString: string): string {
  if (!markdownString) return "";

  let cleanText = markdownString;

  cleanText = cleanText.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  cleanText = cleanText.replace(/!\[([^\]]+)\]\([^\)]+\)/g, "");

  cleanText = cleanText.replace(/(\*\*|\*|_|`)/g, "");

  cleanText = cleanText.replace(/^(#+\s*|>\s*|-\s*|\d+\.\s*)/gm, "");

  cleanText = cleanText.replace(/^-{3,}\s*$/gm, "");

  cleanText = cleanText.replace(/\n{2,}/g, " ");

  return cleanText.trim();
}
