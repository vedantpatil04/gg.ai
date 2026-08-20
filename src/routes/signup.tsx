import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  User,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { getRoleLandingPage } from "@/components/protected-route";
import { AuthBackground } from "@/components/auth/auth-background";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUTHORITY_DEPARTMENTS,
  AUTHORITY_DEPARTMENT_LABELS,
} from "@/lib/authority-departments";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — GreenGuard AI" }] }),
  component: SignupPage,
});

// ─── Roles Configuration ──────────────────────────────────────────────────────
// Administrator accounts cannot be created via public registration.
// Only Citizen (instant account creation) and Authority (official access request
// requiring Administrator approval) are available.
const ROLES: Array<{
  id: "citizen" | "authority";
  label: string;
  badge: string;
  badgeTone: "success" | "warning";
  desc: string;
  icon: LucideIcon;
}> = [
  {
    id: "citizen",
    label: "Citizen",
    badge: "Instant access",
    badgeTone: "success",
    desc: "Report incidents, monitor local air and water quality, and follow advisories.",
    icon: User,
  },
  {
    id: "authority",
    label: "Authority",
    badge: "Admin approval",
    badgeTone: "warning",
    desc: "Request official access to operate sensor networks, dispatch teams, and issue alerts.",
    icon: ShieldCheck,
  },
];

type PublicRole = (typeof ROLES)[number]["id"];

const COPY: Record<
  PublicRole,
  {
    heading: string;
    subheading: string;
    submitLabel: string;
    submitLoadingLabel: string;
  }
> = {
  citizen: {
    heading: "Create your account",
    subheading: "Join the environmental intelligence network.",
    submitLabel: "Create account",
    submitLoadingLabel: "Creating account…",
  },
  authority: {
    heading: "Authority Access Request",
    subheading:
      "Submit your official request to access the GreenGuard Authority Portal. Your request will be reviewed by a platform administrator before your account is activated.",
    submitLabel: "Submit access request",
    submitLoadingLabel: "Submitting request…",
  },
};

// ─── Brand Lockup ─────────────────────────────────────────────────────────────
function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex w-fit items-center gap-2.5 transition-opacity hover:opacity-90">
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-info)] text-primary-foreground shadow-lg shadow-[color:var(--color-primary)]/25",
          compact ? "size-8" : "size-9",
        )}
      >
        <Shield className="size-4" />
      </div>
      <span
        className={cn(
          "font-display font-semibold tracking-tight",
          compact ? "text-[15px]" : "text-base",
        )}
      >
        GreenGuard <span className="font-normal text-muted-foreground">AI</span>
      </span>
    </Link>
  );
}

// ─── Main Signup Page ─────────────────────────────────────────────────────────
function SignupPage() {
  const navigate = useNavigate();
  const { signup, user, isAuthenticated, isLoading } = useAuth();
  const [role, setRole] = useState<PublicRole>("citizen");

  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    department: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Avoid flashing the form while session is restoring
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate({ to: getRoleLandingPage(user.role) });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requestSubmitted) {
    return <AuthorityRequestSubmitted />;
  }

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: keyof typeof form) => {
    validateSingleField(field, form[field]);
  };

  const validateSingleField = (field: keyof typeof form, value: string) => {
    let errorMsg = "";

    if (field === "name") {
      if (!value.trim()) errorMsg = "Enter your full name.";
      else if (value.trim().length < 2) errorMsg = "Name must be at least 2 characters.";
    } else if (field === "email") {
      if (!value.trim()) errorMsg = "Please enter your email address.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        errorMsg = "Please enter a valid email address.";
      }
    } else if (field === "organization" && role === "authority") {
      if (!value.trim()) errorMsg = "Organization / Board is required.";
    } else if (field === "department" && role === "authority") {
      if (!value) errorMsg = "Please select a department.";
    } else if (field === "password") {
      if (!value) {
        errorMsg = "Password is required.";
      } else if (value.length < 8) {
        errorMsg = "Password must be at least 8 characters.";
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        errorMsg = "Must contain uppercase, lowercase, and a number.";
      }
    } else if (field === "confirmPassword") {
      if (!value) {
        errorMsg = "Please confirm your password.";
      } else if (value !== form.password) {
        errorMsg = "Passwords do not match.";
      }
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (errorMsg) next[field] = errorMsg;
      else delete next[field];
      return next;
    });

    return !errorMsg;
  };

  const handleRoleChange = (newRole: PublicRole) => {
    setRole(newRole);
    setServerError("");
    // Clear role-specific field errors when switching to Citizen
    if (newRole === "citizen") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.organization;
        delete next.department;
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validate all fields
    const errors: Record<string, string> = {};

    if (!form.name.trim()) errors.name = "Enter your full name.";
    else if (form.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";

    if (!form.email.trim()) errors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (role === "authority") {
      if (!form.organization.trim()) {
        errors.organization = "Organization / Board is required.";
      }
      if (!form.department) {
        errors.department = "Please select a department.";
      }
    }

    if (!form.password) {
      errors.password = "Password is required.";
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errors.password = "Must contain uppercase, lowercase, and a number.";
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!agree) {
      errors.agree = "Please accept the terms to continue.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setServerError("Please resolve the highlighted issues before submitting.");
      return;
    }

    setServerError("");
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
        phone: form.phone.trim() || undefined,
        ...(role === "authority"
          ? {
              organization: form.organization.trim(),
              department: form.department,
            }
          : {}),
      };

      const { user: newUser, pending } = await signup(payload);
      if (pending) {
        setRequestSubmitted(true);
      } else {
        navigate({ to: getRoleLandingPage(newUser.role) });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setServerError(msg ?? "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = COPY[role];
  const isAuthority = role === "authority";
  const glowColor = isAuthority ? "var(--color-info)" : "var(--color-primary)";
  const glowStyle = {
    boxShadow: `0 0 0 1px oklch(from ${glowColor} l c h / 0.3), 0 16px 40px -12px oklch(from ${glowColor} l c h / 0.4)`,
  };

  const isPasswordMatching =
    Boolean(form.confirmPassword) &&
    Boolean(form.password) &&
    form.confirmPassword === form.password &&
    form.password.length >= 8 &&
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password);

  const isPasswordMismatch =
    Boolean(form.confirmPassword && form.password && form.confirmPassword !== form.password);

  return (
    <AuthBackground accent={isAuthority ? "info" : "primary"}>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
        <div className="w-full max-w-2xl sm:max-w-3xl">
          {/* Header Brand Lockup */}
          <div className="mb-6 flex items-center justify-between sm:mb-8">
            <BrandMark />
            <Link
              to="/login"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors sm:text-sm"
            >
              Have an account? <span className="font-semibold text-primary">Sign in</span>
            </Link>
          </div>

          {/* Main Card */}
          <div className="rounded-2xl border border-border/80 bg-card/90 dark:bg-card/85 backdrop-blur-xl shadow-2xl p-6 sm:p-8 lg:p-10 transition-all duration-300">
            {/* Heading */}
            <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {copy.heading}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xl leading-relaxed">
                {copy.subheading}
              </p>
            </div>

            {/* Role Selection */}
            <div className="mt-7 sm:mt-8">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <span>Select Account Type</span>
              </div>

              <div
                role="radiogroup"
                aria-label="Select Account Type"
                className="grid sm:grid-cols-2 gap-3.5"
              >
                {ROLES.map((r) => {
                  const selected = role === r.id;
                  const isAuthRole = r.id === "authority";

                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleRoleChange(r.id)}
                      className={cn(
                        "group relative text-left rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected
                          ? isAuthRole
                            ? "border-info/80 bg-info/8 shadow-[0_0_0_1px_oklch(var(--info)/0.3),0_8px_20px_-6px_oklch(var(--info)/0.25)]"
                            : "border-primary/80 bg-primary/8 shadow-[0_0_0_1px_oklch(var(--primary)/0.3),0_8px_20px_-6px_oklch(var(--primary)/0.25)]"
                          : "border-border/80 bg-background/40 hover:border-primary/40 hover:bg-background/70 dark:bg-card/40 dark:hover:bg-card/70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={cn(
                            "size-10 rounded-xl grid place-items-center transition-colors shrink-0",
                            selected
                              ? isAuthRole
                                ? "bg-info/20 text-info"
                                : "bg-primary/20 text-primary"
                              : "bg-muted/80 text-muted-foreground group-hover:text-foreground",
                          )}
                        >
                          <r.icon className="size-5" />
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border tabular-nums",
                              r.badgeTone === "success"
                                ? "text-success border-success/30 bg-success/10"
                                : "text-warning border-warning/30 bg-warning/10",
                            )}
                          >
                            {r.badge}
                          </span>

                          <div
                            className={cn(
                              "size-4 rounded-full border grid place-items-center transition-colors",
                              selected
                                ? isAuthRole
                                  ? "border-info bg-info text-info-foreground"
                                  : "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 group-hover:border-muted-foreground/60",
                            )}
                          >
                            {selected && <div className="size-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5">
                        <div className="font-semibold text-foreground text-base tracking-tight">
                          {r.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {r.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Authority Official Notice Callout */}
            {isAuthority && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-info/30 bg-info/8 p-3.5 text-xs leading-relaxed text-foreground/90 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                <Info className="size-4 shrink-0 text-info mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Official Review: </span>
                  Authority accounts require review and approval by a platform administrator before activation.
                </div>
              </div>
            )}

            {/* Server Error Alert Banner */}
            {serverError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs sm:text-sm text-destructive"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4 sm:space-y-5">
              {/* Identity Row */}
              <div className="grid sm:grid-cols-2 gap-4">
                <InputField
                  id="signup-name"
                  label="Full name *"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  value={form.name}
                  error={fieldErrors.name}
                  onChange={(val) => handleInputChange("name", val)}
                  onBlur={() => handleBlur("name")}
                  accent={isAuthority ? "info" : "primary"}
                />

                <InputField
                  id="signup-email"
                  label="Email *"
                  type="email"
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  value={form.email}
                  error={fieldErrors.email}
                  onChange={(val) => handleInputChange("email", val)}
                  onBlur={() => handleBlur("email")}
                  accent={isAuthority ? "info" : "primary"}
                />
              </div>

              {/* Authority-specific Fields (Organization & Department) */}
              {isAuthority && (
                <div className="grid sm:grid-cols-2 gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                  <InputField
                    id="signup-org"
                    label="Organization / Board *"
                    placeholder="e.g. State Pollution Control Board"
                    autoComplete="organization"
                    value={form.organization}
                    error={fieldErrors.organization}
                    onChange={(val) => handleInputChange("organization", val)}
                    onBlur={() => handleBlur("organization")}
                    accent="info"
                  />

                  <div className="space-y-1.5">
                    <label
                      htmlFor="authority-department"
                      className="text-xs font-medium text-muted-foreground block"
                    >
                      Department *
                    </label>
                    <Select
                      value={form.department}
                      onValueChange={(val) => {
                        handleInputChange("department", val);
                        if (fieldErrors.department) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.department;
                            return next;
                          });
                        }
                      }}
                    >
                      <SelectTrigger
                        id="authority-department"
                        aria-label="Department"
                        className={cn(
                          "w-full h-11 rounded-xl border bg-background/50 px-3.5 text-sm outline-none transition-all",
                          fieldErrors.department
                            ? "border-destructive focus:ring-destructive/20"
                            : "border-input focus:border-info focus:ring-2 focus:ring-info/20",
                        )}
                      >
                        <SelectValue placeholder="Select your department" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 rounded-xl border border-border/80 bg-popover/95 dark:bg-[#121822] backdrop-blur-md shadow-xl dark:border-border/60 p-1.5 z-50">
                        {AUTHORITY_DEPARTMENTS.map((dept) => (
                          <SelectItem
                            key={dept}
                            value={dept}
                            className="rounded-lg py-2 pl-3 pr-8 text-sm font-medium cursor-pointer transition-colors focus:bg-info/10 focus:text-info dark:focus:bg-info/15 dark:focus:text-info data-[state=checked]:font-semibold data-[state=checked]:text-info"
                          >
                            {AUTHORITY_DEPARTMENT_LABELS[dept]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.department && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3 shrink-0" />
                        {fieldErrors.department}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Row (Phone) */}
              <div>
                <InputField
                  id="signup-phone"
                  label="Phone"
                  type="tel"
                  placeholder="+91 98XXXXXXX"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(val) => handleInputChange("phone", val)}
                  onBlur={() => handleBlur("phone")}
                  accent={isAuthority ? "info" : "primary"}
                />
              </div>

              {/* Security Row (Password & Confirm Password) */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Password Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-password"
                    className="text-xs font-medium text-muted-foreground block"
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={form.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      onBlur={() => handleBlur("password")}
                      className={cn(
                        "h-11 w-full rounded-xl border bg-background/50 px-3.5 pr-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50",
                        fieldErrors.password
                          ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                          : isAuthority
                            ? "border-input focus:border-info focus:ring-2 focus:ring-info/20"
                            : "border-input focus:border-primary focus:ring-2 focus:ring-primary/20",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" />
                      {fieldErrors.password}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Min 8 characters, uppercase, lowercase, and a number.
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-confirm-password"
                    className="text-xs font-medium text-muted-foreground block"
                  >
                    Confirm password *
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      onBlur={() => handleBlur("confirmPassword")}
                      className={cn(
                        "h-11 w-full rounded-xl border bg-background/50 px-3.5 pr-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50",
                        fieldErrors.confirmPassword || isPasswordMismatch
                          ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                          : isPasswordMatching
                            ? "border-success focus:border-success focus:ring-2 focus:ring-success/20"
                            : isAuthority
                              ? "border-input focus:border-info focus:ring-2 focus:ring-info/20"
                              : "border-input focus:border-primary focus:ring-2 focus:ring-primary/20",
                      )}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1">
                      {isPasswordMatching && (
                        <div className="size-5 rounded-full bg-success/15 grid place-items-center text-success mr-1">
                          <Check className="size-3" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {fieldErrors.confirmPassword ? (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" />
                      {fieldErrors.confirmPassword}
                    </p>
                  ) : isPasswordMismatch ? (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3 shrink-0" />
                      Passwords do not match.
                    </p>
                  ) : isPasswordMatching ? (
                    <p className="text-[11px] text-success flex items-center gap-1 mt-1">
                      <Check className="size-3" />
                      Passwords match.
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 text-xs text-muted-foreground cursor-pointer select-none py-1 group">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agree}
                    onChange={(e) => {
                      setAgree(e.target.checked);
                      if (e.target.checked && fieldErrors.agree) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.agree;
                          return next;
                        });
                      }
                    }}
                    className={cn(
                      "mt-0.5 size-4 rounded border-input cursor-pointer shrink-0 transition-colors",
                      isAuthority ? "accent-info" : "accent-primary",
                    )}
                  />
                  <span className="leading-relaxed">
                    I agree to the{" "}
                    <span className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors">
                      Terms of Service
                    </span>{" "}
                    and{" "}
                    <span className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors">
                      Data Processing Addendum
                    </span>
                    .
                  </span>
                </label>
                {fieldErrors.agree && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1 pl-7">
                    <AlertCircle className="size-3 shrink-0" />
                    {fieldErrors.agree}
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  style={glowStyle}
                  className="w-full h-11 sm:h-12 aurora text-primary-foreground rounded-xl text-sm sm:text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[var(--shadow-glow)] transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>{copy.submitLoadingLabel}</span>
                    </>
                  ) : (
                    <>
                      <span>{copy.submitLabel}</span>
                      <ChevronRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Bottom Sign-in Link */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline underline-offset-4 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}

// ─── Authority Request Confirmation Screen ────────────────────────────────────
function AuthorityRequestSubmitted() {
  return (
    <AuthBackground accent="info">
      <div className="flex min-h-[100dvh] items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="mb-6 flex justify-center">
            <BrandMark />
          </div>

          <div className="rounded-3xl border border-border/80 bg-card/90 dark:bg-card/85 backdrop-blur-xl shadow-2xl p-8 sm:p-10 text-center">
            <div className="mx-auto size-14 rounded-2xl bg-info/15 border border-info/30 grid place-items-center text-info shadow-lg shadow-info/10">
              <CheckCircle2 className="size-7" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-6 sm:text-3xl">
              Request Submitted Successfully
            </h1>

            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Your Authority Access Request has been received and logged in the platform registry.
            </p>

            <div className="my-5 rounded-xl border border-info/20 bg-info/5 p-4 text-xs leading-relaxed text-foreground/80 text-left flex items-start gap-2.5">
              <Info className="size-4 text-info shrink-0 mt-0.5" />
              <span>
                An administrator will review your agency credentials. You will be able to log in to
                the Authority Portal once your account has been approved.
              </span>
            </div>

            <Link
              to="/login"
              className="inline-flex w-full h-11 items-center justify-center aurora text-primary-foreground rounded-xl text-sm font-semibold shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 mt-2"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}

// ─── Reusable Input Field Component ───────────────────────────────────────────
function InputField({
  id,
  label,
  error,
  className,
  accent = "primary",
  onChange,
  onBlur,
  ...rest
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  accent?: "primary" | "info";
  onChange?: (val: string) => void;
  onBlur?: () => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onBlur">) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground block">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "h-11 w-full rounded-xl border bg-background/50 px-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50",
          error
            ? "border-destructive focus:ring-2 focus:ring-destructive/20"
            : accent === "info"
              ? "border-input focus:border-info focus:ring-2 focus:ring-info/20"
              : "border-input focus:border-primary focus:ring-2 focus:ring-primary/20",
        )}
      />
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
