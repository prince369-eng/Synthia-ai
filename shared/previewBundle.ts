/** Rewrites the classic managed-preview script to a deterministic cache-busting revision. */
export function revisionedClassicPreviewScript(document: string, revision: string): string {
  const source = `src="/synthia-preview.js?v=${encodeURIComponent(revision)}"`;

  if (/src="\/synthia-preview\.js(?:\?[^\"]*)?"/.test(document)) {
    return document.replace(/src="\/synthia-preview\.js(?:\?[^\"]*)?"/, source);
  }

  return document.replace("</head>", `    <script defer ${source}></script>\n  </head>`);
}
