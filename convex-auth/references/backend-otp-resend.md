# Backend OTP + Resend

Build backend first. Client code without backend auth is cosplay.

## Required Packages

```bash
bun add convex @convex-dev/auth @auth/core @oslojs/crypto resend convex-helpers
```

Use matching package manager for repo. Do not install random auth SDKs because blog post said so.

## File Layout

```text
convex/
  auth.ts
  auth.config.ts
  http.ts
  schema.ts
  users.ts
  mails/ResendOTP.ts
  mails/templates/otpEmail.ts
  schema/users.ts
  lib/functions.ts
```

## Auth Core

`convex/auth.ts` owns providers. Provider id must match frontend `signIn("resend-otp")`.

```ts
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./mails/ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    ResendOTP,
    Google({
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  jwt: {
    customClaims: async (ctx, { userId }) => {
      const user = await ctx.db.get(userId);

      return { role: user?.role ?? "user" };
    },
  },
});
```

If OAuth env is absent, omit OAuth providers. Dead providers create runtime noise.

## Auth Config + HTTP Routes

`convex/auth.config.ts`:

```ts
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

`convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
```

Without `auth.addHttpRoutes(http)`, auth routes do not exist. Debugging that later wastes oxygen.

## User Schema

```ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const usersTable = defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
  onboardingComplete: v.optional(v.boolean()),
})
  .index("email", ["email"])
  .index("by_role", ["role"]);
```

```ts
import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { usersTable } from "./schema/users";

export default defineSchema({
  ...authTables,
  users: usersTable,
});
```

## Resend OTP Provider

```ts
import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { ConvexError } from "convex/values";
import { Resend as ResendAPI } from "resend";
import { generateOtpEmailHtml, generateOtpEmailText } from "./templates";

const OTP_LENGTH = 6;
const OTP_MAX_AGE_SECONDS = 60 * 15;
const DEFAULT_FROM = "App <onboarding@resend.dev>";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  maxAge: OTP_MAX_AGE_SECONDS,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    return generateRandomString(random, "0123456789", OTP_LENGTH);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: process.env.AUTH_RESEND_FROM ?? DEFAULT_FROM,
      to: [email],
      subject: "Sign in",
      html: generateOtpEmailHtml(token),
      text: generateOtpEmailText(token),
    });

    if (error) {
      throw new ConvexError({
        code: "EMAIL_SEND_FAILED",
        message: JSON.stringify(error),
      });
    }
  },
});
```

Use `RESEND_API_KEY` consistently. Do not mix `AUTH_RESEND_KEY` and `RESEND_API_KEY` unless inherited repo already does.

## Current User Query

Every app needs boring, reliable current-user query.

```ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const currentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
      onboardingComplete: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      image: user.image,
      email: user.email,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
    };
  },
});
```

## Anti-Patterns

- Do not omit `returns` validators. Convex types only help if you feed them.
- Do not throw raw Resend errors to client UI. Wrap server failures.
- Do not read `_generated/*` before `convex dev` or `convex codegen` has produced files.
- Do not run `convex dev` unless user approves. It creates deployment state.
