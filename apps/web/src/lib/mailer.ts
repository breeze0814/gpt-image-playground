import { requireEmailConfig } from "@image-playground/core";
import nodemailer from "nodemailer";
import { EMAIL_OTP_EXPIRY_MINUTES } from "./auth-constraints";

export type VerificationCodeType = "email-verification" | "sign-in" | "forget-password" | "change-email";

const SUBJECT_BY_TYPE: Readonly<Record<VerificationCodeType, string>> = {
  "email-verification": "Image Playground 注册邮箱验证码",
  "sign-in": "Image Playground 邮箱验证提醒",
  "forget-password": "Image Playground 重置密码验证码",
  "change-email": "Image Playground 更换邮箱验证码",
};

export async function sendVerificationCode(
  email: string,
  otp: string,
  type: VerificationCodeType,
): Promise<void> {
  const config = await requireEmailConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && config.password ? { auth: { user: config.user, pass: config.password } } : {}),
  });
  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: SUBJECT_BY_TYPE[type],
    text: `你的邮箱验证码是 ${otp}，${EMAIL_OTP_EXPIRY_MINUTES} 分钟内有效。`,
    html: `<p>你的邮箱验证码是：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>验证码 ${EMAIL_OTP_EXPIRY_MINUTES} 分钟内有效。</p>`,
  });
}
