"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Card, Field, OnboardingShell, PrimaryButton, SecondaryButton, inputCls } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabaseClient";

/** Context only. Typing experience never gates measurement and never
 *  becomes an ML feature (spec 5.2). All fields optional. */
const schema = z.object({
  age: z.string().optional(),
  gender: z.enum(["male", "female", "prefer_not_to_say", "unknown", ""]).optional(),
  typingExperience: z.enum(["regular", "occasional", "not_familiar", ""]).optional(),
  parkinsonContext: z.enum(["diagnosed", "monitoring", "research", ""]).optional(),
  diagnosisYear: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export default function DemographicsPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Form) => {
    const supa = supabaseBrowser();
    if (supa) {
      try {
        const { data } = await supa.auth.getUser();
        if (data?.user) {
          await supa.from("profiles").upsert({
            id: data.user.id,
            age: v.age ? Number(v.age) : null,
            gender: v.gender || null,
            typing_experience: v.typingExperience || null,
            parkinson_context: {
              context: v.parkinsonContext || null,
              diagnosis_year: v.diagnosisYear ? Number(v.diagnosisYear) : null,
            },
          });
        }
      } catch {
        /* proceed offline/locally */
      }
    }
    try {
      localStorage.setItem("parkintrace-context", JSON.stringify(v));
    } catch {
      /* private mode */
    }
    router.push("/layer");
  };

  return (
    <OnboardingShell
      step={2}
      steps={["Consent", "Context", "Choose"]}
      title="Background context"
      description="All of this is optional. It never changes how the timing is measured, and it is never used as a model input — it only helps interpret results for your age and setup."
    >
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Age (optional)" error={formState.errors.age?.message}>
            <input className={inputCls} type="number" min={0} max={130} {...register("age")} />
          </Field>

          <Field label="Sex / gender (optional)">
            <select className={inputCls} {...register("gender")} defaultValue="">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>

          <Field label="Typing experience (optional)">
            <select className={inputCls} {...register("typingExperience")} defaultValue="">
              <option value="">Skip</option>
              <option value="regular">Regular / experienced</option>
              <option value="occasional">Occasional</option>
              <option value="not_familiar">Not familiar</option>
            </select>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Recorded as context only. Your first session is a real measurement — there is no practice
              session, and typing experience does not gate anything.
            </p>
          </Field>

          <Field label="Parkinson context (optional)">
            <select className={inputCls} {...register("parkinsonContext")} defaultValue="">
              <option value="">Skip</option>
              <option value="diagnosed">Diagnosed</option>
              <option value="monitoring">Monitoring possible changes</option>
              <option value="research">Healthy / research participant</option>
            </select>
          </Field>

          <Field label="Year of diagnosis (optional)" error={formState.errors.diagnosisYear?.message}>
            <input className={inputCls} type="number" min={1900} max={2100} {...register("diagnosisYear")} />
          </Field>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PrimaryButton type="submit">Continue</PrimaryButton>
            <SecondaryButton type="button" onClick={() => router.push("/layer")}>
              Skip for now
            </SecondaryButton>
          </div>
        </form>
      </Card>
    </OnboardingShell>
  );
}
