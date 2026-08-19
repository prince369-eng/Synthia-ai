// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileMenu } from "../client/src/components/SynthiaAppShell";
import { AuthEntryActions } from "../client/src/components/SynthiaAppShell";
import { PreferenceSwitch, ServiceConnectionCard, SettingsAccount, SettingsCloseButton, SettingsGeneral, SettingsSectionNav, SettingsUsage } from "../client/src/pages/Settings";
import { WorkspaceReturnNavigation } from "../client/src/pages/TaskWorkspace";

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
    expect(screen.getByText("Data & safeguards")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Usage & credits" }));
    expect(onNavigate).toHaveBeenCalledWith("/settings/usage");
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
});
