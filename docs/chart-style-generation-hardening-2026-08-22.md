# Chart Style-Generation Hardening

**Date:** 2026-08-22  
**Scope:** The reusable chart component’s dynamically generated `<style>` element.

## Finding

The reusable chart component generates CSS custom properties from chart configuration and inserts the resulting text into a style element. Although no product route currently consumes the component, unconstrained future configuration keys, chart IDs, or color values could otherwise alter the generated selector or CSS declaration structure.

## Implemented Boundary

The dynamic CSS generator now lives in a small, testable module that normalizes chart identifiers, restricts custom-property keys, and accepts only a bounded color-value character set. It rejects CSS fetch-capable and structure-breaking tokens before they can enter style text.

| Input | Allowed behavior | Rejected behavior |
|---|---|---|
| Chart identifier | Retains alphanumeric, underscore, and hyphen characters. | Attribute-selector punctuation, markup, whitespace, and CSS structure. |
| Configuration key | Becomes `--color-<key>` only when it is a bounded identifier. | Semicolons, braces, spaces, and other declaration-breaking key characters. |
| Color value | Supports bounded literal, custom-property, and functional color syntax used by the design system. | `url(...)`, `expression(...)`, `behavior(...)`, `@import`, declaration delimiters, and values over 200 characters. |
| Empty or unsafe style text | Renders no style element. | Partial or malformed generated CSS. |

The existing chart API still supports defined color and themed color configuration. This change does not render user-supplied markup, fetch URLs, alter task data, or activate any external capability.

## Validation

`server/chartStyleHardening.test.ts` exercises identifier normalization, allowed color syntax, URL/import/declaration rejection, and generated CSS omission for unsafe keys or values.

| Check | Result |
|---|---|
| `pnpm check` | Passed. |
| Focused chart-style regression | Passed: 3 assertions. |
| `pnpm test` | Passed: 47 test files and 221 assertions; 16 opt-in tests intentionally skipped. |
| `pnpm build` | Passed. Existing bundle-size advisories remain visible and unrelated to this UI-component safety boundary. |

No task, model, media, browser agent, sandbox, storage, connector authorization, scheduled workflow, or external provider workload was started during the hardening or validation.
