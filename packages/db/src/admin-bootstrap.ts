import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

const CREDENTIAL_PROVIDER_ID = "credential";

export interface AdminIdentity {
  readonly email: string;
  readonly name: string;
}

export interface AdminCredential {
  readonly id: string;
  readonly hasPassword: boolean;
}

export interface CredentialInitialization {
  readonly userId: string;
  readonly passwordHash: string;
  readonly credentialId?: string;
}

export interface AdminBootstrapStore {
  readonly upsertAdmin: (identity: AdminIdentity) => Promise<{ readonly id: string }>;
  readonly findCredential: (userId: string) => Promise<AdminCredential | null>;
  readonly initializeCredential: (input: CredentialInitialization) => Promise<void>;
}

export interface AdminBootstrapOptions extends AdminIdentity {
  readonly createPasswordHash: () => Promise<string>;
}

export type AdminBootstrapStatus = "created" | "preserved" | "repaired";

export async function bootstrapAdmin(
  store: AdminBootstrapStore,
  options: AdminBootstrapOptions,
): Promise<AdminBootstrapStatus> {
  const user = await store.upsertAdmin(options);
  const credential = await store.findCredential(user.id);
  if (credential?.hasPassword) return "preserved";

  const passwordHash = await options.createPasswordHash();
  await store.initializeCredential({
    userId: user.id,
    passwordHash,
    ...(credential ? { credentialId: credential.id } : {}),
  });
  return credential ? "repaired" : "created";
}

export function createPrismaAdminBootstrapStore(client: PrismaClient): AdminBootstrapStore {
  return {
    upsertAdmin: async ({ email, name }) => client.user.upsert({
      where: { email },
      update: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        pointAccount: { upsert: { update: {}, create: {} } },
      },
      create: {
        email,
        name,
        emailVerified: true,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        pointAccount: { create: {} },
      },
      select: { id: true },
    }),
    findCredential: async (userId) => {
      const accounts = await client.account.findMany({
        where: { userId, providerId: CREDENTIAL_PROVIDER_ID },
        select: { id: true, password: true },
      });
      const account = accounts.find(({ password }) => password !== null) ?? accounts[0];
      return account ? { id: account.id, hasPassword: account.password !== null } : null;
    },
    initializeCredential: async ({ userId, passwordHash, credentialId }) => {
      if (credentialId) {
        await client.account.updateMany({
          where: { id: credentialId, password: null },
          data: { password: passwordHash },
        });
        return;
      }
      await client.account.upsert({
        where: { providerId_accountId: { providerId: CREDENTIAL_PROVIDER_ID, accountId: userId } },
        update: {},
        create: { userId, providerId: CREDENTIAL_PROVIDER_ID, accountId: userId, password: passwordHash },
      });
    },
  };
}
