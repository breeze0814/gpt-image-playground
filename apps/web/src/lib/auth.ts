import { grantPoints, getNumericSetting, SETTING_KEYS } from "@image-playground/core";
import { PointLedgerType, UserRole, prisma } from "@image-playground/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import {
  EMAIL_OTP_ALLOWED_ATTEMPTS,
  EMAIL_OTP_EXPIRES_IN_SECONDS,
  EMAIL_OTP_LENGTH,
  EMAIL_OTP_RATE_LIMIT_MAX_REQUESTS,
  EMAIL_OTP_RATE_LIMIT_WINDOW_SECONDS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "./auth-constraints";
import { sendVerificationCode } from "./mailer";

async function grantWelcomeCredits(userId: string): Promise<void> {
  const amount = await getNumericSetting(SETTING_KEYS.welcomeCredits);
  if (amount <= 0) return;
  await grantPoints({
    userId,
    amount,
    type: PointLedgerType.WELCOME,
    reason: "新用户欢迎积分",
    idempotencyKey: `welcome:${userId}`,
  });
}

function createAuth() {
  return betterAuth({
    appName: "Image Playground",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },
    disabledPaths: ["/sign-in/email-otp"],
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: UserRole.USER, input: false },
        status: { type: "string", defaultValue: "ACTIVE", input: false },
        theme: { type: "string", defaultValue: "SYSTEM", input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => grantWelcomeCredits(user.id),
        },
      },
    },
    plugins: [
      emailOTP({
        sendVerificationOTP: ({ email, otp, type }) => sendVerificationCode(email, otp, type),
        otpLength: EMAIL_OTP_LENGTH,
        expiresIn: EMAIL_OTP_EXPIRES_IN_SECONDS,
        allowedAttempts: EMAIL_OTP_ALLOWED_ATTEMPTS,
        storeOTP: "hashed",
        disableSignUp: true,
        overrideDefaultEmailVerification: true,
        rateLimit: { window: EMAIL_OTP_RATE_LIMIT_WINDOW_SECONDS, max: EMAIL_OTP_RATE_LIMIT_MAX_REQUESTS },
      }),
      nextCookies(),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  authInstance ??= createAuth();
  return authInstance;
}
