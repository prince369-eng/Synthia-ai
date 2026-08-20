// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileMenu } from "../client/src/components/SynthiaAppShell";
import { AuthEntryActions } from "../client/src/components/SynthiaAppShell";
import { modelCapabilityLabel, PreferenceSwitch, ServiceConnectionCard, SettingsAccount, SettingsCloseButton, SettingsGeneral, SettingsModels, SettingsPersonalization, SettingsSectionNav, SettingsUsage } from "../client/src/pages/Settings";
import { TaskMediaMenu, TaskOverflowMenu, WorkspaceReturnNavigation } from "../client/src/pages/TaskWorkspace";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tasks: { get: { invalidate: vi.fn() }, list: { invalidate: vi.fn() } } }),
    catalog: {
      media: { useQuery: () => ({ isLoading: false, data: { image: { configured: false, models: [], reason: "Image provider configuration is required." }, video: { configured: false, models: [], reason: "Video provider configuration is required." } } }) },
    },
    tasks: {
      rename: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      setPinned: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      setFavorite: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      setArchived: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      generateMedia: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false }) },
    },
  },
}));

afterEach(cleanup);

describe("Synthia navigation behavior", () => {
  it("exposes distinct sign-in, account-creation, and Google identity entry actions", async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn();
    const onSignUp = vi.fn();
    const onGoogle = vi.fn();
    render(<AuthEntryActions onSignIn={onSignIn} onSignUp={onSignUp} onGoogle={onGoogle} />);

    await user.click(screen.getByRole("button", { name: "Sign in to Synthia AI" }));
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    await user.click(screen.getByRole("button", { name: "Create an account" }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onGoogle).toHaveBeenCalledTimes(1);
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });

  it("opens the compact profile menu with all selected destinations and sign-out", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onLogout = vi.fn();
    render(<ProfileMenu name="Synthia User" email="user@example.test" onNavigate={onNavigate} onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getAllByText("user@example.test")).toHaveLength(2);
    expect(screen.getByRole("menuitem", { name: "Credits" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Account" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Personalization" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Homepage" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Docs" })).toBeTruthy();
    await user.click(screen.getByRole("menuitem", { name: "Credits" }));
    expect(onNavigate).toHaveBeenCalledWith("/settings/billing");

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("navigates grouped settings controls to their expected routes", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SettingsSectionNav section="general" onNavigate={onNavigate} />);

    expect(screen.getByText("Account")).toBeTruthy();
    expect(screen.getByText("Workspace")).toBeTruthy();
    expect(screen.getByText("Agent capabilities")).toBeTruthy();
    expect(screen.getByText("Data & delivery")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Usage & billing" }));
    expect(onNavigate).toHaveBeenCalledWith("/settings/usage");
  });

  it("filters the Settings section rail without removing route-backed sections", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SettingsSectionNav section="general" onNavigate={onNavigate} />);

    await user.type(screen.getByRole("textbox", { name: "Search settings" }), "developer");
    expect(screen.getByRole("button", { name: "Developer" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "General" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Developer" }));
    expect(onNavigate).toHaveBeenCalledWith("/settings/developer");
  });

  it("provides an explicit accessible Settings close control that returns to tasks", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SettingsCloseButton onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close settings and return to tasks" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exposes accessible preference controls for Settings choices", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PreferenceSwitch label="Enable keyboard shortcuts" description="Global shortcuts are active." enabled onChange={onChange} />);

    const control = screen.getByRole("switch", { name: "Enable keyboard shortcuts" });
    expect(control.getAttribute("aria-checked")).toBe("true");
    await user.click(control);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("keeps local appearance available while disabling server-persisted task defaults when preferences are unavailable", () => {
    render(<SettingsGeneral preferences={{}} theme="dark" onToggleTheme={vi.fn()} onSave={vi.fn()} saving={false} persistenceAvailable={false} />);

    expect(screen.getByRole("switch", { name: "Dark appearance" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Ask before risky" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("switch", { name: "Web research" }).hasAttribute("disabled")).toBe(true);
  });

  it("renders General review and capability controls inside bounded grid cells", () => {
    render(<SettingsGeneral preferences={{}} theme="dark" onToggleTheme={vi.fn()} onSave={vi.fn()} saving={false} persistenceAvailable />);

    const reviewGrid = screen.getByRole("button", { name: "Ask before risky" }).parentElement;
    expect(reviewGrid?.className).toContain("grid-cols-2");
    expect(reviewGrid?.className).toContain("gap-2");

    const researchSwitch = screen.getByRole("switch", { name: "Web research" });
    const researchCell = researchSwitch.closest("[data-testid='settings-capability-card']");
    expect(researchCell?.className).toContain("min-w-0");
    expect(within(researchCell as HTMLElement).getByRole("switch", { name: "Web research" }).className).toContain("shrink-0");
    expect(researchSwitch.parentElement?.className).toContain("w-full");
    expect(screen.getAllByTestId("settings-capability-card")).toHaveLength(3);
  });

  it("exposes the managed account portal only through the explicit Account Settings action", async () => {
    const user = userEvent.setup();
    const onManageAccount = vi.fn();
    render(<SettingsAccount user={{ id: 1, name: "Synthia User", email: "user@example.test" }} hasCompletedOnboarding onManageAccount={onManageAccount} />);

    await user.click(screen.getByRole("button", { name: "Manage account" }));
    expect(onManageAccount).toHaveBeenCalledTimes(1);
  });

  it("renders real usage totals and durable ledger event context when available", () => {
    render(<SettingsUsage loading={false} error={false} usage={{ creditsBalance: 72, creditsConsumed: 4.25, taskCount: 3, recentEvents: [{ id: "usage-1", taskTitle: "Research rollout", creditsDelta: 1.5, reason: "orchestrator_model_tokens", createdAt: "2026-08-19T08:00:00.000Z" }] }} />);

    expect(screen.getByText("72")).toBeTruthy();
    expect(screen.getByText("4.25")).toBeTruthy();
    expect(screen.getByText("Research rollout")).toBeTruthy();
    expect(screen.getByText(/orchestrator model tokens/i)).toBeTruthy();
  });

  it("renders working dashboard and library return controls in the Agent’s Computer header", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<WorkspaceReturnNavigation onNavigate={onNavigate} />);

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    await user.click(screen.getByRole("button", { name: "Library" }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, "/");
    expect(onNavigate).toHaveBeenNthCalledWith(2, "/library");
  });

  it("renders explicit integration connection labels without exposing secret values", () => {
    render(<><ServiceConnectionCard item={{ label: "Google", status: "connected" }} /><ServiceConnectionCard item={{ label: "GitHub", status: "ready_to_connect" }} /><ServiceConnectionCard item={{ label: "Slack", status: "missing_credentials", requiredEnvironment: ["SLACK_OAUTH_CLIENT_ID", "SLACK_OAUTH_CLIENT_SECRET"] }} /></>);

    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("Ready to connect")).toBeTruthy();
    expect(screen.getByText("Missing credentials")).toBeTruthy();
    expect(screen.getByText("SLACK_OAUTH_CLIENT_ID · SLACK_OAUTH_CLIENT_SECRET")).toBeTruthy();
  });

  it("uses capability labels that distinguish real vision-capable configured models", () => {
    expect(modelCapabilityLabel({ capabilities: ["text"] })).toBe("Text");
    expect(modelCapabilityLabel({ capabilities: ["text", "vision"] })).toBe("Text + vision");
  });

  it("identifies configured AIHubMix and Agnes free-tier choices by their exact model IDs", () => {
    render(<SettingsModels readiness={[{ category: "model", configured: true }]} loading={false} error={false} models={[
      { id: "aihubmix:glm-5.2-free", provider: "aihubmix", model: "glm-5.2-free", label: "Primary", capabilities: ["text"] },
      { id: "agnes:agnes-2.0-flash", provider: "agnes", model: "agnes-2.0-flash", label: "Configured", capabilities: ["text"] },
    ]} />);

    expect(screen.getByText("glm-5.2-free")).toBeTruthy();
    expect(screen.getByText("agnes-2.0-flash")).toBeTruthy();
    expect(screen.getAllByText("Text", { exact: true })).toHaveLength(2);
    expect(screen.queryByText("AIHubMix · Primary")).toBeNull();
    expect(screen.queryByText("Agnes AI · Configured")).toBeNull();
  });

  it("renders an editable user-controlled personality graph with explicit session and long-term memory controls", async () => {
    const user = userEvent.setup();
    const onAddMemory = vi.fn();
    const onClearSession = vi.fn();
    render(<SettingsPersonalization profile={{ dimensions: { warmth: 60, directness: 55, detail: 65, creativity: 70, initiative: 50 }, enabled: true, sessionMemoryEnabled: true, longTermMemoryEnabled: true, updatedAt: null }} memories={[{ id: "memory-1", memoryType: "long_term", content: "Prefer concise technical explanations.", enabled: true, expiresAt: null, updatedAt: new Date() }, { id: "memory-2", memoryType: "session", content: "Focus on the current release.", enabled: true, expiresAt: new Date(Date.now() + 86_400_000), updatedAt: new Date() }]} loading={false} error={false} onSaveProfile={vi.fn()} onAddMemory={onAddMemory} onUpdateMemory={vi.fn()} onDeleteMemory={vi.fn()} onClearSession={onClearSession} saving={false} />);

    expect(screen.getByTestId("personality-graph")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Personality web graph" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Warmth preference" })).toBeTruthy();
    expect(screen.getByText("Prefer concise technical explanations.")).toBeTruthy();
    expect(screen.getByText("Focus on the current release.")).toBeTruthy();
    expect(screen.getByText(/not an inferred personality score/i)).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "New memory" }), "Use TypeScript by default.");
    await user.click(screen.getByRole("button", { name: /Add note/i }));
    expect(onAddMemory).toHaveBeenCalledWith({ memoryType: "long_term", content: "Use TypeScript by default." });
    await user.click(screen.getByRole("button", { name: "Clear session" }));
    expect(onClearSession).toHaveBeenCalledTimes(1);
  });

  it("exposes scoped task actions and keeps scheduling visibly unavailable while requiring delete confirmation", async () => {
    const user = userEvent.setup();
    render(<TaskOverflowMenu task={{ title: "Research rollout", isPinned: false, isFavorite: false, isArchived: false }} taskId="a3f7b5e2-4218-41b1-98d4-dfbdde95c553" onDeleted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Open task actions" }));
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Pin" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Add to favorites" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Schedule a task/i }).hasAttribute("data-disabled")).toBe(true);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.getByRole("alertdialog", { name: "Delete task" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete task" })).toBeTruthy();
  });

  it("keeps task-owned image and video generation visibly unavailable until provider readiness is real", async () => {
    const user = userEvent.setup();
    render(<TaskMediaMenu taskId="a3f7b5e2-4218-41b1-98d4-dfbdde95c553" attachments={[]} />);

    await user.click(screen.getByRole("button", { name: "Open media generation" }));
    expect(screen.getByRole("menuitem", { name: /Generate image/i }).hasAttribute("data-disabled")).toBe(true);
    expect(screen.getByRole("menuitem", { name: /Generate video/i }).hasAttribute("data-disabled")).toBe(true);
    expect(screen.getByText(/shown only after secure provider configuration/i)).toBeTruthy();
  });
});
