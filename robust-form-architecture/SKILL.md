---
name: robust-form-architecture
description: >
  Form state management, validation, and submission architecture for Next.js + React Hook Form + Zod + Shadcn UI + Convex. Triggers on "create form", "form validation", "handleSubmit", "react hook form", "zod schema", "form error handling", "shadcn form", or "mutation form". Enforces schema-first validation, uncontrolled components with defaultValues, and defensive Convex submission pipelines with error mapping.
---

# Robust Form Architecture

Forms are data contracts, not UI decorations. Developers routinely ship broken forms that leak server errors to the console, allow double-submissions, and fail to map backend failures back to the user interface. 

This skill enforces a defensive, schema-first form architecture that treats every submission as an async transaction. We do not trust manual state. We do not trust implicit defaults. We handle errors explicitly at every boundary.

## DO / DON'T Quick Reference

| DO (Defensive Forms) | DON'T (The Bug Factory) | Why |
|---|---|---|
| Begin with a `z.object()` schema defining every field | Start with `useState` and `onChange` handlers | Schema is the source of truth. Manual state drifts and breeds validation bugs. |
| Use `useForm({ resolver: zodResolver(schema), defaultValues: { ... } })` | Call `useState` for individual fields or skip `defaultValues` | Uncontrolled components with explicit defaultValues prevent hydration mismatches and React controlled/uncontrolled warnings. |
| Compose with Shadcn `<FormField>`, `<FormControl>`, `<FormMessage>` | Write custom `<input>` with manual `value`/`onChange` | Shadcn Form components handle error display, accessibility, and field registration automatically. |
| Disable submit button via `form.formState.isSubmitting` | Manually track `isLoading` with useState | RHF's `isSubmitting` integrates with the handleSubmit lifecycle. Manual state misses edge cases. |
| Wrap mutation in `try/catch`, map errors with `form.setError("root", ...)` | Let errors throw to console or show generic alerts | Users need specific feedback. `setError` maps server failures directly to the form UI. |
| Call `form.reset()` on successful submission | Leave form data populated after success | Reset prevents accidental resubmissions and signals completion. |

## Execution Protocol

When instructed to build a form:

1. **The Schema:** Define a `z.object()` with every field explicitly typed. Export it for reuse in API contracts.
2. **The Defaults:** Create a `defaultValues` object that mirrors the schema exactly. Every field must have an initial value (empty string, false, null, etc.).
3. **The Hook:** Initialize `useForm` with `resolver: zodResolver(schema)` and the complete `defaultValues`.
4. **The UI Composition:** Wrap the form in `<Form {...form}>`. Use `<FormField>` for each input with `render={({ field }) => (...)}`. Render `<FormMessage />` below each field.
5. **The Submission Handler:** Write an async `onSubmit` that:
   - Wraps the mutation call in `try/catch`
   - On error: calls `form.setError("root", { message: error.message || "Submission failed" })`
   - On success: calls `form.reset()`
6. **The Submit Button:** Disable it when `form.formState.isSubmitting` or `!form.formState.isValid`.
7. **The Root Error:** Render a `<FormMessage />` or alert for `form.formState.errors.root` below the submit button.

## The Edge Cases / Anti-Patterns

**When NOT to use this skill:**
* **Simple Search Inputs:** A single text input that filters a list in real-time (no submit action) can use controlled state. This skill is for data-submission forms.
* **File Uploads:** File inputs require special handling beyond standard RHF registration. Use a dedicated file upload pattern with `useController` or a specialized library.
* **WYSIWYG Editors:** Rich text editors (TipTap, Quill) have their own state management. Wrap them with `Controller` from RHF, not standard `<FormField>`.

**The `useState` Ban Exception:**
You may use `useState` for UI-only state that does not affect form data (e.g., toggling a password visibility icon, expanding an accordion). Never use it for field values.

**Dynamic Field Arrays:**
For forms with dynamic fields (adding/removing items), use RHF's `useFieldArray` hook. The same schema and defaultValues rules apply, but wrap the array in `z.array()`.

## The Complete Pipeline

```tsx
// 1. THE SCHEMA (lib/schemas/userProfile.ts)
import { z } from "zod";

export const userProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  newsletter: z.boolean().default(false),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;

// 2. THE FORM COMPONENT (app/settings/profile-form.tsx)
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  userProfileSchema,
  type UserProfileFormData,
} from "@/lib/schemas/userProfile";

// 3. EXPLICIT DEFAULTVALUES - Every schema field must be present
const defaultValues: UserProfileFormData = {
  fullName: "",
  email: "",
  bio: "",
  newsletter: false,
};

export function ProfileForm() {
  // 4. THE HOOK with resolver and complete defaultValues
  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues,
    mode: "onBlur", // Validate on blur for better UX
  });

  const updateProfile = useMutation(api.users.updateProfile);

  // 5. THE SUBMISSION HANDLER with error mapping
  async function onSubmit(data: UserProfileFormData) {
    try {
      await updateProfile(data);
      // On success: reset the form
      form.reset();
    } catch (error: any) {
      // Map server error to the form UI
      const message = error?.data || error?.message || "Failed to update profile";
      form.setError("root", { message });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Root-level error display */}
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        {/* 6. THE UI COMPOSITION with FormField, FormControl, FormMessage */}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="jane@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newsletter"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Subscribe to newsletter</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* 7. THE SUBMIT BUTTON - disabled during submission */}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || !form.formState.isValid}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
}
```

## Field-Specific Server Errors

For Convex mutations that return field-level validation (e.g., "email already exists"):

```tsx
// In the mutation (Convex)
export const updateProfile = mutation({
  args: { email: v.string(), fullName: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .unique();
    
    if (existing && existing._id !== ctx.user._id) {
      throw new ConvexError({
        fieldErrors: { email: "Email already in use" }
      });
    }
    // ... save logic
  },
});

// In the form component
try {
  await updateProfile(data);
  form.reset();
} catch (error: any) {
  const serverErrors = error?.data?.fieldErrors;
  if (serverErrors) {
    // Map each field error individually
    Object.entries(serverErrors).forEach(([field, message]) => {
      form.setError(field as keyof UserProfileFormData, { message: message as string });
    });
  } else {
    form.setError("root", { message: error?.data || "Update failed" });
  }
}
```

## Non-Negotiable Checklist

Before marking a form as complete, verify:
- [ ] Zod schema exported and imported
- [ ] `defaultValues` has every schema field explicitly defined
- [ ] `useForm` uses `zodResolver` and `defaultValues`
- [ ] Every field uses `<FormField>` with `<FormControl>` and `<FormMessage>`
- [ ] Submit button disabled when `isSubmitting` or `!isValid`
- [ ] `try/catch` wraps the mutation
- [ ] `form.setError` maps server errors to UI
- [ ] `form.reset()` called on success
