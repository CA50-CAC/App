/**
 * A tiny i18n layer. English only for now, but every string already goes
 * through t(), so translating later doesn't mean hunting through components.
 */
import { en, type MessageKey } from "./en";

export type { MessageKey };

const messages: Record<MessageKey, string> = en;

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = messages[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
