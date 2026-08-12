import {
  bootstrapAdmin,
  type AdminBootstrapStore,
  type CredentialInitialization,
} from "@image-playground/db/admin-bootstrap";
import { describe, expect, it } from "vitest";

const ADMIN_IDENTITY = { email: "admin@example.test", name: "Admin" } as const;

describe("管理员凭据初始化", () => {
  it("重复初始化时保留用户已经设置的密码", async () => {
    let hashCalls = 0;
    let initializeCalls = 0;
    const store: AdminBootstrapStore = {
      upsertAdmin: async () => ({ id: "admin-id" }),
      findCredential: async () => ({ id: "credential-id", hasPassword: true }),
      initializeCredential: async () => { initializeCalls += 1; },
    };

    const status = await bootstrapAdmin(store, {
      ...ADMIN_IDENTITY,
      createPasswordHash: async () => { hashCalls += 1; return "replacement-hash"; },
    });

    expect(status).toBe("preserved");
    expect(hashCalls).toBe(0);
    expect(initializeCalls).toBe(0);
  });

  it("首次初始化时创建管理员密码", async () => {
    let initialization: CredentialInitialization | undefined;
    const store: AdminBootstrapStore = {
      upsertAdmin: async () => ({ id: "admin-id" }),
      findCredential: async () => null,
      initializeCredential: async (input) => { initialization = input; },
    };

    const status = await bootstrapAdmin(store, {
      ...ADMIN_IDENTITY,
      createPasswordHash: async () => "initial-hash",
    });

    expect(status).toBe("created");
    expect(initialization).toEqual({ userId: "admin-id", passwordHash: "initial-hash" });
  });
});
