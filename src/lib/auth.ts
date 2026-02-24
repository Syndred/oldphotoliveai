// NextAuth.js Configuration
// Requirements: 1.2, 1.3, 1.4, 15.1, 15.4

import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { config } from "./config";
import { createOrGetUser, getUser } from "./redis";
import { initializeFreeQuota } from "./quota";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "google") return false;
      if (!user.email || !user.name) return false;

      try {
        // Create or retrieve user in Redis (Req 1.3)
        const dbUser = await createOrGetUser(
          account.providerAccountId,
          user.email,
          user.name
        );

        // Initialize free quota for new users
        // initializeFreeQuota is idempotent-safe since it overwrites
        if (dbUser.tier === "free") {
          await initializeFreeQuota(dbUser.id);
        }

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },

    async jwt({ token, account }) {
      // On initial sign-in, store the Google ID in the JWT
      if (account) {
        token.googleId = account.providerAccountId;
      }

      // Look up user from Redis to get userId and tier
      if (token.googleId) {
        try {
          const dbUser = await createOrGetUser(
            token.googleId as string,
            token.email ?? "",
            token.name ?? ""
          );
          token.userId = dbUser.id;
          token.tier = dbUser.tier;
        } catch {
          // If lookup fails, keep existing token data
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Inject user ID and tier into session (Req 1.4)
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.userId;
        (session.user as Record<string, unknown>).tier = token.tier;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days (Req 15.1)
  },

  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true, // Req 15.4
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },

  pages: {
    signIn: "/login",
  },
};
