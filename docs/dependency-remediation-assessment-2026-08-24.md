# Dependency Remediation Assessment — 2026-08-24

## Scope

This assessment records the remaining production dependency advisories after the targeted `form-data` lockfile remediation. It contains no credentials, user content, task prompts, or provider responses.

## Verified local result

The application lockfile now resolves the affected `@hopx-ai/sdk` and `@hyperbrowser/sdk` paths to `form-data` `4.0.6`, removing the previously reported production `form-data` advisory. The production audit now reports only the two remaining dependency families below.

| Dependency path | Remaining advisory class | Upstream remediation status | Safe next action |
|---|---|---|---|
| `exceljs@4.4.0 → uuid@8.3.2` | Moderate integrity/robustness risk | No upstream ExcelJS release with a patched UUID dependency was identified | Keep the dependency unchanged until ExcelJS publishes a compatible upgrade; retain the verified export/import compatibility contract. |
| `pptxgenjs@4.0.1 → image-size@1.2.1` | High denial-of-service risks when processing crafted images | No patched `image-size` version is currently offered by the advisory | Isolate PPTX image processing and add input format/size rejection rather than force an unsupported dependency override. |

## Upstream findings

The ExcelJS maintainers’ issue tracker confirms that the latest `4.4.0` release still declares `uuid` `^8.3.0`; the corresponding request asks upstream to update it. A community discussion suggests a scoped override, but it also identifies possible compatibility implications from newer ESM-only UUID releases. This repository must therefore validate any scoped override against its own spreadsheet workflow before adopting it. [1] [2]

The currently published PptxGenJS package page identifies `4.0.1` as the latest release. The current advisory gives no patched `image-size` release, so forcing a transitive version without compatibility evidence would not be an acceptable production remediation. [3]

## Current spreadsheet-export exposure boundary

The verified server-side workbook export/import contract exercises the real ExcelJS write and read path. Inspection of the installed ExcelJS source found a single UUID library call site, and it imports UUID `v4` only; the reported advisory affects UUID `v3`, `v5`, and `v6` only when a caller supplies an external output buffer. The current Synthia spreadsheet workflow does not expose that affected API shape. A scoped override to newer UUID releases was evaluated but did not resolve through the package's compatible dependency range, and forcing an ESM-only version into ExcelJS would create unnecessary runtime compatibility risk. The override is therefore intentionally absent. This remains a monitored upstream dependency item rather than an application-reachable defect.

## Current presentation-export exposure boundary

The current server-side presentation export creates text, shapes, and tables only. It accepts task metadata and bounded event summaries; it has no `addImage` call and does not decode, fetch, inspect, or embed user-provided image bytes. Therefore, the image-processing advisory is **not reachable through the present task-export workflow**. Any future image-bearing presentation feature must first introduce server-side allowlisted MIME types, byte and pixel limits, bounded decoding, and deterministic rejection tests before it can use an image-processing path.

## References

[1]: https://github.com/exceljs/exceljs/issues/3041 "ExcelJS issue 3041 — UUID dependency security discussion"
[2]: https://github.com/exceljs/exceljs/issues/3055 "ExcelJS issue 3055 — request to update vulnerable UUID dependency"
[3]: https://www.npmjs.com/package/pptxgenjs "PptxGenJS package information"
