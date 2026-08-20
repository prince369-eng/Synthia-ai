// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentNavigationControls, agentTaskStateCopy, runtimeCapabilityCopy } from "../client/src/pages/Agent";
import { ConnectedIntegrationRow, filterPluginServices } from "../client/src/pages/Plugins";
import { ProjectCreateForm, ProjectWorkspaceLink } from "../client/src/pages/Projects";
import { ProfileMenu } from "../client/src/components/SynthiaAppShell";

afterEach(cleanup);

describe("reference-led Synthia sidebar areas", () => {
  it("submits a validated Project creation payload and exposes task-workspace navigation", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onOpen = vi.fn();
    render(<><ProjectCreateForm pending={false} onCreate={onCreate} /><ProjectWorkspaceLink onOpen={onOpen} /></>);

    await user.type(screen.getByRole("textbox", { name: "Project name" }), "Launch plan");
    await user.type(screen.getByRole("textbox", { name: "Project description" }), "Quarterly research");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Open tasks" }));

    expect(onCreate).toHaveBeenCalledWith({ name: "Launch plan", description: "Quarterly research" });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("reports truthful Agent runtime states and preserves both primary navigation actions", async () => {
    const user = userEvent.setup();
    const onCreateTask = vi.fn();
    const onOpenServices = vi.fn();
    render(<AgentNavigationControls onCreateTask={onCreateTask} onOpenServices={onOpenServices} />);

    await user.click(screen.getByRole("button", { name: "Create task" }));
    await user.click(screen.getByRole("button", { name: "Service connections" }));
    expect(onCreateTask).toHaveBeenCalledTimes(1);
    expect(onOpenServices).toHaveBeenCalledTimes(1);
    expect(agentTaskStateCopy({ isLoading: false, isError: true, activeCount: 0 })).toContain("data store is configured");
    expect(runtimeCapabilityCopy({ isLoading: false, configuredModels: 1, configuredSearch: 2, configuredSandboxes: 0 })).toEqual({ models: "1 configured provider", search: "2 configured search providers", sandbox: "E2B or Bunnyshell HopX sandbox credentials are required" });
  });

  it("filters real Plugin readiness records and initiates the selected integration disconnect", async () => {
    const user = userEvent.setup();
    const onDisconnect = vi.fn();
    const plugins = [
      { id: "groq", label: "Groq", category: "model", configured: true, status: "active" },
      { id: "google", label: "Google", category: "integration", configured: true, status: "connected" },
      { id: "slack", label: "Slack", category: "integration", configured: false, status: "missing_credentials" },
    ];
    expect(filterPluginServices(plugins, "goo", "all")).toEqual([plugins[1]]);
    expect(filterPluginServices(plugins, "", "configured")).toEqual([plugins[0], plugins[1]]);
    expect(filterPluginServices(plugins, "", "connected")).toEqual([plugins[1]]);

    render(<ConnectedIntegrationRow integration={{ id: "integration-1", label: "Google Workspace", provider: "google", availableToAllTasks: true }} pending={false} onDisconnect={onDisconnect} />);
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(onDisconnect).toHaveBeenCalledWith("integration-1");
  });

  it("shows the current available-credit state in the lower profile panel without exposing account secrets", async () => {
    const user = userEvent.setup();
    render(<ProfileMenu name="Synthia User" email="user@example.test" creditsBalance={124} onNavigate={vi.fn()} onLogout={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getByText("124 available credits")).toBeTruthy();
  });
});
