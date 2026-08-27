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

**DONE (2026-08-26)**

- [x] Novo `optimization/DemoGenerationGuardrail.java` (`@Component`, não inline no serviço): `capSolverTimeLimit(Double requested)` retorna `Math.min(requested, 15.0)` (ou `15.0` se `requested == null`); `checkGenerationLimit(Long institutionId)` faz o mesmo padrão `INCR`+`EXPIRE` do `RateLimitingFilter` na chave `"demo:generate:" + institutionId`, TTL de 2h (igual ao TTL da própria instituição demo), rejeitando com `DemoGenerationLimitExceededException` (nova, mapeada a 429 no `GlobalExceptionHandler`) acima de 5 gerações.
- [x] `ScheduleGenerationService.generateSchedule`: a busca de `Institution` foi antecipada pra logo após a busca do `Semester` (antes ficava só perto do fim, depois de já ter chamado o otimizador) — necessário pra checar `institution.isDemo()` antes de gastar qualquer trabalho. Se demo: chama `checkGenerationLimit` antes de tudo (inclusive antes do `turmaOfferingSyncService.syncOfferings`), e usa `capSolverTimeLimit(options.solverTimeLimitSeconds())` no lugar do valor cru do cliente ao montar o `OptimizationRequest`.
- [x] `ScheduleGenerationServiceTest` (unit, Mockito) ganhou 2 testes: instituição demo pedindo 300s recebe 15s no request montado; instituição demo com o guardrail simulando limite excedido é rejeitada **antes** de chamar `optimizerClient` ou `turmaOfferingSyncService`.
- [x] Novo `DemoGenerationGuardrailTest` (Redis real via Testcontainers, mesmo padrão do `RateLimitingFilterTest`) — 6 testes: aceita até o teto, rejeita a N+1-ésima, instituições diferentes não compartilham contador, `capSolverTimeLimit` corta acima do teto/mantém abaixo/usa o teto como default quando null.
- Suite completa: 173/173 verdes.

**Bug real encontrado e corrigido durante a implementação:** `institution.isDemo() ? guardrail.capSolverTimeLimit(...) : options.solverTimeLimitSeconds()` — Java escolhe o tipo da expressão ternária pelo operando *primitivo* quando um dos dois é primitivo, então se `capSolverTimeLimit` retornasse `double` (primitivo), o outro ramo (`Double`, que pode ser `null` quando o cliente não manda `solverTimeLimitSeconds`) seria auto-unboxed e lançaria `NullPointerException` sempre que uma instituição **não-demo** simplesmente não informasse esse campo opcional — quebraria a geração de grade para todo mundo, não só para demos. Descoberto pelos 3 testes pré-existentes do `ScheduleGenerationServiceTest` (que não passam `solverTimeLimitSeconds`) falhando com NPE assim que o guardrail foi acoplado. Corrigido fazendo `capSolverTimeLimit` retornar `Double` (boxed) em vez de `double`.

## Fase 4 — Backend: expiração e limpeza — **DONE (2026-08-26)**

- [x] `OptischedApiApplication.java`: `@EnableScheduling` (primeiro uso no repo).
- [x] `service/DemoCleanupJob.java` (novo): `@Component`, `@Scheduled(fixedRate = 20min)`, busca `is_demo=true AND expires_at < now()` (usa o índice `idx_institution_is_demo_expires_at` da Fase 1 via `findByDemoTrueAndExpiresAtBefore` — note o nome do campo Java é `demo`, não `isDemo`, ver nota da Fase 1) e chama `institutionService.delete(id)` por linha, com try/catch por linha (loga e segue pra próxima) pra uma falha não parar o lote.
- [x] `repository/InstitutionRepository.java`: `findByDemoTrueAndExpiresAtBefore(LocalDateTime cutoff)` (nome corrigido de `findByIsDemoTrueAndExpiresAtBefore` do plano original — Spring Data deriva o nome da propriedade JPA do campo `demo`, não do getter Lombok `isDemo()`).
- [x] `DemoCleanupJobTest.java` (novo, `@AutoConfigureMockMvc @Transactional extends AbstractIntegrationTest`): 2 testes — instituição demo expirada tem ela mesma e um curso semeado removidos (cascade delete real, confirmado); instituição demo não-expirada é preservada.
- Suite completa: 175/175 verdes.

**Achado só-de-teste (não afeta produção):** rodar seed→mutação de `expiresAt`→delete tudo dentro da MESMA transação/persistence-context de um teste (artefato do `@Transactional` de teste, que mantém uma única sessão Hibernate viva do início ao fim) faz o Hibernate lançar um `TransientObjectException` espúrio ao tentar reconciliar as coleções bidirecionais `Professor.qualifications`/`availabilities` (`cascade=ALL, orphanRemoval=true`) no mesmo flush que remove a `Institution` que elas referenciam — mesmo essas coleções nunca sendo tocadas diretamente pelo código de seed. `DemoCleanupJobTest` chama `entityManager.clear()` entre a fase de seed e a fase de limpeza pra evitar isso, simulando o que já acontece de graça em produção (cada request HTTP recebe seu próprio `EntityManager`, então o job de limpeza — rodando minutos/horas depois, num scheduler tick separado — nunca compartilha sessão com o request que criou a instituição).

## Fase 5 — Frontend: banner do hero + CTA — **DONE (2026-08-26)**

- [x] `OptiSched-Web/src/components/landing/HeroBanner.tsx` (novo): substitui o `<img src={heroSchedule} .../>` tilted-screenshot-em-perspectiva pelo signature element decidido via skill `frontend-design` — uma grade semanal abstrata (Seg-Sex, chips de largura variável representando aulas, sem dados reais) onde UM chip específico (Qua) nasce como contorno tracejado vermelho ("conflito") e se resolve em bloco dourado sólido com check ao montar, literalizando o "sem conflitos... geradas com inteligência" do H1 em vez de mostrar uma captura de tela genérica. Mesma coluna `grid items-center lg:grid-cols-[0.95fr_1.1fr]`, sem altura fixa, só reaproveita tokens já existentes (`--gold`, `btn-gold`, `card-elevated`, `--shadow-gold`) — nenhuma paleta nova introduzida.
- [x] Botão "Faça um teste sem compromisso →" adicionado abaixo da linha de CTAs existente, `<a href="/demo">` simples (não `<Link>` do TanStack Router — a rota `/demo` só existe a partir da Fase 6, e um `to="/demo"` quebraria o typecheck do route tree gerado antes disso).
- [x] Landing seguiu sem i18n (consistente com o resto da página).
- [x] `npx tsc -b --force` e `npm run lint` limpos (14 warnings pré-existentes de `watch()`, nenhum novo). Verificado ao vivo via `claude-in-chrome`: animação de resolução renderiza corretamente, grid colapsa pra 1 coluna abaixo do breakpoint `lg` (testado a 555px de largura, sem overflow horizontal), `/demo` cai num 404 estilizado (esperado até a Fase 6).

**Bug real pego só testando ao vivo no navegador (não no tsc/lint):** a primeira versão do chip "resolvendo" combinava a classe estática `opacity-0` com `animate-in fade-in` — como a keyframe `enter` do `tw-animate-css` só define o estado `from` (o `to` é implícito = estilo de repouso do elemento), o `opacity-0` estático permanecia como o próprio "estado de repouso", então o chip nunca aparecia (ficava travado em opacidade 0 pra sempre, mesmo com `fill-mode-forwards`). Corrigido removendo o `opacity-0` estático (o resting state correto já é opacidade 1, já que não há mais nenhuma classe de opacidade fixa) e trocando `motion-reduce:opacity-100` por `motion-reduce:animate-none` (desliga a animação inteira, não só corrige a opacidade final, pro caso de `prefers-reduced-motion: reduce`).
- [ ] Landing continua sem i18n (consistente com o resto da página) — decisão explícita, não esquecimento.

## Fase 6 — Frontend: tela de escolha + client da API

## Fase 6 — Frontend: tela de escolha + client da API — **DONE (2026-08-26)**

- [x] `OptiSched-Web/src/routes/demo.tsx` (novo, thin route → `pages/DemoPage.tsx`, mesmo padrão de `login.tsx`), rota pública sem `beforeLoad`. `routeTree.gen.ts` regenerado (roda a task `dev`/`build` do Vite pra sincronizar — não é gerado por `tsc` sozinho).
- [x] `OptiSched-Web/src/api/demo.ts` (novo): `createDemoInstitution(type)`.
- [x] `OptiSched-Web/src/types/Auth.ts`: `AuthUser.isDemo: boolean` adicionado.
- [x] `pages/DemoPage.tsx` (novo) + `i18n/locales/pt-BR/demo.ts` registrado em `i18n.ts`: 2 cards (Universidade/Escola, ícones `GraduationCap`/`School`) com botão "Testar como X", estado de loading por card, mensagem de erro genérica.
- [x] `npx tsc -b --force` e `npm run lint` limpos.
- [x] Testado ao vivo de ponta a ponta (frontend real + API real via Docker, rebuild do container após os fixes de backend): os dois tipos (Universidade e Escola) criam a instituição, autenticam e carregam o admin já populado — cursos/ofertas (universidade) e séries/turmas/currículo (escola) conferidos na UI.

**2 bugs reais encontrados e corrigidos só rodando de ponta a ponta (nenhum pego por `tsc`/`lint`/testes automatizados):**
1. **Sala de laboratório pequena demais pro dado semeado (bug da Fase 2, só aparece ao gerar grade de verdade):** `DemoSeedService.seedClassrooms` criava a sala `201` (LABORATORY) com capacidade 25, mas as ofertas universitárias que exigem laboratório (`ALG101`/`BD101`) usam `expectedStudents=35` — o otimizador rejeitava corretamente como inviável ("no classroom of that type is big enough"). Capacidade da sala 201 subida pra 40. Nenhum teste automatizado pega isso porque os testes de seed só contam linhas, nunca verificam se o resultado é *solúvel* — só apareceu tentando gerar uma grade de verdade na UI.
2. **`navigate({ to: "/admin" })` dentro do `onSuccess` do `useMutation` nunca disparava a navegação de fato**, mesmo com o backend respondendo 200 e a sessão/cookie corretos (confirmado via `fetch('/auth/me')` direto no console — usuário autenticado, `isDemo:true`, mas a UI ficava travada em `/demo`). Corrigido trocando pra `await createDemoMutation.mutateAsync(type)` + `await navigate(...)` dentro do próprio handler de clique — o padrão exato já usado e comprovado em `LoginForm.tsx` — em vez de depender do callback `onSuccess` do `useMutation`. Só foi pego testando o clique de verdade no navegador; nenhum erro apareceu no console nem no `tsc`/lint.

**Nota sobre a sessão de teste:** a automação de clique (`claude-in-chrome`) mostrou instabilidade real nesta sessão — descobriu-se que as coordenadas de pixel da screenshot não batiam com o espaço de coordenadas usado pelos cliques (`elementFromPoint` nas coordenadas "visuais" batia em elementos errados), e alguns cliques via `find`+`ref` em botões Base UI simplesmente não disparavam o evento. `element.click()` via JS foi o método mais confiável quando cliques via automação falhavam repetidamente — mas só serve pra confirmar que o *código* funciona quando o evento realmente dispara, não substitui um teste de clique real do usuário.

## Fase 7 — Frontend: aviso "modo demonstração" dentro do admin

## Fase 7 — Frontend: aviso "modo demonstração" dentro do admin — **DONE (2026-08-26)**

- [x] `components/layout/DemoModeBanner.tsx` (novo): banner condicional (`user?.isDemo`) inserido em `AdminLayout.tsx` entre `<AdminNavBar />` e `<main>` — ícone `Info`, mensagem + botão "Sair da demonstração". Novo bloco `banner` no namespace i18n `demo`.
- [x] "Sair da demonstração" reaproveita `logout()` do `AuthContext`, mas redireciona pra `/` em vez de `/login` (destino padrão do `AppNavBar`).
- [x] `DELETE /demo/institutions/{id}` de autolimpeza imediata **não implementado** — mantido como nice-to-have não bloqueante, conforme o próprio plano já previa; o TTL de 2h + `DemoCleanupJob` (Fase 4) já cobre a limpeza.
- [x] `npx tsc -b --force` e `npm run lint` limpos. Testado ao vivo contra o backend real: banner aparece com a instituição demo (`Demo Escola 64d351eb` da Fase 6), clique em "Sair da demonstração" desloga de verdade (confirmado via `GET /auth/me` retornando 401 depois) e redireciona pra `/`, não `/login`.

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
