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
    text: "Você cadastra os dados uma vez; o motor de otimização monta a grade inteira do período letivo em segundos.",
  },
  {
    icon: Eye,
    title: "Visibilidade total",
    text: "Cada alocação fica registrada e rastreável, com histórico de todas as grades já geradas.",
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
              Montar a grade horária de uma instituição de ensino é um problema clássico:
              professores acabam alocados em horários em que não estão disponíveis, salas
              ficam sem capacidade suficiente e aulas obrigatórias acabam se sobrepondo no
              mesmo horário. Feito à mão, é um processo lento e sujeito a erro — e o erro
              geralmente só aparece depois que as aulas já começaram.
            </p>
            <p className="leading-relaxed">
              O OptiSched resolve esse problema com um motor de otimização matemática: você
              cadastra professores, disciplinas, salas e disponibilidades, e o sistema
              gera a grade completa do período letivo, já validada contra todas as regras
              acadêmicas e institucionais — seja o currículo organizado por curso e
              semestre, como numa universidade, ou por série e turma, como numa escola.
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