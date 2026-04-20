"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, withTenant } from "../../db/client";
import {
  authUser,
  bookingSource,
  location,
  staff,
  tenant,
  tenantOnboarding
} from "../../db/schema";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step5Schema,
  type Industry,
  type OnboardingDraft,
  type Step1Input,
  type Step2Input,
  type Step3Input,
  type Step5Input
} from "./schemas";
import { readOnboardingCookie, writeOnboardingCookie } from "./session";

export interface ActionError {
  ok: false;
  field?: string;
  message: string;
}

export type ActionResult<T> = ({ ok: true } & T) | ActionError;

function fieldError(err: unknown): ActionError {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { path: (string | number)[]; message: string }[] }).issues;
    const first = issues[0];
    if (first) {
      const error: ActionError = { ok: false, message: first.message };
      if (first.path[0] !== undefined) error.field = String(first.path[0]);
      return error;
    }
  }
  return { ok: false, message: "Etwas ist schiefgelaufen. Bitte erneut versuchen." };
}

/**
 * Step 1: create tenant + tenant_onboarding row. Generates the tenant UUID up
 * front so we can pre-set `app.tenant_id` via withTenant and satisfy the
 * `id = app.tenant_id` RLS check on INSERT.
 */
export async function submitStep1(input: Step1Input): Promise<ActionResult<{ nextStep: 2 }>> {
  const parsed = step1Schema.safeParse(input);
  if (!parsed.success) return fieldError(parsed.error);
  const data = parsed.data;
  const tenantId = randomUUID();
  try {
    await withTenant(tenantId, async (tx) => {
      await tx.insert(tenant).values({
        id: tenantId,
        name: data.tenantName,
        billingEmail: data.billingEmail,
        industry: data.industry as Industry,
        settings: {}
      });
      const onboardingRow = await tx
        .insert(tenantOnboarding)
        .values({
          tenantId,
          currentStep: 2,
          draftJson: { step1: data } satisfies OnboardingDraft
        })
        .returning({ id: tenantOnboarding.id });
      const onboardingId = onboardingRow[0]?.id;
      if (!onboardingId) throw new Error("failed to create tenant_onboarding");
      await writeOnboardingCookie(tenantId, onboardingId);
    });
    return { ok: true, nextStep: 2 };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "unknown" };
  }
}

async function loadActiveOnboarding() {
  const session = await readOnboardingCookie();
  if (!session) throw new Error("no active onboarding session");
  return session;
}

async function withActiveTenant<T>(
  fn: (tx: Parameters<Parameters<typeof withTenant<T>>[1]>[0], ctx: {
    tenantId: string;
    onboardingId: string;
  }) => Promise<T>
): Promise<T> {
  const { tenantId, onboardingId } = await loadActiveOnboarding();
  return withTenant(tenantId, (tx) => fn(tx, { tenantId, onboardingId }));
}

export async function submitStep2(
  input: Step2Input
): Promise<ActionResult<{ nextStep: 3; locationId: string }>> {
  const parsed = step2Schema.safeParse(input);
  if (!parsed.success) return fieldError(parsed.error);
  const data = parsed.data;
  try {
    const result = await withActiveTenant(async (tx, { tenantId, onboardingId }) => {
      const ownerAuthId = randomUUID();
      await db.insert(authUser).values({
        id: ownerAuthId,
        email: data.ownerEmail,
        name: data.ownerName
      });
      const locationRow = await tx
        .insert(location)
        .values({
          tenantId,
          name: data.locationName,
          timezone: data.timezone
        })
        .returning({ id: location.id });
      const locationId = locationRow[0]?.id;
      if (!locationId) throw new Error("failed to create location");
      await tx.insert(staff).values({
        tenantId,
        locationId,
        authUserId: ownerAuthId,
        displayName: data.ownerName,
        role: "owner"
      });
      const onboardingRow = await tx.query.tenantOnboarding.findFirst({
        where: eq(tenantOnboarding.id, onboardingId)
      });
      const draft = mergeDraft(onboardingRow?.draftJson, { step2: data });
      await tx
        .update(tenantOnboarding)
        .set({ currentStep: 3, draftJson: draft, updatedAt: new Date() })
        .where(eq(tenantOnboarding.id, onboardingId));
      return locationId;
    });
    return { ok: true, nextStep: 3, locationId: result };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "unknown" };
  }
}

export async function submitStep3(
  input: Step3Input
): Promise<ActionResult<{ nextStep: 5; bookingSourceId: string | null }>> {
  const parsed = step3Schema.safeParse(input);
  if (!parsed.success) return fieldError(parsed.error);
  const data = parsed.data;
  try {
    const result = await withActiveTenant(async (tx, { tenantId, onboardingId }) => {
      let bookingSourceId: string | null = null;
      if (data.kind !== "later") {
        const locationRow = await tx.query.location.findFirst({
          where: eq(location.tenantId, tenantId)
        });
        if (!locationRow) throw new Error("location missing; complete step 2 first");
        const config = buildAdapterConfig(data);
        const inserted = await tx
          .insert(bookingSource)
          .values({
            tenantId,
            locationId: locationRow.id,
            adapter: data.kind,
            configJson: config
          })
          .returning({ id: bookingSource.id });
        bookingSourceId = inserted[0]?.id ?? null;
      }
      const onboardingRow = await tx.query.tenantOnboarding.findFirst({
        where: eq(tenantOnboarding.id, onboardingId)
      });
      const draft = mergeDraft(onboardingRow?.draftJson, { step3: data });
      await tx
        .update(tenantOnboarding)
        .set({
          currentStep: 5,
          bookingSource: data.kind,
          draftJson: draft,
          updatedAt: new Date()
        })
        .where(eq(tenantOnboarding.id, onboardingId));
      return bookingSourceId;
    });
    return { ok: true, nextStep: 5, bookingSourceId: result };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "unknown" };
  }
}

export async function submitStep5(input: Step5Input): Promise<ActionResult<{ done: true }>> {
  const parsed = step5Schema.safeParse(input);
  if (!parsed.success) return fieldError(parsed.error);
  const data = parsed.data;
  try {
    await withActiveTenant(async (tx, { tenantId, onboardingId }) => {
      const settings = {
        reminders: {
          windows: [
            ...(data.window24h ? ["t_24h"] : []),
            ...(data.window2h ? ["t_2h"] : [])
          ],
          preferChannel: data.preferWhatsapp ? "whatsapp" : "sms"
        },
        waitlist: { enabled: data.waitlistEnabled }
      };
      await tx
        .update(tenant)
        .set({ settings, updatedAt: new Date() })
        .where(eq(tenant.id, tenantId));
      const onboardingRow = await tx.query.tenantOnboarding.findFirst({
        where: eq(tenantOnboarding.id, onboardingId)
      });
      const draft = mergeDraft(onboardingRow?.draftJson, { step5: data });
      await tx
        .update(tenantOnboarding)
        .set({
          currentStep: 5,
          completedAt: new Date(),
          draftJson: draft,
          updatedAt: new Date()
        })
        .where(eq(tenantOnboarding.id, onboardingId));
    });
    return { ok: true, done: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "unknown" };
  }
}

function mergeDraft(existing: unknown, patch: Partial<OnboardingDraft>): OnboardingDraft {
  const base = (existing && typeof existing === "object" ? existing : {}) as OnboardingDraft;
  return { ...base, ...patch };
}

function buildAdapterConfig(data: Step3Input): Record<string, unknown> {
  if (data.kind === "csv") return { data: data.csvData, delimiter: "," };
  if (data.kind === "ical") return { feedUrl: data.feedUrl, defaultDurationMinutes: 30 };
  return {};
}
