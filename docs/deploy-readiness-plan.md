# Prontidão para produção — plano de correções + deploy

> Gerado em 2026-08-05 a partir de uma revisão completa do sistema (backend, frontend, infra/optimizer) com foco em segurança. Alvo de deploy definido: **Supabase** (Postgres gerenciado) + **AWS EC2** (API + Optimizer via Docker Compose) + **Vercel** (frontend) + **Resend** (e-mail transacional).
>
> Uso: marque `[x]` conforme cada item for concluído e verificado. O comando `/deploy-plan` (em `.claude/commands/deploy-plan.md`) sabe ler este arquivo e continuar de onde parou.
>
> Estrutura: **Parte A** = correções de código (eu implemento). **Parte B** = runbook manual de deploy (Supabase/Resend/EC2/Vercel — você faz). **Parte C** = CI/CD automatizado, deliberadamente só depois que a Parte B estiver rodando de verdade em produção.

## Achados que motivam este plano (por severidade)

**Crítico**
- Build de produção do frontend quebrado no `main` (`OptiSched-Web/src/pages/admin/GradesPage.tsx:271`, `registerEntry` não usado) — bloqueia `npm run build` e o CI.
- Optimizer exposto publicamente sem autenticação (`docker-compose.yml:27-28` publica a porta 8000; `OptiSched-Optimizer/api/optimization.py:9-23` sem auth nenhuma).
- Sem estratégia de backup do Postgres (resolvido migrando pra Supabase — não é mudança de código).
- Reset de senha não funciona de verdade (`LoggingEmailSender` só loga o link, é a única implementação de `EmailSender`, ativa incondicionalmente).

**Alto**
- Sem limite de tamanho de payload/tempo de solver no Optimizer (`OptiSched-Optimizer/models.py:61-71`, `solver_time_limit_seconds` sem teto) — habilita DoS de CPU.
- Sem rate limiting em `/auth/login` e `/auth/forgot-password` — brute-force e spam de e-mail sem proteção.
- Containers rodam como root (API e Optimizer Dockerfiles sem `USER`).
- Postgres com porta 5432 exposta publicamente no compose atual (ok em dev, não em prod).
- `COOKIE_SECURE` e `CORS_ALLOWED_ORIGINS` não documentadas/propagadas — ficam nos defaults de dev se esquecidas.
- Sem logging estruturado/observabilidade real em produção.

**Médio**
- `.env.example` incompleto (faltam `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD_HASH`, já obrigatórias hoje).
- Token de reset de senha armazenado em texto puro no banco (`PasswordResetToken.token`, varchar(255) — cabe um hash SHA-256 sem migration).
- Swagger/OpenAPI e `spring.jpa.show-sql` sempre ativos, sem forma de desligar em produção.
- Política de senha fraca (mínimo 6 caracteres).
- Sem `docker-compose.prod.yml`, sem TLS/reverse proxy pra API na VPS (**HTTPS**: coberto pelo Caddy no item A5 — Vercel já dá HTTPS automático de graça pro frontend).
- Design de multi-tenancy (`MultiTenantUtils.resolveInstitutionId`) depende de convenção de ordenação de parâmetros nos controllers, não de checagem explícita — risco latente (hoje 100% dos controllers estão corretos, mas nada impede uma regressão silenciosa futura).
- **JWT roubado continua válido até expirar (até 8h) mesmo após logout** — logout só limpa o cookie local, não existe blacklist server-side (resolvido no item A6, com Redis).
- **Sem scanner de dependências vulneráveis no CI** — `npm audit`/CVEs de libs Java/Python nunca são checados automaticamente (resolvido no item A7).

**Baixo / observação**
- `react-router-dom` é dependência morta no frontend (zero imports); `shadcn` está em `dependencies` em vez de `devDependencies`.
- `requirements.txt` do Optimizer mistura deps de runtime e teste; Dockerfile não é multi-stage; `.dockerignore` não exclui `tests/`.
- Sem revogação/blacklist de JWT (exigiria Redis) — logout só limpa o cookie local (resolvido no A6).
- Sem CI/CD de deploy automatizado (CI hoje só roda testes/build) — ver Parte C, deliberadamente deixada pro final.

---

## Parte A — Correções de código

### A1. Frontend: destravar o build
- [x] Remover `register: registerEntry` (não usado) da desestruturação em `OptiSched-Web/src/pages/admin/GradesPage.tsx:270-276`.
- [x] Remover `react-router-dom` do `package.json` (zero imports no código).
- [x] Mover `shadcn` de `dependencies` para `devDependencies` no `package.json`.
- [x] Criar `OptiSched-Web/vercel.json` com rewrite catch-all para `index.html` (necessário para o roteamento client-side do TanStack Router funcionar em deep links na Vercel).
- [x] Confirmar `npm run build` e `npm run lint` limpos de **erros** (0 erros). Os 9 erros pré-existentes (`react-refresh/only-export-components` em `badge.tsx`/`button.tsx`/`tabs.tsx`/`__root.tsx`/`routes/index.tsx`, `react-hooks/refs` em `WeeklyScheduleGrid.tsx`) foram corrigidos: variantes `cva` extraídas para `*-variants.ts`; `NotFoundComponent`/`ErrorComponent`/`RootComponent` movidos para `components/layout/RootLayout.tsx`; `Index` virou `pages/LandingPage.tsx` (seguindo o padrão já usado pelas outras rotas de importar a página em vez de definir o componente inline); refs de `WeeklyScheduleGrid.tsx` passaram a ser atualizadas em `useLayoutEffect` em vez de durante o render. Restam 12 **warnings** (`react-hooks/incompatible-library`, `watch()` do react-hook-form não é memoizável pelo React Compiler) — decisão do usuário: deixar como debt registrado abaixo, não bloqueiam build/CI.

### A2. Backend: e-mail real via Resend
- [x] Criar `OptiSched-API/src/main/java/com/vinibarros/optisched/email/ResendEmailSender.java` implementando `EmailSender`, chamando `POST https://api.resend.com/emails` via novo bean `RestClient` em `RestClientConfig.java`. Falha no envio é logada (`log.error`), não propagada (mantém o comportamento silencioso/anti-enumeration já existente).
- [x] Tornar `LoggingEmailSender`/`ResendEmailSender` mutuamente exclusivos via `@ConditionalOnProperty(prefix = "app.email", name = "provider", ...)` (`log`, default via `matchIfMissing = true`, vs `resend`).
- [x] `application.properties`: `app.email.provider=${EMAIL_PROVIDER:log}`, `app.email.resend.api-key=${RESEND_API_KEY:}`, `app.email.resend.from=${RESEND_FROM_EMAIL:OptiSched <onboarding@resend.dev>}`.

### A3. Backend: fechar a exposição do Optimizer
- [x] Header `X-Internal-Key` validado por uma dependency do FastAPI em `OptiSched-Optimizer/api/optimization.py` (só na rota `/optimize`, não no `/health`) contra a env var `OPTIMIZER_INTERNAL_KEY`. Fail-closed: env var ausente rejeita tudo (401), em vez de abrir a rota.
- [x] `RestClientConfig.java` (API): mandar esse header em toda chamada ao Optimizer via `.defaultHeader(...)` no bean `restClient()` (nova property `optimizer.internal-key` ← `OPTIMIZER_INTERNAL_KEY`).
- [x] `OptiSched-Optimizer/models.py`: `Field(max_length=...)` nas listas de `OptimizationRequest` (professors: 2000, subject_offerings: 5000, classrooms: 2000, time_slots: 500, preferred_time_slot_ids: 500, locked_assignments: 5000).
- [x] `OptiSched-Optimizer/api/optimization.py`: teto `MAX_SOLVER_TIME_LIMIT_SECONDS = 120.0` aplicado via `min()` ao `solver_time_limit_seconds` recebido do cliente (só quando informado — `None` continua caindo no default do solver).
- [x] `docker-compose.yml` (dev): adicionado `OPTIMIZER_INTERNAL_KEY=dev-only-internal-key-change-in-prod` (valor fixo) em `api` e `optimizer`.

### A4. Backend: hardening de auth/config
- [x] Rate limiting simples (in-memory, `OncePerRequestFilter` novo — `RateLimitingFilter.java` —, sem Redis — documentado como por-instância, adequado só pro alvo de 1 instância EC2) em `POST /auth/login` (5/min) e `POST /auth/forgot-password` (3/min), registrado em `SecurityConfig.java` via `.addFilterBefore(..., BearerTokenAuthenticationFilter.class)`. Chave = IP + path; depende de `server.forward-headers-strategy=native` (novo) pra ver o IP real do cliente atrás do Caddy em prod.
- [x] Hash do token de reset de senha em `PasswordResetService.java` (SHA-256 + Base64 URL-safe, coluna já comporta, sem migration). O link enviado por e-mail carrega o token cru; só o hash é persistido.
- [x] Senha mínima 6 → 8 em `UserRequest.java`, `ResetPasswordRequest.java`, e espelhado em `user-schema.ts`/`reset-password-schema.ts`/`validations.ts` no frontend.
- [x] Toggle por env var: `spring.jpa.show-sql=${JPA_SHOW_SQL:true}`, `springdoc.api-docs.enabled=${SWAGGER_ENABLED:true}`, `springdoc.swagger-ui.enabled=${SWAGGER_ENABLED:true}`.
- [x] Limite de upload de CSV: `spring.servlet.multipart.max-file-size=2MB`, `max-request-size=2MB`.
- [x] `spring.datasource.url` ganha `?sslmode=${DB_SSL_MODE:disable}` (necessário pro Supabase em prod).
- [x] `.env.example`: adicionado `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD_HASH`, `COOKIE_SECURE`, `CORS_ALLOWED_ORIGINS`, `OPTIMIZER_INTERNAL_KEY`, `EMAIL_PROVIDER`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `JPA_SHOW_SQL`, `SWAGGER_ENABLED`, `DB_SSL_MODE`. Achado extra corrigido no processo: `CORS_ALLOWED_ORIGINS` nunca tinha sido conectado em `application.properties` (só existia como default inline no `SecurityConfig.java`) — `cors.allowed-origins=${CORS_ALLOWED_ORIGINS:...}` adicionado, senão a env var documentada seria ignorada silenciosamente em produção.

### A5. Infra: Dockerfiles + `docker-compose.prod.yml`
- [x] `OptiSched-API/Dockerfile` e `OptiSched-Optimizer/Dockerfile`: usuário não-root (`appuser`, uid fixo — 1001 na API porque a imagem `eclipse-temurin:21-jre` já vem com um usuário `ubuntu` embutido no uid 1000; 1000 no Optimizer, sem conflito lá). `app.key` do host precisou de `chmod 644` (estava `600`) — feito. Testado localmente: rebuild + `docker compose up` + `/actuator/health` UP + confirmado via `docker exec ... id` que ambos os processos rodam como `appuser`, não root + login real batendo na chave JWT sem erro.
- [x] `OptiSched-Optimizer`: `requirements.txt` (runtime, 15 pacotes) separado de `requirements-dev.txt` (`-r requirements.txt` + pytest/iniconfig/packaging/pluggy/Pygments); Dockerfile instala só o primeiro; `.dockerignore` exclui `tests/` e `requirements-dev.txt`. CI (`ci.yml`) atualizado pra instalar de `requirements-dev.txt`. Validado com venv limpa: app importa só com `requirements.txt`, suíte inteira (76 testes) passa com `requirements-dev.txt`.
- [x] Novo `docker-compose.prod.yml`: serviços `api`, `optimizer`, `caddy`. Sem `postgres` (Supabase). `optimizer` sem `ports:` (só rede interna); `api` sem `ports:` publicada (só o `caddy` expõe 80/443, com `depends_on: condition: service_healthy` encadeado). `mem_limit`/`cpus` em `api` (512m/1.0) e `optimizer` (384m/1.0) — dimensionado pra caber num t3.micro (1GiB) com folga pro Caddy e o SO; ponto de partida, vale reajustar com uso real.
- [x] Novo `Caddyfile` mínimo com `{$API_DOMAIN}` (placeholder via env var, não hardcoded) → `reverse_proxy api:8080`. TLS automático, redirect HTTP→HTTPS e HSTS são default do Caddy com domínio real.
- [x] Novo `.env.production.example` com `API_DOMAIN`, `DB_HOST/PORT/NAME/USER/PASSWORD` (Supabase), `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS` (Vercel), `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD_HASH`, `OPTIMIZER_INTERNAL_KEY`, `EMAIL_PROVIDER=resend`/`RESEND_API_KEY`/`RESEND_FROM_EMAIL`.
- [x] Verificação extra: `docker compose -f docker-compose.prod.yml config` valida sem erro de sintaxe (só os warnings esperados de env var ausente, já que são vars de produção não presentes no `.env` de dev) e `docker compose -f docker-compose.prod.yml build` builda as duas imagens com sucesso. O smoke test real do Caddy (emissão de certificado) só dá pra fazer na EC2 com domínio de verdade — fora do alcance de um ambiente local, como o próprio plano já previa.

### A6. Redis: blacklist de JWT + rate limiting distribuído
- [x] Adicionada dependência `spring-boot-starter-data-redis` ao `pom.xml`. Config via `spring.data.redis.host/port/password` ← `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` (`localhost`/`6379`/vazio em dev, `redis`/`6379`/senha real no compose).
- [x] Serviço `redis:7-alpine` novo em `docker-compose.yml` (dev, sem senha, rede interna, sem porta publicada) e em `docker-compose.prod.yml` (prod, `command: redis-server --requirepass ${REDIS_PASSWORD}`, sem porta publicada, `mem_limit: 64m`). `api` em ambos ganhou `depends_on: redis: condition: service_healthy`.
- [x] **Blacklist de JWT no logout**: novo `JwtBlacklistService.java` (hash SHA-256 do token, `SET` no Redis com TTL = tempo restante até o `exp`, no-op se já expirado). `AuthController.logout` passa a ler o token cru do cookie da própria request (`HttpServletRequest.getCookies()` — `CookieBearerTokenResolver` já pula autenticação em `/auth/logout` de propósito, então não tem `Jwt` no `SecurityContext` ali), decodifica via `JwtDecoder` (bean já existente) só pra pegar o `exp`, e chama o blacklist. `TokenService.java` não mudou (sem `jti`).
- [x] Novo `JwtBlacklistFilter` (`OncePerRequestFilter`), registrado em `SecurityConfig.java` logo depois de `BearerTokenAuthenticationFilter` (antes do `InstitutionFilter`, que passou a rodar depois dele): lê o `Jwt` já autenticado do `SecurityContext`, hasheia o `tokenValue`, checa Redis — se estiver na blacklist, limpa o contexto e responde 401 antes de deixar passar.
- [x] **Rate limiting** (item A4) migrado pra Redis (`INCR`/`EXPIRE` via `StringRedisTemplate`, sem lib nova) em vez do `ConcurrentHashMap` em memória — `RateLimitingFilter` reescrito, `RateLimitingFilterTest` também (agora com Redis real via Testcontainers em vez do mapa in-process).
- [x] Cache de leitura (`@Cacheable` pra TimeSlot/Classroom/Institution) confirmado **fora de escopo** — ver backlog.
- Testes novos: `JwtBlacklistServiceTest` (4 casos, Redis real via Testcontainers) e `AuthIntegrationTest` (login → `/auth/me` → logout → `/auth/me` de novo esperando 401, contra Postgres+Redis reais). `AbstractIntegrationTest` ganhou um Redis compartilhado (mesmo padrão do Postgres) já que todo `@SpringBootTest` agora passa pelos dois filtros novos.
- Verificação: 122/122 testes Java (eram 116; +6 do A6). **Smoke test real** com a stack inteira no Docker (rebuild + `docker compose up`): login → `/auth/me` (200) → logout (204) → `/auth/me` com o mesmo cookie (401, confirmado via `redis-cli KEYS`/`TTL` que a chave existe com TTL ≈ 8h restantes) → rate limiting em `/auth/login` confirmado batendo em 429 na 6ª tentativa (contando o login bem-sucedido do teste anterior, já que o limite é por IP+path, não por resultado). `docker compose -f docker-compose.prod.yml config`/`build` seguem limpos com o `redis` novo.

### A7. Testes de segurança + scanner de dependências no CI
- [x] **Payloads de SQL Injection**: novo `MaliciousPayloadIntegrationTest.java` (JUnit/Testcontainers, Postgres real) — cria institution+admin, faz login de verdade, `POST /subjects` com `'; DROP TABLE users; --` no campo `name`, confirma 201 com o valor devolvido literal no JSON, confirma `users` intacta (contagem inalterada) e o valor persistido byte-a-byte no Postgres. Prova o JPA/JPQL parametrizado segurando sob teste ativo, não só por inspeção.
- [x] **Payloads de XSS**: mesmo teste, mesmo endpoint, payload `<script>alert(1)</script>` — confirma que a API devolve o valor cru, sem escapar (correto: quem escapa é o React no render, não a API JSON). Verificação manual complementar feita: `grep` confirmou **zero** ocorrências de `dangerouslySetInnerHTML`/`.innerHTML =`/`insertAdjacentHTML`/`document.write` em todo `OptiSched-Web/src` — não tem bypass do escaping automático do JSX em lugar nenhum. Setup de teste de frontend automatizado continua fora de escopo (decisão já tomada antes, não revisitada).
- [x] **Scanner de dependências no CI** (`.github/workflows/ci.yml`):
  - `web`: `npm audit --audit-level=high`. Não estava limpo (3 vulnerabilidades "high" — `brace-expansion`/`fast-uri`/`js-yaml`, todas em dev-deps do `eslint`/`shadcn`, zero risco de produção); `npm audit fix` resolveu tudo sem breaking changes, `package-lock.json` atualizado, build/lint confirmados intactos.
  - `api`: OWASP Dependency-Check (plugin Maven `org.owasp:dependency-check-maven:13.0.0`, versão confirmada real via Maven Central antes de fixar), `failBuildOnCVSS=9` (só Critical falha o build). Declarado no `pom.xml` **sem** binding de lifecycle — `mvn test` local/CI continua rápido e intocado (124/124 confirmados depois). CI invoca explicitamente via `mvn org.owasp:dependency-check-maven:check`, com cache do banco NVD (`actions/cache`) e `NVD_API_KEY` passada como secret opcional. **Ação sua pendente**: gerar uma chave grátis em https://nvd.nist.gov/developers/request-an-api-key e cadastrar como secret `NVD_API_KEY` no repo — sem isso, o rate limit do NIST pode deixar a primeira sincronização bem lenta ou falhar (validei que o plugin resolve e a config é aceita; não rodei o sync completo aqui, levaria muito tempo/poderia bater rate limit sem chave).
  - `optimizer`: `pip-audit -r requirements.txt`. Decisão sua: falha em **qualquer** achado (não em qualquer CVE crítico como os outros dois) — testei o `pip-audit` direto contra um pacote com CVE real conhecida e confirmei que ele não expõe severidade/CVSS no output, então um gate por severidade não é viável nessa ferramenta sem um script extra de cruzamento com OSV/NVD (fora de escopo agora). Hoje as 15 deps do `requirements.txt` estão 100% limpas.

---

## Parte B — Runbook de deploy (manual, feito por você)

**Concluída em 2026-08-07.** Todos os itens abaixo feitos e validados com smoke test real em produção (login+criar instituição, geração de grade via API→Optimizer, reset de senha via Resend com e-mail recebido de verdade). Detalhe completo/histórico na memory `deploy_partB_progress`.

- [x] **Supabase**: projeto `optisched-prod` (Session Pooler, `sa-east-1`), `DB_SSL_MODE=require`.
- [x] **Resend**: domínio `optisched.com.br` verificado, API key gerada.
- [x] **Chaves JWT de produção**: `app.key`/`app.pub` (2048 bits), guardadas em `~/optisched-prod-secrets` local.
- [x] **`REDIS_PASSWORD`** de produção gerado.
- [x] **AWS EC2**: instância `optisched-api` (Ubuntu 24.04, t3.micro, `us-east-1`, IP elástico `56.125.44.121`), Docker + Compose instalados, stack de pé via `docker-compose.prod.yml`.
- [x] **Vercel**: `https://opti-sched.vercel.app` (root `OptiSched-Web`, `VITE_API_URL=https://api.optisched.com.br`).
- [x] `CORS_ALLOWED_ORIGINS`/`FRONTEND_URL` apontando pra `https://opti-sched.vercel.app`.
- [x] **Smoke test pós-deploy**: login, criar instituição, gerar grade, reset de senha — todos passaram.
- [x] **Bug pós-deploy encontrado e corrigido**: cookie JWT com `SameSite=Lax` hardcoded quebrava qualquer chamada autenticada via `fetch`/XHR entre domínios diferentes (Vercel × EC2 são cross-site). Fix: `SameSite` passa a ser `None` quando `app.cookie.secure=true` (commit `ae2bdb1`, em produção).

---

## Débito técnico descoberto na Parte B — pronto pra executar quando o usuário quiser

### D1. Resize do volume EBS da EC2 (8GB → 20GB)

**Por quê**: o volume root da instância (`nvme0n1`, 8GB, partição `p1` de 7GB) enche mesmo depois de `docker builder prune -af` — qualquer rebuild da imagem `api` direto na EC2 (Maven multi-stage) estoura o disco. Hoje o workaround é buildar localmente e transferir (`docker save | ssh ... docker load`), documentado na memory `deploy_partB_progress`. Resize elimina o workaround de vez; custo adicional é centavos/mês, coberto pelo crédito do Free Plan da AWS.

- [x] Console AWS → EC2 → **Volumes** → volume de `optisched-api` (`i-0515b0b25c99a5f19`) → **Actions → Modify Volume** → 20GiB → confirmado (feito com a instância desligada, sem problema — Elastic Volumes aceita modificação com a instância parada ou rodando).
- [x] Partição e filesystem estendidos: o Ubuntu 24.04 já roda `growpart`/`resize2fs` automaticamente via cloud-init no boot — ao ligar a instância depois do resize, `nvme0n1p1` e o ext4 já apareceram em 19G sozinhos (`growpart` confirmou `NOCHANGE`, `resize2fs` confirmou "already ... blocks long, nothing to do"). `df -h /` final: **19G total, 13G livres** (35% em uso).
- [x] Workaround revertido: `git restore docker-compose.prod.yml` na EC2 (só tinha essa edição local não commitada, branch já em dia com `origin/main`) restaurou o `build: context:` normal. Rebuild completo (`docker compose build api optimizer && up -d`) direto na EC2 sem estourar disco: os 4 serviços (`api`, `optimizer`, `redis`, `caddy`) subiram healthy, build consumiu ~1.1GB e sobrou **11GB livres** (`df -h /`: 19G total, 7.4G usado, 40%). Confirmado publicamente: `curl -I https://api.optisched.com.br/actuator/health` → `200`.

### D2. Parte C — CI/CD automatizado (agora liberada: Parte B já validada em produção)

Elimina a causa raiz do D1 (EC2 nunca mais builda, só puxa imagem pronta do registry) e fecha o pipeline de deploy.

- **Frontend (Vercel): nada a fazer**, já é automático a cada push desde a Parte B.
- **Banco (Supabase): nada a fazer**, Flyway já roda no boot da API a cada deploy.
- **API + Optimizer (EC2) — a implementar:**
  - [x] `docker-compose.prod.yml`: `build: context:` trocado por `image: ghcr.io/vini3006/optisched-api:latest` / `ghcr.io/vini3006/optisched-optimizer:latest` nos serviços `api`/`optimizer`; comentário de topo atualizado (`pull && up -d` em vez de só `up -d`). `docker compose -f docker-compose.prod.yml config` validado sem erro de sintaxe.
  - [x] Novo job `build-and-push` em `.github/workflows/ci.yml`, `needs: [api, optimizer, web]` + `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` (nunca roda em PR — fork PR não teria `packages: write` mesmo, e não queremos publicar `:latest` de código não mergeado). Builda as duas imagens via `docker/build-push-action@v6` e publica em `ghcr.io/${{ github.repository_owner }}/optisched-api:latest`/`optisched-optimizer:latest` (login via `docker/login-action@v3` com `GITHUB_TOKEN` default, `permissions: packages: write` no job). YAML validado (`yaml.safe_load`, 5 jobs confirmados, `needs` corretos).
  - [x] Novo job `deploy`, `needs: build-and-push`: SSH na EC2 via `appleboy/ssh-action@v1` rodando `cd ~/OptiSched && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`, depois um step de smoke test (`curl -f --retry 5 --retry-delay 5 https://api.optisched.com.br/actuator/health`, roda do runner do GitHub, não via SSH). Rollback nessa v1 é manual (reapontar `docker-compose.prod.yml` pra uma tag anterior da imagem), como já previsto no plano. **Pendente do usuário**: dois GitHub Secrets novos no repo — `EC2_SSH_KEY` (conteúdo de `~/optisched-prod-secrets/optisched-ec2.pem`) e `EC2_HOST` (`56.125.44.121`).
  - [ ] **Pendente**: usuário cadastra os 2 secrets (`EC2_SSH_KEY`, `EC2_HOST`) no GitHub e confirma a primeira rodada real do pipeline (push na `main` → CI verde → imagens no GHCR → EC2 atualizada → smoke test passando). D1 (resize do EBS) já foi feito antes deste item, então não é mais um bloqueio nem motivador — só falta validar o pipeline em si.

---

## Adiado / backlog (não bloqueia o lançamento)

- Cache de leitura com Redis (`@Cacheable` em TimeSlot/Classroom/Institution) — performance, não segurança.
- 12 warnings de lint `react-hooks/incompatible-library` (`watch()` do react-hook-form não memoizável pelo React Compiler) em `AcademicStructurePage`, `InfrastructurePage`, `InstitutionsPage`, `ProfessorsPage`, `GradesPage`, `AvailabilityPage`, `TimeSlotGeneratorDialog` — trocar por `useWatch({ control, name })` resolveria; puramente otimização (compiler pula memoização), sem bug funcional por trás, decidido em 2026-08-06 que não bloqueia o A1.
- Scan OWASP ZAP automatizado contra a aplicação rodando — mais thorough que os testes de payload do A7, mas mais setup; considerar se o A7 não for suficiente na prática.
- Refactor de `MultiTenantUtils.resolveInstitutionId` pra não depender de convenção de ordenação de parâmetros.
- Rollback automático no deploy da Parte C (v1 é rollback manual).

## Verificação

1. `cd OptiSched-API && mvn -o test` — os 106 testes existentes devem continuar passando, mais os novos casos de SQLi/XSS/blacklist do A6/A7.
2. `cd OptiSched-Optimizer && pytest -q` — confirma que os limites novos não quebram os testes existentes.
3. `cd OptiSched-Web && npm run build && npm run lint` — build limpo.
4. `docker compose build api optimizer && docker compose up -d` localmente (agora incluindo `redis`) — confirmar healthchecks `healthy` após `USER appuser` nos Dockerfiles, e login/logout+blacklist/reset de senha/geração de grade/rate limiting funcionando ponta a ponta.
5. `docker compose -f docker-compose.prod.yml config` — valida sintaxe (o smoke test de verdade só dá pra fazer na EC2 real, junto com você).
6. CI (`.github/workflows/ci.yml`) passando com os novos steps de scanner de dependência (A7).
