import { PrismaAdapter } from "@auth/prisma-adapter";
import { type AuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import { randomUUID } from "crypto";
import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

const PREPEND_COOKIENAME = process.env.VERCEL ? "__Secure-" : "";

const MAX_FINGERPRINTS = 3;

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
const authConfig: AuthOptions = {
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: { label: "Password", type: "password" },
        fingerprint: { label: "Fingerprint", type: "text" },
        acknowledgeWarning: { label: "Acknowledge Warning", type: "boolean" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          typeof credentials.email !== "string" ||
          !z.string().email().safeParse(credentials.email).success ||
          !credentials.password ||
          typeof credentials.password !== "string" ||
          !credentials.fingerprint ||
          typeof credentials.fingerprint !== "string"
        ) {
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            email: credentials.email,
          },
          include: {
            fingerprints: true,
          },
        });

        if (!user) {
          const newUser = await db.user.create({
            data: {
              email: credentials.email,
              password: credentials.password,
              enforceFingerprintLimit: true,
              fingerprints: {
                create: {
                  fingerprint: credentials.fingerprint,
                },
              },
            },
            include: {
              fingerprints: true,
            },
          });
          return newUser;
        }

        if (user.password !== credentials.password) {
          return null;
        }

        // Check if this fingerprint is already registered for this user
        const existingFingerprint = user.fingerprints.find(
          (f) => f.fingerprint === credentials.fingerprint,
        );

        if (existingFingerprint) {
          // Update last used timestamp
          await db.userFingerprint.update({
            where: { id: existingFingerprint.id },
            data: { lastUsed: new Date() },
          });
          return user;
        }

        // If we get here, this is a new fingerprint
        // Check if user has less than MAX_FINGERPRINTS fingerprints
        if (user.fingerprints.length < MAX_FINGERPRINTS) {
          // Register the new fingerprint
          await db.userFingerprint.create({
            data: {
              fingerprint: credentials.fingerprint,
              userId: user.id,
            },
          });
          return user;
        }

        // User has MAX_FINGERPRINTS or more fingerprints and this is a new one
        // If limits are not enforced, show warning
        if (!user.enforceFingerprintLimit) {
          // If they've acknowledged the warning, allow the sign in
          if (credentials.acknowledgeWarning === "true") {
            // Register the new fingerprint
            await db.userFingerprint.create({
              data: {
                fingerprint: credentials.fingerprint,
                userId: user.id,
              },
            });
            return user;
          }
          // User has 3 or more fingerprints and hasn't acknowledged the warning
          throw new Error("MAX_FINGERPRINTS_REACHED");
        }

        // User has 3 or more fingerprints and limits are enforced
        throw new Error("MAX_FINGERPRINTS_ENFORCED");
      },
    }),
  ],
  adapter: PrismaAdapter(db),

  callbacks: {
    session: ({ session, user }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };
    },
  },

  jwt: {},
} satisfies AuthOptions;

export default async function authHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Do whatever you want here, before the request is passed down to `NextAuth`
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return await NextAuth(
    // @ts-expect-error expecting NextRequest for some reason
    req,
    res,
    {
      ...authConfig,
      callbacks: {
        ...authConfig.callbacks,
        async signIn({
          user,
          //account, profile, email, credentials
        }) {
          // Check if this sign in callback is being called in the credentials authentication flow. If so, use the next-auth adapter to create a session entry in the database (SignIn is called after authorize so we can safely assume the user is valid and already authenticated).
          if (
            req.query?.nextauth?.includes("callback") &&
            req.query.nextauth.includes("credentials") &&
            req.method === "POST"
          ) {
            if (user) {
              const sessionToken = randomUUID();
              const sessionExpiry = new Date();
              sessionExpiry.setHours(sessionExpiry.getHours() + 24 * 7);

              await db.session.create({
                data: {
                  sessionToken: sessionToken,
                  userId: user.id,
                  expires: sessionExpiry,
                },
              });

              res.setHeader(
                "Set-Cookie",
                `${PREPEND_COOKIENAME}next-auth.session-token=${sessionToken}; ` +
                  `Path=/; ` +
                  `Max-Age=${Math.round(60 * 60 * 24 * 7)}; ` +
                  `HttpOnly; ` +
                  `Secure; ` +
                  `SameSite=Lax; `,
              );
            }
          }

          return true;
        },
      },
      jwt: {
        // Customize the JWT encode and decode functions to overwrite the default behaviour of storing the JWT token in the session cookie when using credentials providers. Instead we will store the session token reference to the session in the database.
        encode: async ({ token, secret, maxAge }) => {
          if (
            req.query?.nextauth?.includes("callback") &&
            req.query.nextauth.includes("credentials") &&
            req.method === "POST"
          ) {
            return (
              req.cookies[`${PREPEND_COOKIENAME}next-auth.session-token`] ?? ""
            );
          }
          // Revert to default behaviour when not in the credentials provider callback flow
          return authConfig.jwt?.encode?.({ token, secret, maxAge });
        },
        decode: async ({ token, secret }) => {
          if (
            req.query?.nextauth?.includes("callback") &&
            req.query.nextauth.includes("credentials") &&
            req.method === "POST"
          ) {
            return null;
          }

          // Revert to default behaviour when not in the credentials provider callback flow
          return authConfig.jwt?.decode?.({ token, secret });
        },
      },
    },
  );
}
