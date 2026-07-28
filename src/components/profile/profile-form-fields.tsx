import { useId } from "react";
import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useFormState } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Phase 10 — Accessibility upgrades.
 *
 * ProfileTextField now adds:
 *  - `aria-required` when the field is marked required, so screen readers
 *    announce it without relying solely on the visual "*" indicator.
 *  - `aria-invalid` when the field has a validation error, triggering
 *    error-state announcements in screen readers.
 *  - `aria-describedby` linking the input to its FormMessage element when
 *    an error is present, so the error text is read alongside the field.
 *
 * ReadOnlyField now adds:
 *  - `aria-readonly="true"` and `role="textbox"` so screen readers report
 *    it as a disabled/read-only input rather than plain decorative text.
 */

/** A labeled section of a profile form — groups related fields with a
 *  heading, matching the spec's four-section structure (Basic Information,
 *  Contact Information, Personal Details, Address). Reusable by future
 *  Settings/Security forms. */
export function ProfileFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

/** A single editable text/date field wired to react-hook-form. */
export function ProfileTextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
  maxLength,
  required,
  className,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  required?: boolean;
  className?: string;
}) {
  const errorId = useId();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const hasError = Boolean(fieldState.error);
        return (
          <FormItem className={className}>
            <FormLabel>
              {label}
              {required && (
                <span className="text-destructive" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
            </FormLabel>
            <FormControl>
              <Input
                type={type}
                placeholder={placeholder}
                maxLength={maxLength}
                max={type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
                aria-required={required ? "true" : undefined}
                aria-invalid={hasError ? "true" : undefined}
                aria-describedby={hasError ? errorId : undefined}
                {...field}
              />
            </FormControl>
            <FormMessage id={errorId} />
          </FormItem>
        );
      }}
    />
  );
}

/** A single editable dropdown field wired to react-hook-form. */
export function ProfileSelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  className,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value || undefined} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** A non-editable field shown alongside editable ones in the same grid.
 *  Styled to visually read as "locked". Now correctly announced to screen
 *  readers as a read-only textbox. */
export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <span
        className="text-sm font-medium leading-none text-muted-foreground"
        id={`ro-label-${label}`}
      >
        {label}
      </span>
      <div
        role="textbox"
        aria-readonly="true"
        aria-labelledby={`ro-label-${label}`}
        className="flex h-9 w-full items-center rounded-md border border-dashed border-input bg-muted/30 px-3 text-sm text-muted-foreground truncate cursor-not-allowed"
      >
        {value}
      </div>
    </div>
  );
}

// Re-export useFormState for consumers that need error-driven descriptions
// without importing RHF directly — keeps the form-fields module as the
// single import for form utility needs in the profile drawer.
export { useFormState };
