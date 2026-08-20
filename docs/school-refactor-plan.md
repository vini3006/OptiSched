# Remodelagem do Modo Escola (Série/Currículo/Turma sem semestre) — plano de implementação

> Gerado em 2026-08-13, no mesmo dia em que as Fases 1-7 de `docs/school-mode-plan.md` foram concluídas e testadas ponta a ponta (152/152 testes Java, 83/83 Python, `tsc`/`lint` limpos, smoke test manual em navegador). Este doc **substitui** as Fases 1, 3 e 7 daquele plano antigo — o resto (Fase 2: correção de NPEs; Fase 5: claim JWT `institution_type`; Fase 6: `InstitutionsPage`) continua válido e não é reaberto aqui.
>
> Motivo da remodelagem: o usuário revisou o modelo de Turma implementado (Turma 1:1 com Semestre + "Ofertas de Turma" como CRUD manual, espelhando o modelo universitário Curso/Oferta) e apontou que não reflete a realidade de uma escola — turma não é dividida por semestre, não existe "oferta de turma" manual, e o currículo (quais disciplinas, com que carga horária) é fixo por **série**, não por turma individual.
>
> Uso: marque `[x]` conforme cada item for concluído e verificado. O comando `/refactor-school` (em `.claude/commands/refactor-school.md`) sabe ler este arquivo e continuar de onde parou.

## Fase 0 — Decisões de design (já fechadas com o usuário, não revisitar sem pedido novo)

- [x] **Série** (`Serie`) é uma entidade nova, com currículo fixo via **SerieSubject** (Série × Disciplina, com carga horária semanal própria — não reaproveita `Subject.workload`, que é uma carga genérica única por disciplina na instituição inteira e não varia por série).
- [x] **Turma** perde o vínculo com `Semester`; ganha `serie` (FK, obrigatório) + `year` (Integer, obrigatório). Várias turmas podem compartilhar a mesma série (9º Ano A, B, C).
- [x] **"Ofertas de Turma" desaparece como CRUD manual.** Uma sincronização automática nova materializa as linhas de `subject_offering` (turma-mode) a partir do currículo da série, no momento de gerar a grade — o admin nunca vê/gerencia isso diretamente.
- [x] `SubjectOffering` ganha um campo `weeklyWorkload` nullable — só turma-mode (preenchido pela sincronização a partir de `SerieSubject.weeklyWorkload`); ofertas curso-mode continuam usando `Subject.workload` (campo fica `null` nelas).
- [x] `Semester` **não muda de schema/entidade**. Mascaramento é 100% frontend: pra instituição SCHOOL, a UI de período esconde o seletor de `term`, mostra só "Ano", relabela pra "Ano Letivo", e manda `term: "FIRST"` fixo no payload. O unique constraint `(institution_id, year, term)` já impede a mesma instituição criar dois "anos letivos" pro mesmo ano.
- [x] Migrations são novas (V22+), nunca reescrevendo V18-V21 já aplicadas.
- [x] Isso desfaz parte da Fase 3/7 antigas: `createByTurma`/`updateByTurma`/`importTurmaOfferingsFromCsv`/`exportTurmaOfferingsToCsv` e a aba "Ofertas de Turma" inteira são **removidos**, não mantidos em paralelo.

## Modelo de dados final

```
Serie (nova)
  id, name, order(nullable), institution_id, timestamps
  unique(institution_id, name)

SerieSubject (nova, currículo — @EmbeddedId composto, mesmo padrão de ProfessorQualification)
  serie_id + subject_id (PK composta), weekly_workload (Integer, obrigatório), institution_id, timestamps

Turma (alterada)
  remove: semester_id
  adiciona: serie_id (FK, obrigatório), year (Integer, obrigatório)
  mantém: name, shift, expected_students, institution_id
  unique(institution_id, year, name)   -- antes era (institution_id, semester_id, name)

SubjectOffering (alterada)
  adiciona: weekly_workload (Integer, nullable — só turma-mode)
  resto sem mudança (course/turma continuam XOR; semester_id continua NOT NULL)

Semester — sem mudança de schema/entidade.
```

## Fase 1 — Schema/Migrations

- [x] `V22__create_serie_table.sql`: tabela `serie` (id, name, "order" nullable, institution_id FK, created_at, updated_at), unique `(institution_id, name)`.
- [x] `V23__create_serie_subject_table.sql`: tabela `serie_subject` (serie_id FK, subject_id FK, weekly_workload NOT NULL, institution_id FK, created_at, updated_at), PK composta `(serie_id, subject_id)`.
- [x] `V24__alter_turma_drop_semester_add_serie_and_year.sql`: em `turma` — dropar FK/coluna `semester_id` e o unique antigo `(institution_id, semester_id, name)`; adicionar `serie_id` (FK NOT NULL) e `year` (INTEGER NOT NULL); criar unique novo `(institution_id, year, name)`.
- [x] `V25__add_weekly_workload_to_subject_offering.sql`: em `subject_offering` — adicionar `weekly_workload` (INTEGER, nullable).
- [x] Sintaxe validada com dry-run (`BEGIN; ...; ROLLBACK;`) contra o Postgres local real — as 4 migrations rodam sem erro e o schema resultante bate com o modelo planejado (`turma` sem `semester_id`, com `serie_id`+`year`; `serie`/`serie_subject` criadas; `subject_offering.weekly_workload` adicionada). Nada foi persistido (rollback), já que a tabela `turma` estava vazia (sem dados de teste sobrando) e a aplicação real do Flyway (com registro em `flyway_schema_history`) só acontece no próximo boot da API — que só deve ocorrer depois da Fase 2, pois `ddl-auto=validate` vai comparar a entidade `Turma` atual (ainda com campo `semester`) contra o schema novo e falhar até lá.
- [x] Verificação: `mvn test` (152/152 verde, zero regressão) — rodado ao final da Fase 2, junto com a aplicação real das migrations via Flyway/Hibernate `ddl-auto=validate` contra o datasource de teste.

## Fase 2 — Entidades e repositórios (backend)

- [x] `Serie.java` — entidade nova (id, name, order, institution, timestamps via `Auditable`/padrão existente).
- [x] `SerieSubjectId.java` — `@Embeddable` composto (serieId, subjectId), mesmo padrão de `ProfessorQualificationId`.
- [x] `SerieSubject.java` — entidade nova (`@EmbeddedId`, `@MapsId` pra serie e subject, weeklyWorkload, institution).
- [x] `Turma.java` — remover campo/relação `semester`; adicionar `serie` (`@ManyToOne` obrigatório) e `year` (Integer obrigatório).
- [x] `SubjectOffering.java` — adicionar campo `weeklyWorkload` (Integer, nullable).
- [x] `SerieRepository.java`, `SerieSubjectRepository.java` — novos, CRUD básico + `findAllByInstitutionId`/`findById_SerieIdAndInstitutionId` conforme necessário.
- [x] `TurmaRepository.java` — removida `findBySemesterId`, adicionadas `findAllByInstitutionIdAndYear`/`findBySerieId`.
- [x] Ajuste mecânico necessário pra manter o módulo compilando (não estava listado originalmente, mas é inevitável — Maven compila o módulo inteiro, não por camada): `TurmaRequest`/`TurmaResponse` (`semesterId` → `serieId`+`year`), `TurmaMapper`, `TurmaService` (troca `SemesterRepository` por `SerieRepository`, valida `serieId` em vez de `semesterId`) e `TurmaServiceTest` (mocks/asserts atualizados pro novo shape). Isso é só o *swap* mecânico de campo — a validação mais rica de Série/Currículo completa continua na Fase 4.
- [x] Verificação: `mvn -o clean test-compile` limpo (usando `mvn` do sistema — o `./mvnw` do repo está com `.mvn/wrapper/` ausente, não investigado agora) e `mvn -o test` → 152/152, zero regressão.

## Fase 3 — Remoção do CRUD manual de Ofertas de Turma + sincronização automática

- [x] `SubjectOfferingService.java` — deletados `createByTurma`, `updateByTurma`, `importTurmaOfferingsFromCsv`, `exportTurmaOfferingsToCsv`, `findByTurma`; `create()`/`update()` voltaram a ser só curso-mode (sem dispatch); `TurmaRepository` removido do construtor (não é mais usado nesse service).
- [x] `SubjectOfferingRequest` — removido `turmaId` e a validação XOR curso/turma; `courseId` e `section` voltaram a `@NotNull`/`@NotBlank`.
- [x] `SubjectOfferingController.java` — removidos `/subject-offerings/import-turma`, `/subject-offerings/export-turma`, e o filtro `?turmaId=` em `findAll`.
- [x] `TurmaOfferingSyncService.java` (novo) — `syncOfferings(Long institutionId, Semester semester)`: para cada `Turma` da instituição com `turma.year == semester.year`, para cada `SerieSubject` da `serie` da turma, find-or-create um `SubjectOffering(turma, subject, semester)` com `expectedStudents`/`weeklyWorkload` derivados (`subjectOfferingRepository.findByTurmaIdAndSubjectIdAndSemesterId` novo, usado pro find-or-create); remove ofertas órfãs (par turma+subject fora do currículo atual) checando `scheduleEntryRepository.existsBySubjectOfferingId` (novo) antes de apagar — evita depender de capturar `DataIntegrityViolationException` no meio de uma transação maior.
- [x] `ScheduleGenerationService.generateSchedule()` — chama `turmaOfferingSyncService.syncOfferings(institutionId, semester)` logo após resolver o `Semester`, antes do fetch de `SubjectOffering`s.
- [x] `OptimizationRequestMapper.toSubjectOfferingInput()` — `requiredTimeSlots = offering.getWeeklyWorkload() != null ? offering.getWeeklyWorkload() : offering.getSubject().getWorkload()`.
- [x] Testes ajustados: `SubjectOfferingServiceTest` reescrito (removidos os testes de `createByTurma`/`update` trocando de modo; `SubjectOfferingRequest` agora com 6 campos posicionais); `SubjectOfferingServiceCsvImportTest` só perdeu a dependência de `TurmaRepository` (não tinha testes de turma); `ScheduleGenerationServiceTest` ganhou mock de `TurmaOfferingSyncService` no construtor (void, sem stub necessário — os testes de geração escopada por turma continuam cobrindo o entity `SubjectOffering.turma`, que não mudou).
- [x] Verificação: `mvn -o test` → **148/148 verde, zero regressão** (148 em vez de 152 porque 5 testes do CRUD manual de turma foram removidos — funcionalidade que deixou de existir — e 2 testes de validação de request foram adicionados no lugar).

## Fase 4 — CRUD completo de Série/Currículo (backend)

- [x] `SerieRequest`/`SerieResponse`/`SerieMapper`/`SerieService`/`SerieController` (`/series`) — clone do padrão de `Turma` (guard: só instituição SCHOOL pode ter Série; duplicidade por nome; delete captura `DataIntegrityViolationException` → `ResourceInUseException`).
- [x] `SerieSubjectRequest`/`SerieSubjectResponse`/`SerieSubjectMapper`/`SerieSubjectService`/`SerieSubjectController` (`/serie-subjects`) — CRUD de par único (create/findAll+filtros `serieId`/`subjectId`/delete), mesmo padrão de `ProfessorQualificationController`/`Service`. CSV import/export **não implementado** (fica pra depois se algum dia fizer falta — a Fase 7 usa o dialog master-detail pra adicionar par a par, sem necessidade de bulk).
- [x] `TurmaRequest`/`TurmaResponse`/`TurmaMapper`/`TurmaService`/`TurmaController` — já estava em `serieId`+`year` desde o ajuste mecânico da Fase 2; nada extra necessário aqui.
- [x] Testes novos: `SerieServiceTest` (6 casos: create feliz/guard de tipo/duplicidade, findById inexistente, update, delete) e `SerieSubjectServiceTest` (6 casos: create feliz/guard de tipo/duplicidade, findBySerie inexistente, delete inexistente/feliz).
- [x] Verificação: `mvn -o test` → **160/160 verde** (148 da Fase 3 + 12 novos), zero regressão.

## Fase 5 — Otimizador (Python)

- [x] Confirmado: `models.py`/`mapper.py` só conhecem `required_time_slots` (int genérico) e `turma_id` (já existente desde o plano antigo, usado no conflict-set C4) — nenhuma referência a carga horária por série, nenhuma mudança necessária.
- [x] Verificação: `.optivenv/bin/python -m pytest -q` → **83/83 verde**, sem alteração de código nesta fase.

## Fase 6 — Frontend: tipos/API/schemas

- [x] `types/Serie.ts`, `types/SerieSubject.ts` (novos).
- [x] `api/series.ts`, `api/serie-subjects.ts` (novos, incluindo `listSerieSubjectsBySerie` pro dialog de currículo da Fase 7).
- [x] `lib/validations/serie-schema.ts`, `lib/validations/serie-subject-schema.ts` (novos) + chaves i18n novas (`serie.*`/`serieSubject.*`) em `validations.ts`.
- [x] `types/Turma.ts`, `lib/validations/turma-schema.ts` — trocado `semesterId` por `serieId`+`year`; chaves i18n `turma.semesterRequired` → `turma.serieRequired`+`turma.yearInvalid`.
- [x] `lib/validations/subject-offering-schema.ts` — removido `turmaOfferingSchema`/`TurmaOfferingFormValues`; chave i18n órfã `turmaOffering.turmaRequired` removida.
- [x] `api/subject-offerings.ts` — removido `importTurmaOfferingsCsv`/`exportTurmaOfferingsCsv`.
- [x] `types/SubjectOffering.ts` — removido `turmaId`/`weeklyWorkload` (frontend não cria/lê mais oferta turma-mode diretamente); `courseId`/`section` voltaram a ser obrigatórios (curso-mode sempre).
- [x] Verificação: `npx tsc -b --force` (nota: `npx tsc --noEmit` sozinho não checa nada nesse repo — usa TS project references (`tsconfig.json` só tem `references`), precisa de `-b`) → confirmado que **todos** os erros ficaram confinados a `TurmasPage.tsx` (19 erros, todos sobre `semesterId`/`turmaId`/`turmaOfferingSchema` — exatamente o que a Fase 7 vai reescrever); nenhum erro nos arquivos novos/editados desta fase.

## Fase 7 — Frontend: TurmasPage reestruturada

- [x] Removida a aba "Ofertas de Turma" inteira de `TurmasPage.tsx` (`OfferingsGroupedByInstitution`, `OfferingsGroupedByTurma`, `TurmaOfferingsTab`, `useTurmaOfferingCsvColumns`, e o item da lista de abas — 4 abas: Séries/Turmas/Disciplinas/Semestres).
- [x] Nova aba "Séries": `SeriesGroupedByInstitution`/`SeriesTab`, CRUD de Série (nome + ordem), mesmo padrão master-table+dialog de `TurmasTab`.
- [x] Currículo aninhado por Série: dialog "Ver currículo" (mesma tabela de séries) listando pares Disciplina/carga horária, com formulário de adicionar 1 par por vez embutido no próprio dialog (não separado, ligeira melhoria de UX sobre `QualificationsTab` já contemplada no design desta fase) + lixeira por linha; Select de disciplina já filtra as que já estão no currículo (`availableSubjects`).
- [x] Aba "Turmas": form com `serieId` (Select) + `year` (number input) no lugar do antigo `semesterId` (Select); tabela ganhou coluna "Ano".
- [x] Aba "Disciplinas": sem mudança (reaproveitada de `AcademicStructurePage`).
- [x] i18n: chaves novas `series.*`/`curriculum.*` em `admin-turmas.ts`; removidas as chaves órfãs de `offerings.*`/`tabOfertas`/`selectInstitutionOfferings`; `turmas.columnSemester`/`formSemesterLabel` → `columnSerie`+`columnYear`/`formSerieLabel`+`formYearLabel`.
- [x] Verificação: descoberto que `npx tsc --noEmit` sozinho não checa nada nesse repo (project references) — usar `npx tsc -b --force`. Rodado → **0 erros** (zero erros restantes, incluindo os 19 que a Fase 6 tinha isolado em `TurmasPage.tsx`). `npm run lint` → **0 erros, 14 warnings** (todos pré-existentes, o padrão `react-hooks/incompatible-library` do `watch()` do react-hook-form já presente em toda a base — 2 dos 14 são novos, mas da mesma classe já aceita em todo o app). Smoke visual em navegador **não feito** aqui (falta credencial de login, mesma limitação já registrada nas fases antigas) — fica pra Fase 9.

## Fase 8 — Frontend: mascaramento "Ano Letivo"

- [x] `SemestersTab`/`SemestersGroupedByInstitution` (`AcademicStructurePage.tsx`, reaproveitados por `TurmasPage.tsx`) ganharam prop obrigatória `institutionType`: pra `SCHOOL`, esconde a coluna/campo `term`, relabela pra "Ano Letivo" (chaves i18n novas em `semesters.school.*`), envia `term: "FIRST"` fixo em `toSemesterInput`. Resolvido via `viewingInstitution.type` (super admin, veio de `useGroupedByInstitution`/`listInstitutions()`) ou `user?.institutionType` (admin comum, claim do JWT).
- [x] `GradesPage.tsx` — seletor de período no dialog "Gerar grade" (achado em `GradesContent`, não estava mapeado em sessão anterior): `semesterLabel`/`scheduleLabel` (funções de módulo, usadas em ~6 pontos — seletor de grade ativa, comparador, dialog de gerar) ganharam parâmetro `isSchool`, resolvido via query nova `getInstitution(institutionId)` (funciona pra admin E super admin, não depende de claim/nav gating). Campo de "Escopar por curso" (`generateCourseId`) escondido inteiro pra SCHOOL — não existe conceito de curso lá, e a lista viria sempre vazia.
- [x] Tab trigger da própria aba "Semestres" dentro de `TurmasPage.tsx` relabelado direto no i18n (`adminTurmas.tabSemestres` → "Ano Letivo") — key só é usada nesse contexto (sempre SCHOOL), sem precisar de lógica condicional.
- [x] Verificação: `npx tsc -b --force` → 0 erros. `npm run lint` → 0 erros, 14 warnings (mesma classe pré-existente `react-hooks/incompatible-library`, nenhuma categoria nova).

## Fase 9 — Smoke test manual ponta a ponta

- [x] Fluxo escolar novo: criar instituição SCHOOL de teste → criar "Ano Letivo" 2026 (mascarado, sem seletor de período) → criar Série "9º Ano" com currículo (Matemática 5, Português 5, Educação Física 2 tempos/semana, com sala exigida Auditório) → criar Turma "9º Ano A" (30 alunos, série 9º Ano, ano 2026, sem seletor de semestre) → gerar grade pro ano 2026 → confirmado que a sincronização automática criou as 3 ofertas certas (`turma_id`+`weekly_workload` corretos, verificado via inspeção de banco) e que a grade saiu correta (12/12 tempos alocados, zero conflitos). Encontrados e corrigidos 3 bugs reais no processo (não relacionados ao código da Fase 1-8 em si): (1) os containers Docker `api` e `optimizer` estavam rodando imagens de antes desta sessão de trabalho (buildadas em 2026-08-13, sem os controllers Serie/SerieSubject nem a constraint C18 — ver abaixo) — corrigido com `docker compose build api optimizer && docker compose up -d api optimizer`, sempre necessário depois de mudança de código local; (2) bug de UI pré-existente e não relacionado ao refactor: o popup do `<Select>` (Base UI) renderizava com `z-50`, mesmo z-index do overlay do `Sheet`/`Dialog`, fazendo cliques em opções do Select dentro de um Sheet caírem no overlay por baixo e fechar o painel inteiro sem salvar — corrigido subindo o Select pra `z-[60]` em `OptiSched-Web/src/components/ui/select.tsx`; (3) o gerador automático de horários (`Gerar horários automaticamente` em Infraestrutura) tem um bug onde a segunda alteração de Hora/Min sempre sobrescreve o primeiro select em vez do seu próprio — **não corrigido** (contornado inserindo horários/disponibilidade direto no banco pro smoke test; ver `feedback_browser_automation_coordinates`-style nota nova a criar em memória se for mexer nessa tela de novo).
- [x] Repetir o fluxo universitário existente (instituição UNIVERSITY já cadastrada, CEFET/RJ de teste) e confirmar zero regressão: oferta de curso criada manualmente via UI com sucesso (curso-mode, sem campo de turma), geração de grade funcionou normalmente pro semestre 2026-2, salas variando livremente entre disciplinas do curso (sem a constraint C18, que só se aplica a ofertas turma-mode/escola).
- [x] Apagar a instituição/dados de teste ao final — instituição SCHOOL de teste (id 19) removida via `DELETE FROM institution` (cascade limpou usuários/professores/séries/turmas/ofertas/grade); horários/disponibilidade/grade extras criados na universidade de teste também removidos; contagens de dados da universidade conferidas batendo com o estado anterior ao smoke test.

### Descoberta fora do escopo original: nova hard constraint C18 (sala-base fixa por turma)

Durante a preparação deste smoke test, o usuário pediu uma constraint nova não prevista neste plano: turmas (modo escola) não podem trocar de sala de aula ao longo da semana — a turma tem uma sala-base fixa, só saindo dela pra disciplinas com sala especial exigida (laboratório, auditório etc.). Implementado como **C18 (Turma Home Classroom)** no otimizador Python:

- `OptiSched-Optimizer/mapper.py` — `SolverData.turma_of_offering` (offering → turma).
- `OptiSched-Optimizer/solver/variables.py` — variável auxiliar `u_home[(turma, sala)]`.
- `OptiSched-Optimizer/solver/constraints.py` — `add_turma_home_classroom_link_constraint` + `add_turma_home_classroom_exclusivity_constraint`, registradas em `add_all_constraints`.
- `OptiSched-Optimizer/OptimizationModel.md` — seção C18 documentada.
- `OptiSched-Optimizer/tests/test_turma_home_classroom.py` — 7 testes novos.
- Verificação: `.optivenv/bin/python -m pytest -q` → 90/90 verde (83 antigos + 7 novos) na implementação, e validado end-to-end neste smoke test (grade real da turma de teste ficou 100% numa única sala, confirmado via `schedule_entry`).

## Verificação (resumo, repetida ao longo das fases acima)

1. `cd OptiSched-API && ./mvnw test` — depois da Fase 3 e de novo depois da Fase 4.
2. `cd OptiSched-Optimizer && .optivenv/bin/python -m pytest -q` — depois da Fase 5.
3. `cd OptiSched-Web && npx tsc --noEmit && npm run lint` — depois da Fase 7 e de novo depois da Fase 8.
4. Smoke test manual no navegador real (Fase 9), reaproveitando a stack local já no ar.
