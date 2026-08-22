import { describe, expect, it } from "vitest";
import { appConnectorProviders, appConnectorReadiness, listUserFacingApps } from "./appConnectors";

describe("app connector authorization boundaries", () => {
  it("describes only the explicit user-authorized provider routes", () => {
    expect(appConnectorProviders).toEqual(["zapier", "pipedream", "composio"]);
    expect(appConnectorReadiness().map(item => item.provider)).toEqual(["zapier", "pipedream", "composio"]);
    const boundaries = appConnectorReadiness().map(item => item.boundary.toLowerCase());
    expect(boundaries[0]).toContain("task-scoped proposal");
    expect(boundaries[1]).toContain("credential");
    expect(boundaries[2]).toContain("explicit approval");
  });

  it("uses embedded authorization only for Zapier and redirect authorization for Pipedream and Composio", () => {
    const readiness = new Map(appConnectorReadiness().map(item => [item.provider, item.authorization]));

    expect(readiness.get("zapier")).toBe("embedded");
    expect(readiness.get("pipedream")).toBe("redirect");
    expect(readiness.get("composio")).toBe("redirect");
  });

  it("provides a local public directory of more than 150 apps without a provider call or private authorization-route fields", () => {
    const apps = listUserFacingApps();
    const gmail = apps.find(app => app.slug === "gmail");

    expect(apps.length).toBeGreaterThanOrEqual(150);
    expect(apps.map(app => app.name)).toEqual(expect.arrayContaining(["Gmail", "Google Drive", "Google Calendar", "Google Sheets", "Notion", "Slack", "GitHub", "Linear", "Jira", "Trello", "Airtable", "Dropbox", "HubSpot", "Salesforce", "Asana", "Microsoft Teams", "Stripe", "Shopify"]));
    expect(gmail).toMatchObject({ name: "Gmail", categories: ["Communication"], scopeOptions: ["Messages", "Drafts"], authorizationRequired: true, approvalRequired: true, featured: true });
    expect(gmail?.iconUrl).toMatch(/^https:\/\/cdn\.simpleicons\.org\//);
    expect(Object.keys(gmail ?? {}).sort()).toEqual(["approvalRequired", "authorizationRequired", "categories", "description", "featured", "iconUrl", "name", "scopeOptions", "slug"]);
    expect(listUserFacingApps()).not.toBe(apps);
    expect(listUserFacingApps()[0].categories).not.toBe(apps[0].categories);
  });
});
