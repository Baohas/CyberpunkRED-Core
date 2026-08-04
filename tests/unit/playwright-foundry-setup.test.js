import { describe, expect, it } from "vitest";

import { reachInteractableSetup } from "../../tools/playwright/setup/foundry-setup.mjs";

class FakeLocator {
  constructor({ visible = false } = {}) {
    this.visible = visible;
    this.fill = async () => {};
    this.click = async () => {};
    this.check = async () => {};
  }

  first() {
    return this;
  }

  async waitFor() {
    if (!this.visible) {
      throw new Error("not visible");
    }
  }
}

class FakePage {
  constructor({ licenseVisible = false, passwordVisible = false } = {}) {
    this.licenseVisible = licenseVisible;
    this.passwordVisible = passwordVisible;
    this.keyboard = {
      press: async () => {},
    };
    this.goto = async () => {};
    this.waitForLoadState = async () => {};
    this.evaluate = async () => {};
  }

  locator(selector) {
    if (selector.includes('input[name="licenseKey"]')) {
      return new FakeLocator({ visible: this.licenseVisible });
    }

    if (
      selector.includes('input[name="adminPassword"]') ||
      selector.includes('input[name="password"]') ||
      selector.includes('input[type="password"]')
    ) {
      return new FakeLocator({ visible: this.passwordVisible });
    }

    return new FakeLocator({ visible: false });
  }
}

function expectEnvOnlyGuidance(message, envKey) {
  expect(message).toContain(envKey);
  expect(message).not.toContain("foundryconfig.json");
  expect(message).toMatch(/\.env|environment|export/i);
}

describe("playwright Foundry setup messaging", () => {
  it("keeps missing admin-password guidance on the env workflow", async () => {
    const page = new FakePage({ passwordVisible: true });
    const config = {
      url: "http://localhost:30001",
      foundryAdminPass: "",
      foundryKey: "licensed",
    };

    const error = await reachInteractableSetup(page, config).catch(
      (cause) => cause,
    );

    expect(error).toBeInstanceOf(Error);
    expectEnvOnlyGuidance(error.message, "FOUNDRY_ADMIN_PASS");
  });

  it("keeps missing license-key guidance on the env workflow", async () => {
    const page = new FakePage({ licenseVisible: true });
    const config = {
      url: "http://localhost:30001",
      foundryAdminPass: "admin-secret",
      foundryKey: "",
    };

    const error = await reachInteractableSetup(page, config).catch(
      (cause) => cause,
    );

    expect(error).toBeInstanceOf(Error);
    expectEnvOnlyGuidance(error.message, "FOUNDRY_KEY");
  });
});
