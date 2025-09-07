// Extremely small allowlist sanitizer for limited inline strong/emphasis/links/spans classes.
// NOT a full HTML sanitizer; adjust if richer content required.
export function sanitize(html: string): string {
  if (!html) return '';
  // remove script/style tags entirely
  html = html.replace(/<\/(script|style)>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // strip on* event handlers
  html = html.replace(/ on[a-z]+="[^"]*"/gi, '');
  // allow only a subset of tags
  const allowed = /<(\/)?(strong|em|b|i|u|a|span|p|ul|ol|li|br)( [^>]*)?>/gi;
  return html.replace(/<[^>]+>/g, (tag) => allowed.test(tag) ? tag : '');
}
