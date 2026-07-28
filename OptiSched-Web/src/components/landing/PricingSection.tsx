import { pricingPlan } from "@/constants/landing";
import { PricingCard } from "@/components/landing/PricingCard";

export function PricingSection() {
  return (
    <section id="precos" className="border-t border-border bg-secondary/50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Plano
          </p>
          <h2 className="mt-3 text-3xl font-bold text-primary sm:text-4xl">
            Uma proposta feita para a sua instituição.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Sem valores fixos publicados — cada instituição tem um tamanho e uma
            necessidade diferente. Fale com nosso time e receba uma proposta sob medida.
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="w-full max-w-md">
            <PricingCard plan={pricingPlan} />
          </div>
        </div>
      </div>
    </section>
  );
}