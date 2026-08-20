# Regeneração de grade escopada por Turma — plano de implementação

> Gap identificado em 2026-08-14 ao revisar `docs/school-mode-plan.md` contra o código real (ver `institution_mode_toggle.md` na memória): o backend já suporta escopar a geração de grade por `turmaId` desde uma fase bem anterior (`ScheduleGenerationRequest.java`, espelho exato do `courseId` existente — os dois são mutuamente exclusivos, `@AssertTrue "courseId and turmaId cannot both be set"`), mas o frontend nunca expôs esse campo. Hoje, pra uma instituição SCHOOL, todo clique em "Gerar grade" regenera a escola inteira de uma vez — não existe equivalente ao seletor "Curso" que já existe pro lado universidade. Este plano só adiciona o espelho no frontend; **nenhuma mudança de backend é necessária**.

## Contexto/padrão a espelhar

`GradesPage.tsx`'s dialog "Gerar grade" já tem um campo "Curso" (`generateCourseId`, `Select` com opção "Grade completa (todos os cursos)" + lista de cursos), visível só quando `!isSchool` (mascarado na Fase 8 do refactor de escola). O objetivo é o campo espelho "Turma", visível só quando `isSchool`, usando exatamente o mesmo padrão de Select — `turmas`/`Turma` já são buscados e importados nesse arquivo (reaproveitados da `ByTurmaView`, feita na mesma Fase 8).

## Arquivos a editar

1. **`OptiSched-Web/src/types/Schedule.ts`** — `ScheduleGenerationOptions` ganha `turmaId: number | null`, irmão de `courseId` (linha ~37).
2. **`OptiSched-Web/src/lib/validations/generate-schedule-schema.ts`** — `generateScheduleSchema` ganha `turmaId: z.number().int().positive().nullable()`, mesmo padrão de `courseId` (linha 15).
3. **`OptiSched-Web/src/api/schedules.ts`** — `generateSchedule()` (linhas 41-56+) inclui `turmaId: options.turmaId` no corpo do POST `/schedules/generate`, ao lado de `courseId: options.courseId`.
4. **`OptiSched-Web/src/pages/admin/GradesPage.tsx`**:
   - `useForm<GenerateScheduleFormValues>` (defaultValues, linha ~407) ganha `turmaId: null`.
   - Novo `const generateTurmaId = watch("turmaId");` ao lado de `generateCourseId` (linha 428).
   - `generateMutation`'s `mutationFn` passa `turmaId: values.turmaId` no objeto de opções (mesmo bloco que já monta `courseId: values.courseId`).
   - No dialog "Gerar grade" (`Field` do curso, hoje `{!isSchool && (...)}` — ver Fase 8 do refactor), adicionar irmão `{isSchool && (<Field>...)}` com um `Select` de Turma idêntico em estrutura ao de Curso: opção "ALL" = "Grade completa (todas as turmas)" + `turmas?.map(...)`, `onValueChange={(value) => setValue("turmaId", value === "ALL" ? null : Number(value))}`.
5. **`OptiSched-Web/src/i18n/locales/pt-BR/admin-grades.ts`** — 3 chaves novas espelhando `generateCourseLabel`/`generateCourseDescription`/`generateCourseAllOption`: `generateTurmaLabel: "Turma"`, `generateTurmaDescription: "Restrinja a geração a uma única turma — as grades já ativas das outras turmas são respeitadas e não são alteradas."`, `generateTurmaAllOption: "Grade completa (todas as turmas)"`.

## O que NÃO muda

- Backend: zero mudança — `ScheduleGenerationService.generateSchedule()` já lê `options.turmaId()` desde a fase antiga que implementou geração por Turma.
- `ByTurmaView` (visualização) — já existe, não precisa de nada novo.
- XOR `courseId`/`turmaId` — garantido de graça pelo `isSchool` só mostrar um dos dois campos por vez (o campo escondido continua `null`).

## Verificação

1. `cd OptiSched-Web && npx tsc -b --force && npm run lint` — limpo (lembrar: `npx tsc --noEmit` sozinho não checa nada nesse repo, usar sempre `-b --force`).
2. Smoke test manual (pode ser feito junto com a Fase 9 pendente de `docs/school-mode-plan.md`/`docs/school-refactor-plan.md`): numa instituição SCHOOL com 2+ turmas já com grade gerada, usar "Gerar grade" escopado pra uma turma só e confirmar que a grade da outra turma não muda (mesmo teste que o item 3 da Fase 9 antiga pedia, hoje desbloqueado).

---

## Próxima fase (planejamento futuro, não iniciado)

Depois que este plano for executado, a próxima frente é uma **versão de demo do OptiSched que não persiste nada no banco** — toda a informação (instituição, cursos/turmas, disciplinas, professores, grade gerada etc.) vive só dentro da aplicação (provavelmente estado em memória/sessão do navegador, a definir), sem gravar no Postgres. Objetivo declarado pelo usuário: permitir demonstração/teste sem tocar em dados reais.

Ainda não sabemos o mecanismo exato (client-side puro vs. backend com storage efêmero vs. outra abordagem) — isso fica pra ser desenhado com uma exploração própria do código quando essa fase for aberta, não deve ser assumido a partir daqui. Não começar essa investigação agora; é só um marcador de próximo passo.
