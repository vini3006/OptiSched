import {
  Brain,
  UserCheck,
  Landmark,
  UserCog,
  FileSpreadsheet,
  History,
  type LucideIcon
} from "lucide-react";

export const navLinks = [
  {
    href: "#inicio",
    label: "Início",
  },
  {
    href: "#funcionalidades",
    label: "Funcionalidades",
  },
  {
    href: "#sobre",
    label: "Sobre",
  },
  {
    href: "#precos",
    label: "Assinatura",
  },
];

export type Feature = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export const features: Feature[] = [
  {
    icon: Brain,
    title: "Otimização Automática de Grade",
    text: "Um motor de otimização matemática gera a grade horária ideal, respeitando qualificação dos professores, capacidade das salas e disponibilidade — sem conflitos de horário.",
  },
  {
    icon: UserCheck,
    title: "Qualificação e Disponibilidade Docente",
    text: "Cada professor é alocado apenas nas disciplinas para as quais está qualificado e nos horários em que está disponível, eliminando alocações inviáveis desde o início.",
  },
  {
    icon: Landmark,
    title: "Universidades e Escolas",
    text: "Currículo por curso e semestre ou por série e turma — o mesmo motor garante que a grade obrigatória de cada aluno nunca tenha sobreposição, seja qual for o modelo da sua instituição.",
  },
  {
    icon: UserCog,
    title: "Painel do Professor",
    text: "Cada professor cadastra sua própria disponibilidade, consulta as disciplinas em que está qualificado e acompanha a agenda gerada — podendo exportar pra Google Calendar ou qualquer app de calendário.",
  },
  {
    icon: FileSpreadsheet,
    title: "Importação em Massa via CSV",
    text: "Já tem professores, disciplinas, salas e ofertas numa planilha? Importe tudo de uma vez via CSV, sem digitar registro por registro.",
  },
  {
    icon: History,
    title: "Histórico e Trava de Grades",
    text: "Toda grade gerada fica salva com versão e data. Precisa regenerar só uma parte? Trave as aulas que não podem mudar e o otimizador ajusta só o resto.",
  },
];

export type PricingPlan = {
  name: string;
  desc: string;
  perks: string[];
};

export const pricingPlan: PricingPlan = {
  name: "OptiSched",
  desc: "Um plano sob medida para o tamanho e as necessidades da sua instituição.",
  perks: [
    "Teste grátis, sem cadastro",
    "Otimização automática de grade",
    "Agendas ilimitadas",
    "Importação e exportação via CSV",
    "Histórico de versões da grade",
    "Painel de autosserviço pro professor",
    "Exportação de agenda (Google Calendar/.ics)",
    "Suporte dedicado",
  ],
};

export const WHATSAPP_NUMBER = "5500000000000"; //TODO: WhatsApp Business
export const WHATSAPP_MESSAGE = "Olá! Gostaria de saber mais sobre o OptiSched.";

export const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;