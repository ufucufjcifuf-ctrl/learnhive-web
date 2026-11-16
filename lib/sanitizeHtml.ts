const DANGEROUS_BLOCK_TAGS =
  /<(script|style|iframe|object|embed|applet|svg|math|form|textarea|select|button|meta|link|base)\b[^>]*>[\s\S]*?<\/\1>/gi;

const DANGEROUS_SELF_CLOSING =
  /<(script|iframe|object|embed|applet|input|meta|link|base|source)\b[^>]*\/?>/gi;

const EVENT_HANDLERS = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const JAVASCRIPT_PROTO = /(href|src|action|formaction)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\2/gi;

const JAVASCRIPT_PROTO_UNQUOTED = /(href|src|action|formaction)\s*=\s*(?:javascript|vbscript|data:text\/html)[^\s>]*/gi;

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  return rawHtml
    .replace(DANGEROUS_BLOCK_TAGS, "")
    .replace(DANGEROUS_SELF_CLOSING, "")
    .replace(EVENT_HANDLERS, "")
    .replace(JAVASCRIPT_PROTO, '$1="#"')
    .replace(JAVASCRIPT_PROTO_UNQUOTED, '$1="#"');
}