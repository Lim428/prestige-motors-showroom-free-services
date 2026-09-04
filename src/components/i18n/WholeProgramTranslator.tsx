"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { isAppLocale, type AppLocale } from "@/i18n/config";
import { instantTranslations } from "@/i18n/instant-translations";
import { sourceCatalog } from "@/i18n/source-catalog.generated";

const translatableAttributes = ["aria-label", "placeholder", "title", "alt"] as const;
const sourceSet = new Set<string>(sourceCatalog);
const templateMatchers = sourceCatalog
  .filter((source) => source.includes("{value}"))
  .map((source) => ({ source, expression: templateExpression(source) }));

type TranslationMatch = {
  key: string;
  captures: string[];
};

type TranslationResponse = {
  data?: {
    translations?: string[];
  };
};

export function WholeProgramTranslator() {
  const activeLocale = useLocale();

  useEffect(() => {
    if (!isAppLocale(activeLocale) || activeLocale === "en") {
      notifyTranslationStatus(false);
      return;
    }

    const locale = activeLocale;
    const cache = loadCache(locale);
    const instant = instantTranslations[locale] ?? {};
    const pending = new Set<string>();
    const failed = new Set<string>();
    const textSources = new Map<Text, string>();
    const attributeSources = new Map<Element, Map<string, string>>();
    const controller = new AbortController();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let isFlushing = false;
    let stopped = false;

    for (const [source, translation] of Object.entries(instant)) {
      cache.set(source, translation);
    }

    function translatedSource(source: string) {
      const match = matchSource(source);
      if (!match) return null;

      const translatedTemplate = cache.get(match.key);
      if (!translatedTemplate) return null;

      return fillTemplate(translatedTemplate, match.captures);
    }

    function queueSource(source: string) {
      const match = matchSource(source);
      if (!match || cache.has(match.key) || failed.has(match.key)) return;

      pending.add(match.key);
      if (!flushTimer && !isFlushing) {
        flushTimer = setTimeout(() => {
          flushTimer = undefined;
          void flushTranslations();
        }, 80);
      }
    }

    function applyTextNode(node: Text) {
      if (!node.isConnected || shouldSkip(node.parentElement)) return;

      const current = normalize(node.data);
      if (!current) return;

      let source = textSources.get(node);

      if (source) {
        const expected = translatedSource(source);
        if (current !== normalize(source) && current !== normalize(expected ?? "")) {
          if (!matchSource(current)) return;
          source = current;
          textSources.set(node, source);
        }
      } else {
        if (!matchSource(current)) return;
        source = current;
        textSources.set(node, source);
      }

      const translated = translatedSource(source);
      if (!translated) {
        queueSource(source);
        return;
      }

      if (current !== normalize(translated)) {
        node.data = preserveOuterWhitespace(node.data, translated);
      }
    }

    function applyAttribute(element: Element, attribute: string) {
      if (shouldSkip(element)) return;

      const currentValue = element.getAttribute(attribute);
      if (!currentValue) return;

      const current = normalize(currentValue);
      let sources = attributeSources.get(element);
      let source = sources?.get(attribute);

      if (source) {
        const expected = translatedSource(source);
        if (current !== normalize(source) && current !== normalize(expected ?? "")) {
          if (!matchSource(current)) return;
          source = current;
          sources?.set(attribute, source);
        }
      } else {
        if (!matchSource(current)) return;
        sources ??= new Map<string, string>();
        source = current;
        sources.set(attribute, source);
        attributeSources.set(element, sources);
      }

      const translated = translatedSource(source);
      if (!translated) {
        queueSource(source);
        return;
      }

      if (current !== normalize(translated)) {
        element.setAttribute(attribute, translated);
      }
    }

    function scan(root: Node) {
      if (root.nodeType === Node.TEXT_NODE) {
        applyTextNode(root as Text);
        return;
      }

      if (!(root instanceof Element) && root !== document.body) return;

      if (root instanceof Element) {
        for (const attribute of translatableAttributes) applyAttribute(root, attribute);
      }

      const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let textNode = textWalker.nextNode();
      while (textNode) {
        applyTextNode(textNode as Text);
        textNode = textWalker.nextNode();
      }

      if (root instanceof Element || root === document.body) {
        for (const element of (root as Element).querySelectorAll("*")) {
          for (const attribute of translatableAttributes) applyAttribute(element, attribute);
        }
      }
    }

    function applyTrackedSources() {
      for (const node of textSources.keys()) {
        applyTextNode(node);
      }

      for (const [element, attributes] of attributeSources) {
        for (const attribute of attributes.keys()) {
          applyAttribute(element, attribute);
        }
      }
    }

    async function flushTranslations() {
      if (isFlushing || stopped || pending.size === 0) return;

      isFlushing = true;
      notifyTranslationStatus(true);

      try {
        while (!stopped && pending.size > 0) {
          const batch = takeBatch(pending);
          const response = await fetch("/api/translations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale, texts: batch }),
            cache: "no-store",
            signal: controller.signal
          });

          if (!response.ok) {
            batch.forEach((source) => failed.add(source));
            continue;
          }

          const payload = (await response.json()) as TranslationResponse;
          const translations = payload.data?.translations;

          if (!translations || translations.length !== batch.length) {
            batch.forEach((source) => failed.add(source));
            continue;
          }

          batch.forEach((source, index) => {
            const translation = translations[index]?.trim();
            if (translation) cache.set(source, translation);
          });
          saveCache(locale, cache);
          applyTrackedSources();
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          pending.forEach((source) => failed.add(source));
        }
      } finally {
        isFlushing = false;
        notifyTranslationStatus(false);
      }
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          applyTextNode(mutation.target as Text);
        } else if (mutation.type === "attributes" && mutation.target instanceof Element) {
          if (mutation.attributeName) applyAttribute(mutation.target, mutation.attributeName);
        } else {
          mutation.addedNodes.forEach(scan);
        }
      }
    });

    scan(document.body);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...translatableAttributes],
      characterData: true,
      childList: true,
      subtree: true
    });

    return () => {
      stopped = true;
      controller.abort();
      observer.disconnect();
      if (flushTimer) clearTimeout(flushTimer);
      notifyTranslationStatus(false);

      for (const [node, source] of textSources) {
        if (node.isConnected && normalize(node.data) === normalize(translatedSource(source) ?? "")) {
          node.data = preserveOuterWhitespace(node.data, source);
        }
      }

      for (const [element, sources] of attributeSources) {
        if (!element.isConnected) continue;
        for (const [attribute, source] of sources) {
          if (
            normalize(element.getAttribute(attribute) ?? "") ===
            normalize(translatedSource(source) ?? "")
          ) {
            element.setAttribute(attribute, source);
          }
        }
      }
    };
  }, [activeLocale]);

  return null;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function preserveOuterWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function shouldSkip(element: Element | null) {
  return Boolean(
    element?.closest(
      "script, style, noscript, code, pre, textarea, [data-no-translate], [translate='no'], [contenteditable='true']"
    )
  );
}

function matchSource(source: string): TranslationMatch | null {
  const normalized = normalize(source);
  if (sourceSet.has(normalized)) return { key: normalized, captures: [] };

  for (const template of templateMatchers) {
    const match = template.expression.exec(normalized);
    if (match) return { key: template.source, captures: match.slice(1) };
  }

  return null;
}

function templateExpression(template: string) {
  const expression = template
    .split("{value}")
    .map(escapeExpression)
    .join("(.+?)");
  return new RegExp(`^${expression}$`);
}

function escapeExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fillTemplate(template: string, captures: string[]) {
  let index = 0;
  return template.replace(/\{value\}/g, () => captures[index++] ?? "{value}");
}

function takeBatch(pending: Set<string>) {
  const batch: string[] = [];
  let characters = 0;

  for (const source of pending) {
    if (batch.length >= 60 || characters + source.length > 9_500) break;
    pending.delete(source);
    batch.push(source);
    characters += source.length;
  }

  return batch;
}

function cacheKey(locale: AppLocale) {
  return `prestige-interface-translations:${locale}:v1-${sourceCatalog.length}`;
}

function loadCache(locale: AppLocale) {
  const cache = new Map<string, string>();

  try {
    const saved = window.localStorage.getItem(cacheKey(locale));
    if (!saved) return cache;

    const values = JSON.parse(saved) as Record<string, string>;
    for (const [source, translation] of Object.entries(values)) {
      if (
        sourceSet.has(source) &&
        typeof translation === "string" &&
        placeholderCount(source) === placeholderCount(translation)
      ) {
        cache.set(source, translation);
      }
    }
  } catch {
    // A blocked or corrupt cache should never stop the showroom from rendering.
  }

  return cache;
}

function placeholderCount(value: string) {
  return value.match(/\{value\}/g)?.length ?? 0;
}

function saveCache(locale: AppLocale, cache: Map<string, string>) {
  try {
    window.localStorage.setItem(cacheKey(locale), JSON.stringify(Object.fromEntries(cache)));
  } catch {
    // Translation remains available for this page even when storage is unavailable.
  }
}

function notifyTranslationStatus(active: boolean) {
  window.dispatchEvent(
    new CustomEvent("prestige:translation-status", { detail: { active } })
  );
}
