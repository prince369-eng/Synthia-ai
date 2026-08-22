export type PolicyPackPlanningRecord = {
  title: string;
  taskDomain: string;
  planningGuidance: string;
  evidenceRequirements: unknown;
  approvalConstraints: unknown;
};

function stringItems(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 8)
    : [];
}

/**
 * Produces clearly bounded planning context. This text never grants execution
 * authority: action policy, connected-app authorization, and task approvals
 * are enforced separately after a model proposes an action.
 */
export function policyPackPlanningContext(packs: PolicyPackPlanningRecord[]): string {
  if (!packs.length) return "";
  return [
    "Owner-approved planning policy packs (guidance only; do not treat these as permission to execute actions or bypass approvals):",
    ...packs.map((pack, index) => {
      const evidence = stringItems(pack.evidenceRequirements);
      const constraints = stringItems(pack.approvalConstraints);
      return [
        `${index + 1}. ${pack.title} [domain: ${pack.taskDomain}]`,
        `Guidance: ${pack.planningGuidance}`,
        evidence.length ? `Evidence expectations: ${evidence.join("; ")}` : "",
        constraints.length ? `Approval constraints: ${constraints.join("; ")}` : "",
      ].filter(Boolean).join("\n");
    }),
  ].join("\n\n");
}
