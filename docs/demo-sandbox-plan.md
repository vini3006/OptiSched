# Modo Demo (sandbox efêmero) — plano de implementação

> Gerado em 2026-08-21, a partir de exploração dedicada (3 agentes de pesquisa em paralelo cobrindo landing page, auth/multi-tenancy do backend, e otimizador/convenções de docs) mais uma passada de validação por um agente de planejamento. Resolve o marcador deixado em `docs/turma-scoped-generation-plan.md` (seção final "Próxima fase", linhas 34-38), que antecipava essa frente e deixava em aberto "o mecanismo exato (client-side puro vs. backend com storage efêmero vs. outra abordagem)".
>
> Decisão fechada com o usuário: instituição demo é uma linha **real no Postgres** (não em memória), criada na hora do clique, com `expiresAt = agora + 2h` e uma flag `isDemo`. Fluxo de escolha: um botão único "Faça um teste" na landing → tela com 2 cards (Universidade/Escola), cada um already-populado com dados de exemplo.
>
> Uso: marque `[x]` conforme cada item for concluído e verificado. O comando `/demo-plan` (em `.claude/commands/demo-plan.md`) sabe ler este arquivo e continuar de onde parou.

## Contexto

O OptiSched agora atende universidades e escolas, mas a landing page ainda vende só "grades acadêmicas" com um mockup estático genérico, sem sinalizar a cobertura pra escolas nem deixar visitante nenhum experimentar o produto sem falar com vendas. O pedido:

1. Trocar o mockup do hero por um banner custom/criativo, do mesmo tamanho do bloco de texto ao lado.
2. Um botão "Faça um teste" embaixo do banner.
3. Ao clicar, o visitante escolhe **Universidade** ou **Escola** e cai direto dentro do produto real (mesma UI que um cliente pagante usa), numa instituição descartável já populada com dados de exemplo, sem precisar criar conta — e sem contaminar dados reais.

**Por que instituição real e não em memória:** o backend já é multi-tenant por `institutionId` de ponta a ponta — uma sessão ADMIN válida numa instituição demo **funciona contra todo endpoint existente sem nenhum código novo de CRUD** (login de convidado, geração de grade, todas as telas), reaproveitando 100% do que já existe. Duplicar cada repositório numa versão em memória dobraria a superfície de manutenção pra um ganho que o usuário final não percebe (a diferença entre "nunca foi salvo" e "foi salvo mas some sozinho em 2h" é invisível na prática).

**Achado crítico que muda a ordem de execução:** `/schedules/generate` não tem nenhum rate limit hoje, e a stack inteira (api+optimizer+redis+caddy) roda numa única EC2 t3.micro (1 vCPU total, já em produção real). Expor um endpoint público de criação de instituição sem guarda-corpos no otimizador é risco real de derrubar a produção — por isso a Fase 3 (guarda-corpos) não pode ir pro ar depois da Fase 1 (endpoint público) sem estar mergeada junto.

## Achados que fundamentam o plano (arquivo:linha)

- `TokenService.generateToken(...)` (`OptiSched-API/src/main/java/com/vinibarros/optisched/auth/TokenService.java:24`) não checa senha — é um método `@Service` puro. Dá pra montar Institution+User na mão e chamar isso direto, sem passar por `/auth/login`.
- `InstitutionFilter.isSubscriptionActive` (`.../config/InstitutionFilter.java:89-98`) já bloqueia automaticamente qualquer request autenticado assim que `expiresAt` passa — **mas trata `expiresAt == null` como "ativo pra sempre"**, então setar `expiresAt` explicitamente na criação da demo é obrigatório, não opcional.
- `MultiTenantUtils.resolveInstitutionId` (`.../util/MultiTenantUtils.java:7-14`) sempre prioriza `institutionIdAdmin` (vindo do JWT via `InstitutionFilter`) sobre o query param `institutionIdSuperAdmin` — uma sessão ADMIN demo com `institution_id` no token passa por qualquer controller hoje existente sem nenhum ajuste.
- `Institution.name`/`slug` são `unique` (`entity/Institution.java:29` e vizinhas) e `InstitutionService.create` (`service/InstitutionService.java:27-29`) rejeita nome duplicado **antes** de checar CNPJ — se a criação da demo usar um nome fixo tipo "Universidade Demo", o segundo clique quebra. Nome precisa de sufixo único por request.
- ~~`InstitutionRequest.cnpj` não é `@NotBlank`... `cnpj=null` explícito~~ **CORRIGIDO na implementação (2026-08-26):** a coluna `cnpj` é `UNIQUE NOT NULL` a nível de banco (`V2__create_institution_table_and_add_fk.sql:5`), não aceita null — confirmado ao rodar `DemoIntegrationTest` pela primeira vez (`DataIntegrityViolationException`/409 em todas as 3 chamadas). `DemoService.uniqueDemoCnpj()` gera um valor sintético `"DM" + 12 dígitos aleatórios`, checado contra `existsByCnpj` antes de usar.
- `SecurityConfig.authorizeHttpRequests` (`.../config/SecurityConfig.java:73-79`) hoje só libera `/auth/**`, swagger e `/actuator/health` — falta liberar o novo endpoint público, senão cai em `.anyRequest().authenticated()` e nunca chega no controller.
- Cascade delete de Institution já é garantido a nível de banco (`ON DELETE CASCADE` em toda FK que referencia `institution(id)`, confirmado em todas as migrations) e já é exercitado pela exclusão manual do Super Admin (`InstitutionService.delete`, `service/InstitutionService.java:84-91`) — não é um salto de fé, só nunca rodou em lote/automatizado antes.
- Nenhum `@Scheduled`/cron existe no repo hoje (`grep -rn "@Scheduled\|EnableScheduling" OptiSched-API/src` vazio) — o job de limpeza é o primeiro job em background desse código.
- `AuthResponse`/`AuthController` (`auth/AuthResponse.java`, `auth/AuthController.java`) são a base a espelhar: `/auth/login` seta o cookie `access_token` (httpOnly, `Secure`/`SameSite` conforme `cookieSecure`) e devolve um `AuthResponse` record; `/auth/me` lê os claims do JWT e monta o mesmo shape. Um novo `is_demo` (claim JWT, campo no record) segue exatamente esse padrão.
- `AdminLayout.tsx` (`OptiSched-Web/src/components/layout/AdminLayout.tsx`) é o ponto único de inserção de um banner "modo demonstração" — renderiza `<AdminNavBar />` e depois `<main>`, mesmo lugar em toda página admin.
- `HeroSection.tsx` (`OptiSched-Web/src/components/landing/HeroSection.tsx`, 66 linhas): grid `lg:grid-cols-[0.95fr_1.1fr]`, coluna direita (`relative perspective-[1800px]`) com o mockup atual — altura não é fixa, segue a proporção intrínseca do conteúdo balanceada com a coluna de texto. Landing page não usa i18n hoje (strings hardcoded em `HeroSection.tsx`/`Navbar.tsx`/`constants/landing.ts`).
- Rotas TanStack Router são arquivos soltos em `OptiSched-Web/src/routes/`, sem guarda de auth pras públicas (`index.tsx`, `login.tsx`) — uma nova `demo.tsx` segue o mesmo padrão trivialmente.

## Fase 1 — Backend: endpoint de criação da instituição demo + claim `isDemo` — **DONE (2026-08-26)**

- [x] `OptiSched-API/src/main/resources/db/migration/V26__add_institution_is_demo.sql` (nova): `ALTER TABLE institution ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;` + índice composto `(is_demo, expires_at)` (usado pelo job de limpeza na Fase 4).
- [x] `entity/Institution.java`: campo booleano (nomeado `demo`, não `isDemo`, pra evitar a armadilha do Lombok com getter/setter de boolean prefixado com "is" — mesma convenção já usada em `ScheduleEntry.locked`) mapeado pra coluna `is_demo` via `@Column(name = "is_demo")`.
- [x] `config/SecurityConfig.java`: `.requestMatchers(HttpMethod.POST, "/demo/institutions").permitAll()` adicionado.
- [x] `auth/TokenService.java`: `generateToken(...)` ganhou parâmetro `boolean isDemo`, sempre grava `.claim("is_demo", isDemo)`. Única chamada existente (`AuthService.login`) atualizada pra passar `false`.
- [x] `auth/AuthResponse.java`: novo componente `boolean isDemo` no record.
- [x] `auth/AuthController.java`: `/auth/login` e `/auth/me` incluem `isDemo`. Cookie extraído para `auth/AuthCookieService.java` (novo `@Component`, `setAuthCookie`/`clearAuthCookie`, expõe `COOKIE_NAME`).
- [x] `controller/DemoController.java` (novo).
- [x] `service/DemoService.java` (novo) + `dto/request/DemoInstitutionRequest.java` (novo, `{type}`).
- [x] `config/RateLimitingFilter.java`: `new Limit("/demo/institutions", 3)` adicionado.
- [x] `auth/DemoIntegrationTest.java` (novo) — 3 testes, todos verdes: criação sem auth + cookie funcional; duas chamadas seguidas sem colisão; expiração no passado rejeitada num endpoint tenant-scoped real (`GET /institutions/{id}`, não `/auth/me` — ver achado abaixo).
- [x] `service/DemoSeedService.java` criado como **stub** (métodos vazios, `@Service` já injetável) — a implementação real do seed é a Fase 2, mas `DemoService` já depende dele, então precisava existir pra Fase 1 compilar/testar.

**Achados que corrigiram o plano original, descobertos rodando o `DemoIntegrationTest` pela primeira vez:**
1. **`cnpj` é `UNIQUE NOT NULL`** no banco (`V2__create_institution_table_and_add_fk.sql:5`), não apenas `unique` como a pesquisa original assumiu — mandar `null` quebrava a criação com `DataIntegrityViolationException`/409 nas 3 chamadas de teste. Corrigido com `DemoService.uniqueDemoCnpj()`: gera `"DM" + 12 dígitos aleatórios`, checa contra `existsByCnpj` antes de usar (retry em caso de colisão, praticamente nunca acontece).
2. **`InstitutionFilter` pula a checagem de assinatura/expiração pra qualquer path `/auth/**`** (`!path.startsWith("/auth/")` na condição) — então testar o back-dating de `expiresAt` contra `/auth/me` nunca teria dado 403. O teste usa `GET /institutions/{id}` (endpoint tenant-scoped real) pra provar a expiração.
3. Full test suite do backend (163 testes) permanece verde após as mudanças — `mvn -o test`.

## Fase 2 — Backend: `DemoSeedService` (dados de exemplo) — **DONE (2026-08-26)**

- [x] `service/DemoSeedService.java` real (substitui o stub da Fase 1): `seedUniversity(Long institutionId)` e `seedSchool(Long institutionId)`, chamando os `create(...)` já existentes de cada serviço de domínio — `CourseService`, `SubjectService`, `UserService.createProfessor`, `ClassroomService`, `TimeSlotService`, `SemesterService`, `SubjectOfferingService` no lado universidade; `SerieService`, `TurmaService`, `SerieSubjectService` no lado escola; `ProfessorQualificationService`, `AvailabilityService` em ambos. Nenhum dos dois métodos é `@Transactional`.
- [x] Dataset: 1 semestre (ano/termo atual), 6 disciplinas, 3 salas (2 COMMON + 1 LABORATORY), 20 horários (4 períodos × 5 dias úteis, manhã), 4 professores com qualificações (9 vínculos, cobrindo todas as disciplinas com redundância) e disponibilidade em 16/20 horários cada (80%, um dia de folga por professor, rotacionado). Universidade: 2 cursos + 4 ofertas. Escola: 2 séries + 6 vínculos série-disciplina + 3 turmas.
- [x] `DemoIntegrationTest.java` estendido (não criado um novo) com 2 testes de contagem (`createDemoInstitution_university_seedsExpectedRowCounts`, `..._school_seedsExpectedRowCounts`) — total 5 testes na classe, todos verdes. Full suite: 165/165.

**Achados que corrigiram o plano original durante a implementação:**
1. **`TimeSlotRepository.existsOverlappingTimeSlot` ignora `dayOfWeek`** — o overlap check compara só `startTime`/`endTime` no nível da instituição inteira, com exceção apenas para um par `(start,end)` idêntico. Ou seja, "período 1" em dias diferentes precisa ter exatamente o mesmo horário (não pode variar por dia), senão colide. `seedMorningTimeSlots` gera os mesmos 4 pares de horário para as 5 dias úteis, nunca horários distintos por dia.
2. **Ofertas (`SubjectOffering`) no modo escola não são criadas manualmente** — `TurmaOfferingSyncService.syncOfferings(...)` já materializa essas linhas a partir do currículo `SerieSubject` de cada Turma, automaticamente, logo antes de uma geração de grade (substituiu o antigo CRUD manual "Ofertas de Turma"). `seedSchool` portanto não cria `SubjectOffering` nenhuma — o teste de contagem confirma isso explicitamente (`isEmpty()`), e a oferta real só aparece quando o visitante clicar em "gerar grade" dentro do produto.
3. **`UserService.createProfessor` não devolve o id do `Professor`** (só `UserResponse` com o id do `User`) — `DemoSeedService` injeta `ProfessorRepository` diretamente e usa `findByUserId(...)` pra recuperar o id necessário pra qualificações/disponibilidade, mesmo padrão de acesso direto a repositório já usado em outros serviços deste código (ex.: `UserService` injeta `UserRepository`/`InstitutionRepository` além dos serviços).
4. **Boundary transacional exigia atenção**: `DemoService.createDemoInstitution` teve o `@Transactional` removido (adicionado erroneamente na Fase 1) — se mantido, toda chamada a `demoSeedService.seedX(...)` feita de dentro dele entraria na MESMA transação por propagação `REQUIRED`, anulando o propósito de "uma falha isolada não derruba a instituição inteira" (o `@Transactional` de cada `create()` individual só abre uma transação própria se não houver uma ambiente já ativa). Sem `@Transactional` no método externo, cada `.save()`/`create()` já é transacional por si (via Spring Data JPA), continuando atômico por operação individual mas não mais tudo-ou-nada entre elas.

## Fase 3 — Backend: guarda-corpos no gerador de grade pra instituições demo

> **Não adiar** — landing pública sem isso é risco real de DoS na única EC2 de produção (ver "Achado crítico" no topo).

- [ ] No serviço que chama o otimizador (`ScheduleGenerationService`): antes de chamar `OptimizerClient`, se `institution.isDemo()`, forçar `solverTimeLimitSeconds = Math.min(requested, 15)` no servidor, ignorando o que o cliente mandar além disso.
- [ ] Contador de chamadas por instituição demo via Redis (mesmo padrão `INCR`+`EXPIRE` do `RateLimitingFilter`, chave `"demo:generate:" + institutionId`), rejeitando após um teto (ex.: 5 gerações) — dimensão diferente do rate limit por IP já existente, pertence ao serviço, não ao filtro global.
- [ ] Teste: instituição demo pedindo `solverTimeLimitSeconds=300` resolve com o teto de 15s; a N+1-ésima geração é rejeitada.

## Fase 4 — Backend: expiração e limpeza

- [ ] `OptischedApiApplication.java`: `@EnableScheduling` (primeiro uso no repo).
- [ ] `service/DemoCleanupJob.java` (novo): `@Component`, `@Scheduled(fixedRate = ...)` a cada 15-30min (é higiene de armazenamento, não controle de acesso — isso já é garantido de graça pelo `expiresAt` do `InstitutionFilter`), busca `is_demo=true AND expires_at < now()` (usa o índice da Fase 1) e chama `institutionService.delete(id)` por linha, com try/catch por linha pra uma falha não parar o lote.
- [ ] `repository/InstitutionRepository.java`: novo método derivado `findByIsDemoTrueAndExpiresAtBefore(LocalDateTime cutoff)`.
- [ ] Teste: semear uma instituição demo com `expiresAt` no passado, chamar o método do job diretamente (sem esperar o scheduler), assertar que a instituição e uma linha filha (ex. um curso semeado) sumiram.

## Fase 5 — Frontend: banner do hero + CTA

- [ ] `OptiSched-Web/src/components/landing/HeroSection.tsx`: substituir o bloco `<img src={heroSchedule} .../>` (linhas ~46-62) por um componente novo (`components/landing/HeroBanner.tsx` ou similar) — mesma coluna `grid items-center lg:grid-cols-[0.95fr_1.1fr]`, sem altura fixa (segue proporção própria balanceada com a coluna de texto, igual ao mockup atual). Usar os tokens de tema já existentes (`--gold`, `text-gold-gradient`, `card-elevated`, `--shadow-gold`, fontes Outfit/DM Sans) — **invocar a skill `frontend-design` na hora de implementar** pra direção visual concreta, esse item só fixa localização/restrição de layout.
- [ ] Adicionar botão "Faça um teste" abaixo da linha de CTAs existente (`Começar Agora`/`Saiba Mais`, linhas ~23-36), linkando pra `/demo`.
- [ ] Landing continua sem i18n (consistente com o resto da página) — decisão explícita, não esquecimento.

## Fase 6 — Frontend: tela de escolha + client da API

- [ ] `OptiSched-Web/src/routes/demo.tsx` (novo): rota pública, sem `beforeLoad` (mesmo padrão de `index.tsx`/`login.tsx`), 2 cards (Universidade/Escola) cada um com botão "Começar".
- [ ] `OptiSched-Web/src/api/demo.ts` (novo): `createDemoInstitution(type: "UNIVERSITY" | "SCHOOL"): Promise<AuthUser>`, `POST /demo/institutions`, espelha `api/auth.ts`'s `login()`.
- [ ] `OptiSched-Web/src/types/Auth.ts`: `AuthUser` ganha `isDemo: boolean`.
- [ ] No sucesso: `queryClient.setQueryData(AUTH_QUERY_KEY, authUser)` (mesmo padrão de `AuthContext.tsx`'s `loginMutation.onSuccess`) + `navigate({ to: "/admin" })` — o guard de `admin.tsx` não muda nada, já que só olha `user.role === "ADMIN"` e o cookie já veio setado do backend.
- [ ] Novo namespace i18n `src/i18n/locales/pt-BR/demo.ts`, registrado em `i18n.ts` (a tela de escolha e o banner "modo demo" da Fase 7 vivem dentro do app já i18n'zado, diferente da landing).

## Fase 7 — Frontend: aviso "modo demonstração" dentro do admin

- [ ] `AdminLayout.tsx`: banner condicional (`user.isDemo`) inserido entre `<AdminNavBar />` e `<main>` — mensagem + "Sair da demonstração".
- [ ] "Sair da demonstração" reaproveita `logout()` do `AuthContext`, mas redireciona pra `/` em vez do destino padrão de logout; opcionalmente chama um `DELETE /demo/institutions/{id}` novo (autolimpeza imediata em vez de esperar as 2h — nice-to-have, não bloqueia o TTL).

## Fase 8 — Documentação (este arquivo + comando)

- [x] `docs/demo-sandbox-plan.md` — este arquivo.
- [ ] `docs/turma-scoped-generation-plan.md`: adicionar uma linha logo após o marcador "Próxima fase" (linhas 34-38) apontando pra este arquivo — não apagar o texto original.
- [ ] `.claude/commands/demo-plan.md` (mesmo template de `.claude/commands/refactor-school.md`): frontmatter `description:`, corpo com fases resumidas, regras numeradas (uma fase por vez, reler arquivos antes de editar, marcar checkbox + rodar verificação a cada item, resumo curto ao final) — **e uma regra nova específica** que os outros comandos não têm: "não fazer deploy da Fase 1 (endpoint público) sem a Fase 3 (guarda-corpos do otimizador) já mergeada — produção está no ar hoje, ao contrário de quando os planos anteriores foram escritos."

## Riscos mapeados

- **DoS no otimizador**: já endereçado como Fase 3, não opcional.
- **Colisão de nome/slug**: nome da instituição demo precisa de sufixo único por criação, ou o segundo clique de cada tipo quebra.
- **CNPJ vazio**: mandar `null`, nunca `""`.
- **Sem captcha/proteção anti-bot**: o rate limit de 3/min/IP ajuda contra abuso não-distribuído; risco aceito pro v1, documentar como limitação conhecida.
- **`SecurityConfig` permitAll**: escopar exatamente a `POST /demo/institutions`, não `/demo/**`, pra um futuro `DELETE` de autolimpeza continuar exigindo autenticação.
- **Latência do seed síncrono**: se o dataset de exemplo crescer além do estimado, o tempo de resposta do endpoint público cresce junto — medir na Fase 2.

## Verificação

1. Backend: `mvn -B test` depois de cada fase (1-4); smoke manual com `curl` no endpoint novo; back-dating de `expires_at` via `psql` local pra confirmar o 403 automático; confirmar que o job de limpeza apaga a linha.
2. Frontend: `npx tsc -b --force && npm run lint`; clique-a-clique manual (landing → Faça um teste → escolher tipo → cair num `/admin` funcional, gerar grade, sair da demo) — reaproveitar a técnica já usada nesta sessão (seed de dados reais via `fetch()` no contexto da página com `mcp__claude-in-chrome__javascript_tool`, depois dirigir a UI de verdade via `claude-in-chrome`) como modelo pra esse smoke test.
