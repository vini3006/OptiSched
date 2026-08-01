import { ShieldCheck, Sparkles } from "lucide-react";

import heroSchedule from "@/assets/images/hero-schedule.webp";

export function HeroSection() {
  return (
    <section id="inicio" className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-secondary px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5 text-accent" />
            Otimização matemática de grade horária
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] text-primary sm:text-5xl lg:text-[3.4rem]">
            Grades acadêmicas sem conflitos, geradas com{" "}
            <span className="text-gold-gradient">inteligência</span>.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            O OptiSched monta a grade horária da sua instituição automaticamente,
            respeitando qualificação de professores, disponibilidade e capacidade das
            salas — eliminando conflitos que hoje levam dias para resolver manualmente.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#precos"
              className="btn-gold rounded-xl px-6 py-3 text-center text-sm font-semibold"
            >
              Começar Agora
            </a>
            <a
              href="#funcionalidades"
              className="rounded-xl border border-primary/25 px-6 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-secondary"
            >
              Saiba Mais
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-accent" /> Dados protegidos
            </span>
            <span>Sem conflitos de horário</span>
            <span>Grade gerada em minutos</span>
          </div>
        </div>

        <div className="relative perspective-[1800px]">
          <div
            aria-hidden
            className="absolute -inset-8 rounded-[2rem] bg-accent/15 blur-3xl"
          />
          <div
            className="relative transform-3d rotate-x-[4deg] rotate-y-[-10deg] rounded-[1.75rem] border border-border bg-card p-3 shadow-2xl transition-transform duration-500 ease-out hover:rotate-x-[2deg] hover:rotate-y-[-5deg]"
          >
            <img
              src={heroSchedule}
              alt="Grade horária acadêmica gerada automaticamente pelo OptiSched"
              width={2994}
              height={2236}
              className="w-full rounded-xl border border-border/60"
            />
          </div>
        </div>
      </div>
    </section>
  );
}