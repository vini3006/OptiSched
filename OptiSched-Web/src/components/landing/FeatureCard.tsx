import type { Feature } from "@/constants/landing";

type FeatureCardProps = {
  feature: Feature;
};

export function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <article className="card-elevated group rounded-2xl p-7 transition-transform duration-200 hover:-translate-y-1">
      <div className="inline-flex size-12 items-center justify-center rounded-xl border border-accent/30 bg-secondary">
        <Icon className="size-6 text-accent" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-primary">{feature.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
    </article>
  );
}