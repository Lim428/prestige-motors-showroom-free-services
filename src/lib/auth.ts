import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!email || !password) {
          return null;
        }

        if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
          const passwordHash = await hash(adminPassword, 12);
          const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
              name: "Prestige Motors Admin",
              passwordHash,
              role: "ADMIN"
            },
            create: {
              name: "Prestige Motors Admin",
              email: adminEmail,
              passwordHash,
              role: "ADMIN"
            }
          });

          return {
            id: admin.id,
            name: admin.name ?? "Administrator",
            email: admin.email,
            role: admin.role
          };
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user || user.role !== "ADMIN") {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? "Administrator",
          email: user.email,
          role: user.role
        };
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
