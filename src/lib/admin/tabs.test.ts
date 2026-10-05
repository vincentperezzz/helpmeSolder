import { describe, expect, it } from "vitest";
import { resolveActiveTab, visibleTabs } from "./tabs";

describe("visibleTabs", () => {
  it("shows every tab for a full session", () => {
    expect(visibleTabs("full").map((t) => t.id)).toEqual(["overview", "requests", "searches", "catalog", "assets", "settings"]);
  });
  it("shows only settings for a restricted session", () => {
    expect(visibleTabs("restricted").map((t) => t.id)).toEqual(["settings"]);
  });
});

describe("resolveActiveTab", () => {
  it("maps paths to tabs", () => {
    expect(resolveActiveTab("/admin")).toBe("overview");
    expect(resolveActiveTab("/admin/")).toBe("overview");
    expect(resolveActiveTab("/admin?changed=1")).toBe("overview");
    expect(resolveActiveTab("/admin/requests")).toBe("requests");
    expect(resolveActiveTab("/admin/searches?view=found")).toBe("searches");
    expect(resolveActiveTab("/admin/catalog/")).toBe("catalog");
    expect(resolveActiveTab("/admin/settings?notice=default")).toBe("settings");
  });
  it("returns null for other paths", () => {
    expect(resolveActiveTab("/")).toBeNull();
    expect(resolveActiveTab("/admin/unknown")).toBeNull();
    expect(resolveActiveTab("/administrator")).toBeNull();
  });
});
