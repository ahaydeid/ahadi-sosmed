/**
 * Menarik URL gambar pertama dari string HTML.
 */
export function extractFirstImage(html: string | null | undefined): string | null {
  if (!html) return null;
  // Robust regex to find src in any position within the img tag
  const match = html.match(/<img[^>]*\s+src=["']([^"'>]+)["']/i);
  return match ? match[1] : null;
}

/**
 * Mengubah HTML menjadi teks polos untuk preview (tanpa tag).
 */
export function extractPreviewText(html: string | null | undefined): string {
  if (!html) return "";
  // Replace block endings with a space to separate paragraphs
  const withSpaces = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ");
  
  // Strip all tags
  const text = withSpaces
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
    
  return text;
}
