/** Rewrites the classic managed-preview script to a deterministic cache-busting revision. */
export function revisionedClassicPreviewScript(document: string, revision: string): string {
  return document.replace(
    /src="\/synthia-preview\.js(?:\?[^\"]*)?"/,
    `src="/synthia-preview.js?v=${encodeURIComponent(revision)}"`,
  );
}
