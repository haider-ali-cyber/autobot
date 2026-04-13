import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthUser = PublicUser & { emailVerified: boolean };

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

let seedPromise: Promise<void> | null = null;

const encoder = new TextEncoder();
const BCRYPT_ROUNDS = 12;
const LEGACY_AUTH_SECRET_FALLBACK = "sellora-dev-secret-change-me";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function toPublicUser(user: { id: string; name: string; email: string }): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === "P2002";
}

function isBcryptHash(passwordHash: string) {
  return /^\$2[aby]\$\d{2}\$/.test(passwordHash);
}

async function hashLegacyPassword(password: string) {
  const salt = process.env.AUTH_SECRET ?? LEGACY_AUTH_SECRET_FALLBACK;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${salt}:${password}`)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string) {
  return hash(password, BCRYPT_ROUNDS);
}

async function ensureSeedUser() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [demoHash, adminHash] = await Promise.all([
        hashPassword("demo12345"),
        hashPassword("Admin@sellora1"),
      ]);

      await db.user.upsert({
        where: { email: normalizeEmail("demo@sellora.io") },
        update: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: { name: "Demo User", email: normalizeEmail("demo@sellora.io"), passwordHash: demoHash, emailVerified: true } as any,
      });

      await db.user.upsert({
        where: { email: normalizeEmail("admin@sellora.io") },
        update: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: { name: "Admin", email: normalizeEmail("admin@sellora.io"), passwordHash: adminHash, emailVerified: true } as any,
      });
    })();
  }

  try {
    await seedPromise;
  } catch (error) {
    seedPromise = null;
    throw error;
  }
}

export async function registerUser(input: RegisterInput) {
  await ensureSeedUser();

  const email = normalizeEmail(input.email);

  const code = generateOTP();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  try {
    const user = await db.user.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        name: input.name.trim(),
        email,
        passwordHash: await hashPassword(input.password),
        emailVerified: false,
        verificationCode: code,
        verificationExpiry: expiry,
      } as any,
    });

    return { ok: true as const, user: toPublicUser(user), verificationCode: code };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false as const, reason: "exists" as const };
    }

    throw error;
  }
}

export async function authenticateUser(emailInput: string, passwordInput: string): Promise<AuthUser | null> {
  await ensureSeedUser();

  const email = normalizeEmail(emailInput);
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;

  let isAuthenticated = false;

  if (isBcryptHash(user.passwordHash)) {
    isAuthenticated = await compare(passwordInput, user.passwordHash);
  } else {
    const legacyHash = await hashLegacyPassword(passwordInput);
    isAuthenticated = legacyHash === user.passwordHash;

    if (isAuthenticated) {
      const upgradedHash = await hashPassword(passwordInput);
      await db.user
        .update({
          where: { id: user.id },
          data: { passwordHash: upgradedHash },
        })
        .catch(() => undefined);
    }
  }

  if (!isAuthenticated) return null;

  const ev = (user as unknown as { emailVerified?: boolean }).emailVerified ?? true;
  return { ...toPublicUser(user), emailVerified: ev };
}

export async function verifyEmailCode(emailInput: string, code: string) {
  const email = normalizeEmail(emailInput);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await db.user.findUnique({ where: { email } }) as any;
  if (!user) return { ok: false, reason: "not_found" as const };

  if (user.emailVerified) return { ok: true };
  if (!user.verificationCode || !user.verificationExpiry) return { ok: false, reason: "no_code" as const };
  if (new Date() > new Date(user.verificationExpiry)) return { ok: false, reason: "expired" as const };
  if (user.verificationCode !== code.trim()) return { ok: false, reason: "invalid" as const };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.user.update({
    where: { id: user.id as string },
    data: { emailVerified: true, verificationCode: null, verificationExpiry: null } as any,
  });

  return { ok: true };
}

export async function resendVerificationCode(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: false, reason: "not_found" as const };

  const ev = (user as unknown as { emailVerified?: boolean }).emailVerified ?? false;
  if (ev) return { ok: false, reason: "already_verified" as const };

  const code = generateOTP();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.user.update({
    where: { id: user.id as string },
    data: { verificationCode: code, verificationExpiry: expiry } as any,
  });

  return { ok: true, code, name: user.name };
}

export async function createPasswordResetToken(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: false, reason: "not_found" as const };

  const token = crypto.randomUUID();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry } as any,
  });

  return { ok: true, token, name: user.name };
}

export async function resetPassword(token: string, newPassword: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await db.user.findFirst({ where: { resetToken: token } as any }) as any;
  if (!user) return { ok: false, reason: "invalid_token" as const };
  if (new Date() > new Date(user.resetTokenExpiry)) return { ok: false, reason: "expired" as const };

  const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.user.update({
    where: { id: user.id as string },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null } as any,
  });

  return { ok: true };
}
