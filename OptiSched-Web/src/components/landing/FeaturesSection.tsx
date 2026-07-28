import { features } from "@/constants/landing";
import { FeatureCard } from "@/components/landing/FeatureCard";

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Funcionalidades
        </p>
        <h2 className="mt-3 text-3xl font-bold text-primary sm:text-4xl">
          Tudo que sua agenda precisa, sem excesso.
        </h2>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </section>
  );
}