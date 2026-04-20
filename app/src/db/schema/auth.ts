// Auth.js core tables. Cross-tenant: not covered by RLS.
// Mirrors the shape expected by @auth/drizzle-adapter.
import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const authUser = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image")
});

export const authAccount = pgTable(
  "auth_account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state")
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] })
  })
);

export const authSession = pgTable("auth_session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull()
});

export const authVerificationToken = pgTable(
  "auth_verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull()
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] })
  })
);
