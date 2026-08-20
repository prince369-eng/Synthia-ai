// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentNavigationControls, agentTaskStateCopy, runtimeCapabilityCopy } from "../client/src/pages/Agent";
import { ConnectedIntegrationRow, filterPluginServices, providerStatusCopy } from "../client/src/pages/Plugins";
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
    await user.click(screen.getByRole("button", { name: "Explore capabilities" }));
    expect(onCreateTask).toHaveBeenCalledTimes(1);
    expect(onOpenServices).toHaveBeenCalledTimes(1);
    expect(agentTaskStateCopy({ isLoading: false, isError: true, activeCount: 0 })).toBe("Task activity is temporarily unavailable.");
    expect(runtimeCapabilityCopy({ isLoading: false, configuredModels: 1, configuredSearch: 2, configuredSandboxes: 0 })).toEqual({ models: "Ready to plan and complete tasks", search: "Ready to research the web", sandbox: "Computer setup is needed" });
  });

  it("filters real Plugin readiness records and initiates the selected integration disconnect", async () => {
    const user = userEvent.setup();
    const onDisconnect = vi.fn();
    const plugins = [
      { id: "google", label: "Google", category: "integration", configured: true, status: "connected" },
      { id: "slack", label: "Slack", category: "integration", configured: true, status: "ready_to_connect" },
    ];
    expect(filterPluginServices(plugins, "goo", "all")).toEqual([plugins[0]]);
    expect(filterPluginServices(plugins, "", "configured")).toEqual(plugins);
    expect(filterPluginServices(plugins, "", "connected")).toEqual([plugins[0]]);
    expect(providerStatusCopy("ready_to_connect")).toBe("Available to connect");
    expect(providerStatusCopy("active")).toBe("Not available in this workspace");

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
