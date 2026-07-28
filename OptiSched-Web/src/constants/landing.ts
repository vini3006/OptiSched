import {
  Brain,
  UserCheck,
  GraduationCap,
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
    icon: GraduationCap,
    title: "Grade por Curso e Semestre",
    text: "Disciplinas do mesmo curso e período nunca colidem entre si, garantindo que os alunos sempre consigam cursar sua grade obrigatória sem sobreposição.",
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
    "Agendas ilimitadas",
    "Múltiplas unidades e departamentos",
    "Otimização automática de grade",
    "Relatórios de ocupação",
    "API e integrações",
    "SSO e permissões avançadas",
    "Suporte dedicado",
  ],
};

export const WHATSAPP_NUMBER = "5500000000000"; //TODO: WhatsApp Business
export const WHATSAPP_MESSAGE = "Olá! Gostaria de saber mais sobre o OptiSched.";

export const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;