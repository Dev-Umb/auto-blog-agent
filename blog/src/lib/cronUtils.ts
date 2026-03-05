// Lightweight cron-expression parser for the subset used by the blog agent.
// Supports: every-N-minutes, fixed-minute, fixed-hour+minute, weekday patterns.
export function getNextCronRun(cron: string, tz: string): Date {
  const [minPart, hourPart, , , dowPart] = cron.split(" ");

  const now = new Date();
  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) =>
    tzParts.find((p) => p.type === type)?.value || "0";
  const curMin = parseInt(get("minute"), 10);
  const curHour = parseInt(get("hour"), 10);
  const dayNameMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const curDow = dayNameMap[get("weekday")] ?? 0;

  const isEveryMinute = minPart.startsWith("*/");
  const isFixedMinute = !minPart.includes("*") && !minPart.includes("/");
  const isFixedHour =
    hourPart !== "*" && !hourPart.includes("/");
  const isFixedDow = dowPart !== "*";

  const next = new Date(now);

  if (isFixedDow && isFixedHour && isFixedMinute) {
    const targetDow = parseInt(dowPart, 10);
    const targetHour = parseInt(hourPart, 10);
    const targetMin = parseInt(minPart, 10);

    let daysAhead = (targetDow - curDow + 7) % 7;
    if (
      daysAhead === 0 &&
      (curHour > targetHour ||
        (curHour === targetHour && curMin >= targetMin))
    ) {
      daysAhead = 7;
    }

    next.setDate(next.getDate() + daysAhead);
    const offset =
      targetHour * 60 + targetMin - (curHour * 60 + curMin);
    next.setMinutes(next.getMinutes() + offset + (daysAhead > 0 ? 0 : 0));

    if (daysAhead > 0) {
      const dayDiffMs = daysAhead * 24 * 60 * 60 * 1000;
      const timeOffsetMs = (offset) * 60 * 1000;
      return new Date(now.getTime() + dayDiffMs + timeOffsetMs);
    }
    next.setMinutes(next.getMinutes() + offset);
    next.setSeconds(0, 0);
    return next;
  }

  if (isFixedHour && isFixedMinute) {
    const targetHour = parseInt(hourPart, 10);
    const targetMin = parseInt(minPart, 10);
    const targetTotal = targetHour * 60 + targetMin;
    const curTotal = curHour * 60 + curMin;
    let diffMin = targetTotal - curTotal;
    if (diffMin <= 0) diffMin += 24 * 60;
    next.setMinutes(next.getMinutes() + diffMin);
    next.setSeconds(0, 0);
    return next;
  }

  if (isFixedMinute) {
    const targetMin = parseInt(minPart, 10);
    let diffMin = targetMin - curMin;
    if (diffMin <= 0) diffMin += 60;
    next.setMinutes(next.getMinutes() + diffMin);
    next.setSeconds(0, 0);
    return next;
  }

  if (isEveryMinute) {
    const interval = parseInt(minPart.split("/")[1], 10);
    const nextSlot = Math.ceil((curMin + 1) / interval) * interval;
    const diffMin = nextSlot - curMin;
    next.setMinutes(next.getMinutes() + diffMin);
    next.setSeconds(0, 0);
    return next;
  }

  next.setMinutes(next.getMinutes() + 1);
  next.setSeconds(0, 0);
  return next;
}

export function formatRelativeTime(target: Date): string {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "即将开始";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "不到 1 分钟后";
  if (minutes < 60) return `${minutes} 分钟后`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (remHours === 0) return `${days} 天后`;
    return `${days} 天 ${remHours} 小时后`;
  }
  if (remaining === 0) return `${hours} 小时后`;
  return `${hours} 小时 ${remaining} 分钟后`;
}

export function formatTime(date: Date, tz: string): string {
  return date.toLocaleTimeString("zh-CN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date, tz: string): string {
  return date.toLocaleString("zh-CN", {
    timeZone: tz,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
