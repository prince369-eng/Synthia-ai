// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileMenu } from "../client/src/components/SynthiaAppShell";
import { SettingsSectionNav } from "../client/src/pages/Settings";
import { WorkspaceReturnNavigation } from "../client/src/pages/TaskWorkspace";

afterEach(cleanup);

describe("Synthia navigation behavior", () => {
  it("opens the profile menu and executes account destinations and sign-out", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onLogout = vi.fn();
    render(<ProfileMenu name="Synthia User" email="user@example.test" onNavigate={onNavigate} onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getAllByText("user@example.test")).toHaveLength(2);
    await user.click(screen.getByRole("menuitem", { name: "Providers & integrations" }));
    expect(onNavigate).toHaveBeenCalledWith("/settings/integrations");

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("navigates grouped settings controls to their expected routes", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SettingsSectionNav section="profile" onNavigate={onNavigate} />);

    expect(screen.getByText("Account")).toBeTruthy();
    expect(screen.getByText("Agent workspace")).toBeTruthy();
    expect(screen.getByText("Controls")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Usage & credits" }));
    expect(onNavigate).toHaveBeenCalledWith("/settings/billing");
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
});
