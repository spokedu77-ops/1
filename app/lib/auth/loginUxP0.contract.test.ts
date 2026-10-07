import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("SPOKEDU login UX P0 contracts", () => {
  it("redirects existing sessions away from /login", () => {
    const login = read("app/login/page.tsx");
    expect(login).toContain("router.replace(redirectPath)");
    expect(login).toContain("sessionChecked");
    expect(login).toContain("getSessionWithRefreshRecovery(supabase)");
    expect(read("app/lib/supabase/auth.ts")).toContain("supabase.auth.signOut({ scope: 'local' })");
    expect(login).toContain("enforceSessionOnlyPolicy");
  });

  it("routes the public root through the SPOKEDU marketing home", () => {
    const root = read("app/(spokedu-public)/page.tsx");
    expect(root).toContain("from '../spokedu/page'");
    expect(root).toContain("revalidate = 86400");
  });

  it("keeps the login persistence checkbox wired to session preference helpers", () => {
    const login = read("app/login/page.tsx");
    expect(login).toContain("이 기기에서 로그인 유지");
    expect(login).toContain("applyLoginSessionPreference(keepLoggedIn)");
    expect(login).toContain("readKeepLoggedInPreference");
    expect(read("app/layout.tsx")).toContain("registerEphemeralBrowserSession");
  });

  it("routes MASTER landing login CTAs through /login with next", () => {
    const contract = read("app/spokedu-master/lib/publicProductContract.ts");
    const chrome = read("app/spokedu-master/landing/components/LandingChrome.tsx");
    const landing = read("app/spokedu-master/landing/CommercialLanding.tsx");
    expect(contract).toContain(
      "dashboardLogin: '/spokedu-master/login?next=/spokedu-master/dashboard'",
    );
    expect(chrome).toContain('href={product.handoff.loginHref}');
    expect(landing).toContain("LandingLoggedInBanner");
  });

  it("keeps MASTER login/start handoffs in the marketing route contract", () => {
    const site = read("app/spokedu/data/site.ts");
    const landingModel = read("app/spokedu-master/landing/models/landingProduct.ts");
    expect(site).toContain(
      "dashboardLogin: '/spokedu-master/login?next=/spokedu-master/dashboard'",
    );
    expect(site).toContain(
      "onboardingLogin: '/spokedu-master/login?next=/spokedu-master/onboarding'",
    );
    expect(landingModel).toContain('getPublicProductContract()');
  });

  it("keeps MASTER OTP login separate from the operations account login", () => {
    const operationsLogin = read("app/login/page.tsx");
    const masterLogin = read("app/spokedu-master/login/page.tsx");
    expect(operationsLogin).not.toContain("MasterEmailOtpForm");
    expect(operationsLogin).toContain("ManualCredentialInput");
    expect(operationsLogin).toContain("SavedCredentialDecoy");
    expect(operationsLogin).not.toContain('autoComplete="username"');
    expect(operationsLogin).not.toContain('autoComplete="current-password"');
    expect(masterLogin).toContain("MasterEmailOtpForm");
    expect(masterLogin).toContain("ManualCredentialInput");
    expect(masterLogin).not.toContain('autoComplete="username"');
    expect(masterLogin).not.toContain('autoComplete="current-password"');
    expect(operationsLogin).not.toContain("NEXT_PUBLIC_TOSS_REVIEW_LOGIN_ENABLED");
    expect(masterLogin).toContain("NEXT_PUBLIC_TOSS_REVIEW_LOGIN_ENABLED");
    expect(masterLogin).toContain("signInWithPassword");
  });

  it('keeps MASTER auth errors safe and accurate', () => {
    const login = read('app/spokedu-master/login/page.tsx');
    const otp = read('app/components/auth/useMasterEmailOtp.ts');
    expect(login).toContain('카카오 로그인을 시작하지 못했습니다.');
    expect(login).not.toContain('카카오 로그인이 아직 설정되지 않았습니다.');
    expect(otp).toContain("error.status === 429");
    expect(otp).toContain("error.code === 'over_email_send_rate_limit'");
    expect(otp).not.toContain('authError.message');
  });
});
