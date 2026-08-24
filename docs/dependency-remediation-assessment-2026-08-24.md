# Dependency Remediation Assessment — 2026-08-24

## Scope

This assessment records the remaining production dependency advisories after the targeted `form-data` lockfile remediation. It contains no credentials, user content, task prompts, or provider responses.

## Verified local result

The application lockfile now resolves the affected `@hopx-ai/sdk` and `@hyperbrowser/sdk` paths to `form-data` `4.0.6`, removing the previously reported production `form-data` advisory. The production audit now reports only the two remaining dependency families below.

| Dependency path | Remaining advisory class | Upstream remediation status | Safe next action |
|---|---|---|---|
| `exceljs@4.4.0 → uuid@8.3.2` | Moderate integrity/robustness risk | No upstream ExcelJS release with a patched UUID dependency was identified | Evaluate a scoped UUID override with an Excel export/import compatibility suite before enabling it. |
| `pptxgenjs@4.0.1 → image-size@1.2.1` | High denial-of-service risks when processing crafted images | No patched `image-size` version is currently offered by the advisory | Isolate PPTX image processing and add input format/size rejection rather than force an unsupported dependency override. |

## Upstream findings

The ExcelJS maintainers’ issue tracker confirms that the latest `4.4.0` release still declares `uuid` `^8.3.0`; the corresponding request asks upstream to update it. A community discussion suggests a scoped override, but it also identifies possible compatibility implications from newer ESM-only UUID releases. This repository must therefore validate any scoped override against its own spreadsheet workflow before adopting it. [1] [2]

The currently published PptxGenJS package page identifies `4.0.1` as the latest release. The current advisory gives no patched `image-size` release, so forcing a transitive version without compatibility evidence would not be an acceptable production remediation. [3]

## References

[1]: https://github.com/exceljs/exceljs/issues/3041 "ExcelJS issue 3041 — UUID dependency security discussion"
[2]: https://github.com/exceljs/exceljs/issues/3055 "ExcelJS issue 3055 — request to update vulnerable UUID dependency"
[3]: https://www.npmjs.com/package/pptxgenjs "PptxGenJS package information"
