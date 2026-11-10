---
description: Analisa o projeto atual e propõe novas funcionalidades e melhorias de UX/UI, sem alterar nada
argument-hint: "[foco opcional, ex.: mobile, gráficos, acessibilidade, onboarding]"
---

És um engenheiro sénior com olho de designer de produto. Analisa o estado atual
deste projeto e propõe **novas funcionalidades** e **melhorias de UX/UI**.
Esta tarefa é só de análise: **não alteres, cries nem apagues ficheiros do
repositório, não faças commits e não toques no Raspberry Pi.** Ficheiros
temporários só na scratchpad.

Foco pedido (pode estar vazio — nesse caso cobre tudo): **$ARGUMENTS**

Responde em português de Portugal.

## 1. Contexto obrigatório

Lê primeiro, por esta ordem:

1. `CLAUDE.md` — regras, arquitetura e, sobretudo, **"Explicitly out of scope"**.
2. `docs/HANDOFF.md` — estado atual, decisões já tomadas, limitações conhecidas.
3. `AGENTS.md` e, em diagonal, `DEPLOYMENT.md`.

As decisões da secção 3 do handoff estão fechadas: não as proponhas de novo
sem uma razão nova e concreta.

## 2. Inventário

- Rotas em `src/app/`, componentes em `src/components/`, lógica em `src/lib/`.
- `prisma/schema.prisma` e as migrações.
- Os dicionários `src/lib/i18n/dictionaries/{en,pt}.ts` (o texto que o
  utilizador lê, nas duas línguas).
- `git log --oneline -25` para perceber o que mudou recentemente.

## 3. Ver a app a correr

Sempre que possível, avalia a interface **a funcionar**, não só o código:

- Arranca a app localmente como descrito no `docs/HANDOFF.md` §4
  (PostgreSQL descartável + emulador do Firebase Auth +
  `npm run build && npm start`). Usa apenas contas e dados de teste locais.
- Cria dados realistas: um perfil, algumas dezenas de medições ao longo de
  vários meses, algumas parciais (só peso, só cintura), notas em algumas.
  Também uma conta **sem dados**, para ver os estados vazios.
- Percorre: registo e entrada, dashboard, gráfico (métricas, períodos, média
  móvel, comparação), lista/detalhe/edição de medições, perfil, importar e
  exportar, conta.
- Em **desktop (≈1280 px)** e **telemóvel (375 px)**, tema **claro e escuro**,
  **português e inglês**. Tira capturas do que for relevante.
- Lembra-te das limitações do browser integrado listadas no handoff §5
  (popups, separadores escondidos, `form_input`).

Se não conseguires correr a app, diz porquê e faz a análise só a partir do
código — e assinala nas propostas o que ficou por confirmar visualmente.

## 4. O que avaliar

- **Clareza dos dados**: o utilizador percebe de relance o valor atual, a
  tendência e a comparação? Unidades, datas, arredondamentos, legendas.
- **Estados**: vazio ("Ainda não há dados suficientes"), carregamento, erro,
  sucesso. Nunca gráficos vazios nem zeros enganadores.
- **Fluxo principal**: registar uma medição deve ser rápido no telemóvel
  (FAB, teclado numérico, valores por omissão, alcance do polegar).
- **Acessibilidade**: contraste, rótulos, foco visível, navegação por teclado,
  leitores de ecrã, cor nunca como único sinal.
- **Consistência visual e de texto** entre páginas e entre as duas línguas.
- **Desempenho no Pi e no telemóvel**: peso do bundle no cliente, trabalho
  feito no servidor por pedido.
- **Lacunas de funcionalidade** que o uso real sugere, dentro do âmbito.

## 5. Regras para as propostas

- Respeita o âmbito: **nada** de metas, planos, conselhos, pontuações de saúde,
  diagnósticos, notificações nem funcionalidades sociais. A app apresenta
  dados; não diz a ninguém como viver.
- Tem de correr em **ARM64** num Pi com 2 GB; nada de infraestrutura nova
  (Redis, filas, serviços extra) sem uma justificação muito forte.
- Prefere soluções sem dependências novas; quando forem precisas, diz qual,
  porquê, e o custo.
- Cada problema apontado precisa de **evidência**: `ficheiro:linha`, uma
  captura, ou os passos para o reproduzir.
- Separa **bugs** (algo que está errado hoje) de **melhorias** e de
  **funcionalidades novas**.

## 6. Formato da resposta

1. **Resumo** do estado do produto em 4–6 linhas.
2. **Problemas encontrados** — bugs e falhas de UX/UI, com evidência e
   gravidade (alta/média/baixa).
3. **Melhorias rápidas** — o que se faz em menos de 2 horas cada.
4. **Propostas** — 5 a 8 funcionalidades ou melhorias maiores. Para cada uma:
   - **Nome** e descrição em 2 linhas
   - **Problema que resolve** e evidência
   - **Complexidade** (horas ou dias, 1–5 dias no máximo)
   - **Custo operacional no Pi** (RAM, CPU, disco, rede; "nenhum" se for só lógica)
   - **Dependências novas** e o seu custo (gratuito / pago / self-hosted)
   - **Encaixe no âmbito** (porque não viola o "out of scope")
   - **Prioridade** (alta/média/baixa) com justificação de 1 linha
5. **Tabela resumo** de todas as propostas (nome, tipo, complexidade, custo no
   Pi, dependências, prioridade).
6. **O que ficou por verificar** — o que não conseguiste ver ou testar.

No fim, **pergunta quais queres implementar** e não avances sem resposta.
