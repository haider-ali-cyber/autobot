import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authenticateUser } from "@/lib/auth/users";
import { db } from "@/lib/db";

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [];

const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = typeof credentials?.email === "string" ? credentials.email : "";
      const password = typeof credentials?.password === "string" ? credentials.password : "";

      if (!email || !password) {
        return null;
      }

      try {
        const user = await authenticateUser(email, password);
        if (!user) return null;
        if (!user.emailVerified) return null;
        return { id: user.id, name: user.name, email: user.email };
      } catch {
        return null;
      }
    },
  }),
  ...googleProvider,
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && typeof user.id === "string") {
        token.sub = user.id;
      }

      if (
        account?.provider === "google" &&
        typeof token.email === "string"
      ) {
        const email = token.email.trim().toLowerCase();
        const name =
          typeof token.name === "string" && token.name.trim().length > 0
            ? token.name.trim()
            : "Google User";

        const dbUser = await db.user.upsert({
          where: { email },
          update: { name },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: {
            email,
            name,
            passwordHash: "__oauth_google_account__",
            emailVerified: true,
          } as any,
          select: {
            id: true,
            email: true,
            name: true,
          },
        });

        token.sub = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        const sessionUser = session.user as typeof session.user & { id?: string };
        sessionUser.id = token.sub;
      }

      return session;
    },
  },
});
