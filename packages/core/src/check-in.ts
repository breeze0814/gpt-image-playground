import { PointLedgerType, prisma } from "@image-playground/db";
import { randomInt } from "node:crypto";
import { DomainError } from "./errors";
import { getNumericSetting, SETTING_KEYS } from "./settings";
import { creditWithinTransaction } from "./wallet";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function shanghaiDateKey(date = new Date()): string {
  return DATE_FORMATTER.format(date);
}

export async function dailyCheckIn(userId: string) {
  const [minimum, maximum] = await Promise.all([
    getNumericSetting(SETTING_KEYS.checkInMin),
    getNumericSetting(SETTING_KEYS.checkInMax),
  ]);
  if (minimum < 0 || maximum < minimum) {
    throw new DomainError("INVALID_CHECK_IN_RANGE", "签到积分区间配置无效", 500);
  }
  const dateKey = shanghaiDateKey();
  const reward = randomInt(minimum, maximum + 1);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.dailyCheckIn.findUnique({
      where: { userId_dateKey: { userId, dateKey } },
    });
    if (existing) throw new DomainError("ALREADY_CHECKED_IN", "今天已经签到过了", 409);
    const checkIn = await tx.dailyCheckIn.create({ data: { userId, dateKey, reward } });
    await creditWithinTransaction(tx, {
      userId,
      amount: reward,
      type: PointLedgerType.CHECK_IN,
      reason: `${dateKey} 每日签到`,
      idempotencyKey: `check-in:${userId}:${dateKey}`,
    });
    return checkIn;
  });
}

export async function getTodayCheckIn(userId: string) {
  return prisma.dailyCheckIn.findUnique({
    where: { userId_dateKey: { userId, dateKey: shanghaiDateKey() } },
  });
}
