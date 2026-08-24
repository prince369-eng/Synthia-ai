export function automaticModelRoutingStatus(input: {
  loading: boolean;
  manualModelSelected: boolean;
  includesVisualAttachment: boolean;
  involvesCode: boolean;
  models: Array<{ capabilities: string[] }>;
}) {
  if (input.manualModelSelected) return "Manual model selected. Automatic switching is off for this task.";
  if (input.loading) return "Automatic routing is checking compatible models.";
  if (!input.models.length) return "Automatic routing needs at least one configured model before this task can start.";
  if (input.includesVisualAttachment && !input.models.some(model => model.capabilities.includes("vision"))) {
    return "Automatic routing needs a vision-capable model for this image attachment.";
  }
  if (input.includesVisualAttachment) return "Automatic routing starts with a compatible vision model and switches safely if a route is unavailable.";
  if (input.involvesCode) return "Automatic routing prefers a code-capable model and switches safely if a route is unavailable.";
  return "Automatic routing chooses the best compatible model and safely tries another configured route if needed.";
}
