/**
 * Serializes structured data without allowing user-controlled values to close
 * the surrounding application/ld+json script element.
 */
export function serializeJsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
