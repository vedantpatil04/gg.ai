import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { featureRequestApi } from "@/lib/api/support.api";
import { supportKeys } from "@/components/help-center/support/support-store";

// ─── Create Feature Request ───────────────────────────────────────────────────

export interface NewFeatureRequestInput {
  title:       string;
  description: string;
  category:    string;
  useCase:     string;
  tags:        string[];
}

export function useCreateFeatureRequest() {
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: NewFeatureRequestInput) =>
      featureRequestApi.create({
        title:       input.title,
        description: `${input.description}\n\n**Why it would be useful:**\n${input.useCase}`,
        category:    input.category,
        tags:        input.tags,
      }),
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: supportKeys.features() });
    },
  });

  const submit = useCallback(
    (input: NewFeatureRequestInput) => mutation.mutate(input),
    [mutation],
  );

  const reset = useCallback(() => {
    setSubmitted(false);
    mutation.reset();
  }, [mutation]);

  return {
    submitted,
    isSubmitting: mutation.isPending,
    isError:      mutation.isError,
    newFeature:   mutation.data,
    submit,
    reset,
  };
}
