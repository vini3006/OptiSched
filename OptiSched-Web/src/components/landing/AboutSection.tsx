import { ShieldCheck, Cpu, Eye } from "lucide-react";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Zero conflitos",
    text: "Nenhuma grade gerada viola qualificação, disponibilidade ou capacidade — é garantido pelo próprio modelo matemático.",
  },
  {
    icon: Cpu,
    title: "Geração automática",
    text: "Você cadastra os dados uma vez; o motor de otimização monta a grade inteira do semestre em segundos.",
  },
  {
    icon: Eye,
    title: "Visibilidade total",
    text: "Cada alocação fica registrada e rastreável, com histórico de todas as grades geradas por semestre.",
  },
];

export function AboutSection() {
  return (
    <section id="sobre" className="border-y border-border bg-secondary/50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              O que é o OptiSched?
            </p>
            <h2 className="mt-3 text-3xl font-bold text-primary sm:text-4xl">
              Da planilha manual à grade otimizada.
            </h2>
          </div>
          <div className="space-y-5 text-muted-foreground">
            <p className="leading-relaxed">
              Professores alocados em horários que não cursam, salas sem capacidade
              suficiente, disciplinas do mesmo período colidindo entre si. Montar a grade
              de um semestre à mão é um processo lento e sujeito a erro em qualquer
              instituição de ensino.
            </p>
            <p className="leading-relaxed">
              O OptiSched resolve isso com um motor de otimização matemática: você
              cadastra professores, disciplinas, salas e disponibilidades, e o sistema
              gera a grade completa do semestre, já validada contra todas as regras
              acadêmicas e institucionais.
            </p>
            <div className="space-y-5 border-t border-border pt-6">
              {highlights.map((h) => (
                <div key={h.title} className="flex items-start gap-4">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-secondary">
                    <h.icon className="size-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">{h.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {h.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}