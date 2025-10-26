/**
 * Membersihkan string Markdown dari sintaks umum (**, #, >, [], ()).
 * Digunakan untuk pratinjau (PostCard) agar teks polos terbaca baik.
 * @param markdownString Konten Markdown mentah.
 * @returns String teks yang sudah bersih dari sintaks Markdown.
 */
export function cleanMarkdownForPreview(markdownString: string): string {
  if (!markdownString) return "";

  let cleanText = markdownString;

  // 1. Hapus link Markdown: [teks](url)
  cleanText = cleanText.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // 2. Hapus gambar Markdown: ![teks](url)
  cleanText = cleanText.replace(/!\[([^\]]+)\]\([^\)]+\)/g, "");

  // 3. Hapus sintaks tebal/miring/kode: **, *, _, `
  // Catatan: Tanda ** akan menjadi * di database Anda jika problem SimpleMDE belum 100% fix, jadi kita hapus keduanya.
  cleanText = cleanText.replace(/(\*\*|\*|_|`)/g, "");

  // 4. Hapus heading (#), quote (>) dan list (- atau 1.)
  cleanText = cleanText.replace(/^(#+\s*|>\s*|-\s*|\d+\.\s*)/gm, "");

  // 5. Hapus garis horizontal (---)
  cleanText = cleanText.replace(/^-{3,}\s*$/gm, "");

  // 6. Hapus newlines berlebihan (ganti >2 newlines menjadi 1 spasi)
  cleanText = cleanText.replace(/\n{2,}/g, " ");

  return cleanText.trim();
}
