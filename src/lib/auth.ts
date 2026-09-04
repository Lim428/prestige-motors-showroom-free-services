import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import {
  enforceRateLimitForIdentity,
  resetRateLimitForIdentity,
  trustedClientAddress
} from "@/lib/engagement/rate-limit";
import { prisma } from "@/lib/prisma";

const adminAccountLoginLimit = {
  limit: 8,
  windowMs: 15 * 60_000
} as const;
const adminAddressLoginLimit = {
  limit: 30,
  windowMs: 15 * 60_000
} as const;

const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim();

if (
  process.env.NODE_ENV === "production" &&
  (!nextAuthSecret ||
    nextAuthSecret.length < 32 ||
    nextAuthSecret.startsWith("replace-with-"))
) {
  throw new Error("NEXTAUTH_SECRET must be a unique production secret of at least 32 characters.");
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8
  },
  pages: {
    signIn: "/admin/login"
  },
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!email || !password) {
          return null;
        }

        const clientAddress = trustedClientAddress(request.headers ?? {});
        const loginRateLimits = [
          {
            bucket: "admin-login-account",
            identity: [email],
            options: adminAccountLoginLimit
          },
          {
            bucket: "admin-login-address",
            identity: [clientAddress],
            options: adminAddressLoginLimit
          }
        ];

        try {
          await Promise.all(
            loginRateLimits.map(({ bucket, identity, options }) =>
              enforceRateLimitForIdentity(bucket, identity, options)
            )
          );
        } catch {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (user) {
          if (user.role !== "ADMIN") {
            return null;
          }

          const isValidPassword = await compare(password, user.passwordHash);

          if (!isValidPassword) {
            return null;
          }

          try {
            await Promise.all(
              loginRateLimits.map(({ bucket, identity }) =>
                resetRateLimitForIdentity(bucket, identity)
              )
            );
          } catch {
            return null;
          }

          return {
            id: user.id,
            name: user.name ?? "Administrator",
            email: user.email,
            role: user.role
          };
        }

        const hasSafeBootstrapPassword =
          process.env.NODE_ENV !== "production" ||
          Boolean(
            adminPassword &&
              adminPassword.length >= 16 &&
              adminPassword !== "ChangeThisAdminPassword!2026"
          );

        if (
          adminEmail &&
          adminPassword &&
          hasSafeBootstrapPassword &&
          email === adminEmail &&
          password === adminPassword
        ) {
          const passwordHash = await hash(adminPassword, 12);
          const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
              name: "Prestige Motors Admin",
              email: adminEmail,
              passwordHash,
              role: "ADMIN"
            }
          });

          if (admin.role !== "ADMIN" || !(await compare(password, admin.passwordHash))) {
            return null;
          }

          try {
            await Promise.all(
              loginRateLimits.map(({ bucket, identity }) =>
                resetRateLimitForIdentity(bucket, identity)
              )
            );
          } catch {
            return null;
          }

          return {
            id: admin.id,
            name: admin.name ?? "Administrator",
            email: admin.email,
            role: admin.role
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN";
      }

      return session;
    }
  }
};
