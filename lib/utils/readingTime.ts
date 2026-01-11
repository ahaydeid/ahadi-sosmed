/**
 * Calculate estimated reading time for a text
 * @param text - HTML or plain text content
 * @returns Reading time in minutes
 */
export function calculateReadingTime(text: string): number {
  // Remove HTML tags
  const plainText = text.replace(/<[^>]*>/g, '');
  
  // Count words (split by whitespace)
  const words = plainText.trim().split(/\s+/).length;
  
  // Average reading speed: 200 words per minute
  const minutes = Math.ceil(words / 200);
  
  // Minimum 1 minute
  return Math.max(1, minutes);
}

/**
 * Format reading time for display
 * @param text - HTML or plain text content
 * @returns Formatted string like "5 min read"
 */
export function formatReadingTime(text: string): string {
  const minutes = calculateReadingTime(text);
  return `${minutes} min read`;
}
