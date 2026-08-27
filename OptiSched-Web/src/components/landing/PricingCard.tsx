import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PricingPlan } from "@/constants/landing";
import { whatsappLink } from "@/constants/landing";

type PricingCardProps = {
  plan: PricingPlan;
};

export function PricingCard({ plan }: PricingCardProps) {
  return (
    <article className="card-elevated flex flex-col rounded-2xl p-8">
      <h3 className="text-xl font-semibold text-primary">{plan.name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
            {perk}
          </li>
        ))}
      </ul>
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gold mt-8 rounded-xl px-5 py-3 text-center text-sm font-semibold"
      >
        Solicitar Demonstração
      </a>
      <Link
        to="/demo"
        className="mt-3 text-center text-sm font-medium text-primary underline decoration-accent/50 decoration-2 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
      >
        Ou teste grátis agora, sem cadastro →
      </Link>
    </article>
  );
}