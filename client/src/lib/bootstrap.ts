/** Returns whether this browser context may mount Synthia's React root. */
export function shouldMountSynthiaWorkspace(alreadyBootstrapped: boolean | undefined): boolean {
  return !alreadyBootstrapped;
}
