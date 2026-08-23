import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@videohost/db";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

class UserBlockedError extends CredentialsSignin {
  code = "ACCOUNT_BLOCKED";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: { organization: true },
            },
          },
        });

        if (!user || !user.passwordHash) return null;

        if (user.isBlocked) {
          throw new UserBlockedError();
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        let dbUser = await db.user.findUnique({
          where: { email: user.email },
          include: { memberships: true },
        });

        if (dbUser?.isBlocked) {
          return false;
        }

        if (!dbUser) {
          dbUser = await db.user.create({
            data: {
              email: user.email,
              name: user.name || user.email.split("@")[0],
              image: user.image,
              emailVerified: new Date(),
            },
            include: { memberships: true },
          });
        } else if (user.image || user.name) {
          dbUser = await db.user.update({
            where: { id: dbUser.id },
            data: {
              name: dbUser.name || user.name,
              image: dbUser.image || user.image,
            },
            include: { memberships: true },
          });
        }

        if (account.providerAccountId) {
          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            await db.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: (account.session_state as string) || null,
              },
            });
          }
        }

        if (dbUser.memberships.length === 0) {
          let defaultPlan = await db.plan.findFirst({ where: { name: "free" } });
          if (!defaultPlan) {
            defaultPlan = await db.plan.create({
              data: {
                name: "free",
                minutesLimit: 200,
                maxResolution: "1080p",
                seatLimit: 3,
                priceMonthlyCents: 0,
              },
            });
          }

          const userName = user.name || user.email.split("@")[0];
          const orgName = `${userName}'s Workspace`;
          const baseSlug = userName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "workspace";
          const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

          const newOrg = await db.organization.create({
            data: {
              name: orgName,
              slug,
              planId: defaultPlan.id,
              members: {
                create: {
                  userId: dbUser.id,
                  role: "OWNER",
                },
              },
            },
          });

          await db.user.update({
            where: { id: dbUser.id },
            data: { activeOrganizationId: newOrg.id },
          });
        }

        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        if (account?.provider === "google" && user.email) {
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser) {
            token.id = dbUser.id;
          }
        } else {
          token.id = user.id;
        }
      }

      // Fetch active organization membership and viewMode
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, name: true, email: true, viewMode: true, activeOrganizationId: true, isBlocked: true },
        });

        if (!dbUser || dbUser.isBlocked) {
          token.id = undefined;
          token.organizationId = undefined;
          return token;
        }

        token.viewMode = dbUser.viewMode || "CREATOR";

        let memberships = await db.organizationMember.findMany({
          where: { userId: token.id as string },
          include: { organization: true },
        });

        if (memberships.length === 0) {
          try {
            let defaultPlan = await db.plan.findFirst({ where: { name: "free" } });
            if (!defaultPlan) {
              defaultPlan = await db.plan.create({
                data: {
                  name: "free",
                  minutesLimit: 200,
                  maxResolution: "1080p",
                  seatLimit: 3,
                  priceMonthlyCents: 0,
                },
              });
            }

            const userName = dbUser.name || dbUser.email?.split("@")[0] || "User";
            const orgName = `${userName}'s Workspace`;
            const baseSlug = userName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "workspace";
            const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

            const newOrg = await db.organization.create({
              data: {
                name: orgName,
                slug,
                planId: defaultPlan.id,
                members: {
                  create: {
                    userId: dbUser.id,
                    role: "OWNER",
                  },
                },
              },
            });

            await db.user.update({
              where: { id: dbUser.id },
              data: { activeOrganizationId: newOrg.id },
            });

            memberships = await db.organizationMember.findMany({
              where: { userId: token.id as string },
              include: { organization: true },
            });
          } catch (e) {
            console.error("Error auto-creating organization for user:", e);
          }
        }

        if (memberships.length > 0) {
          let targetOrgId: string | null = (trigger === "update" && session?.organizationId) ? session.organizationId : null;

          if (!targetOrgId && dbUser?.activeOrganizationId) {
            if (memberships.some((m) => m.organizationId === dbUser.activeOrganizationId)) {
              targetOrgId = dbUser.activeOrganizationId;
            }
          }

          if (!targetOrgId && token.organizationId) {
            if (memberships.some((m) => m.organizationId === (token.organizationId as string))) {
              targetOrgId = token.organizationId as string;
            }
          }

          if (!targetOrgId) {
            targetOrgId = memberships[0].organizationId;
          }

          const activeMem = memberships.find((m) => m.organizationId === targetOrgId) || memberships[0];

          token.organizationId = activeMem.organizationId;
          token.organizationSlug = activeMem.organization.slug;
          token.organizationName = activeMem.organization.name;
          token.role = activeMem.role;
          token.themeId = activeMem.organization.themeId;
          token.memberships = memberships.map((m) => ({
            orgId: m.organizationId,
            orgName: m.organization.name,
            orgSlug: m.organization.slug,
            role: m.role,
          }));
        }
      }

      if (trigger === "update" && session) {
        if (session.viewMode) token.viewMode = session.viewMode;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && token.id && token.organizationId) {
        session.user.id = token.id as string;
        (session.user as any).viewMode = (token.viewMode as string) || "CREATOR";
        (session as any).organizationId = token.organizationId;
        (session as any).organizationSlug = token.organizationSlug;
        (session as any).organizationName = token.organizationName;
        (session as any).role = token.role;
        (session as any).themeId = token.themeId;
        (session as any).memberships = token.memberships;
      } else {
        session.user = null as any;
      }
      return session;
    },
  },
});
