export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function assertStringInRange(
  v: unknown,
  name: string,
  min: number,
  max: number,
): string {
  if (typeof v !== "string" || v.length < min || v.length > max) {
    throw new ValidationError(`${name} は${min}〜${max}文字の文字列が必要です`);
  }
  return v;
}

export function assertInt(
  v: unknown,
  name: string,
  min: number,
  max: number,
): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new ValidationError(`${name} は${min}〜${max}の整数が必要です`);
  }
  return v;
}

export function assertNonZeroInt(v: unknown, name: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v === 0) {
    throw new ValidationError(`${name} は0以外の整数が必要です`);
  }
  return v;
}

export function assertOptionalString(
  v: unknown,
  name: string,
): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") {
    throw new ValidationError(`${name} は文字列が必要です`);
  }
  return v;
}

export function assertOptionalStringArray(
  v: unknown,
  name: string,
): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.some((t) => typeof t !== "string")) {
    throw new ValidationError(`${name} は文字列の配列が必要です`);
  }
  return v as string[];
}

export function assertMode(v: unknown): "easy" | "normal" | "hard" {
  if (v !== "easy" && v !== "normal" && v !== "hard") {
    throw new ValidationError(
      "mode は easy / normal / hard のいずれかが必要です",
    );
  }
  return v;
}
