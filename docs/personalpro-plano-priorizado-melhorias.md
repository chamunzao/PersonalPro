# Plano priorizado de melhorias do PersonalPro

Data: 2026-05-13  
Base: `docs/personalpro-levantamento-com-base-mfit.md` e `docs/mfit-user-app-analysis.md`  
Contexto: app para personal/instrutor que atende alunos em aulas presenciais.

## Objetivo

Evoluir o PersonalPro como um cockpit de aula presencial: o app deve ajudar o personal a preparar a aula, executar o atendimento, registrar o que aconteceu, ajustar treino, controlar presenca, cobrar corretamente e manter o relacionamento com o aluno.

O foco nao e copiar o MFIT. O foco e aproveitar os principios bons do MFIT, como cockpit, perfil como hub, modelos reutilizaveis e alertas acionaveis, mas adaptando ao contexto presencial.

## Principios de decisao

1. A aba `Aula` e o centro do produto.
2. O perfil do aluno deve responder "o que eu preciso saber antes de atender esse aluno?".
3. Toda pendencia deve ter uma acao clara.
4. WhatsApp e o canal principal de comunicacao.
5. Modelos de treino devem economizar tempo, nao criar complexidade.
6. O app deve continuar simples, mobile-first e rapido durante a aula.
7. As melhorias devem ser feitas em fases pequenas, sempre testaveis.

## Ordem geral de prioridade

1. Consolidar o fluxo presencial da aba Aula.
2. Criar o Resumo do aluno no perfil.
3. Criar fluxo guiado de falta e reposicao.
4. Criar modelos de treino editaveis.
5. Criar fechamento/check-out da aula.
6. Fortalecer Pendencias como central de acoes.
7. Melhorar Comunicacao contextual.
8. Melhorar Relatorios de decisao.

## Fase 1 - Aula como fluxo presencial guiado

### Objetivo

Transformar a aba `Aula` de uma tela operacional em um fluxo claro de antes, durante e depois da aula.

### Por que vem primeiro

Essa e a maior diferenca do PersonalPro em relacao ao MFIT. O MFIT e forte em prescricao digital; o PersonalPro pode ser melhor em execucao presencial. Se essa fase ficar boa, o produto passa a ter uma identidade muito clara.

### Escopo

Melhorar a tela de aula para mostrar:

- aula selecionada
- aluno(s) do horario
- resumo critico do aluno
- treino ativo
- ultimas observacoes
- presenca/falta
- anotacoes por exercicio
- cargas/reps realizadas
- acoes finais da aula

### Arquivos principais

- `src/features/session/SessionTab.jsx`
- `src/features/session/sessionWorkouts.js`
- `src/services/recordsService.js`
- `src/services/appDataService.js`
- `src/features/students/StudentsTab.jsx`
- `src/features/billing/billingCalculations.js`
- `src/features/schedule/scheduleCalculations.js`
- `src/styles.css`
- `tests/sessionWorkouts.test.mjs`
- `tests/recordsService.test.mjs`

### Implementacao proposta

#### 1.1 Criar helper de resumo presencial do aluno

Criar um arquivo:

- `src/features/session/sessionStudentSummary.js`

Responsabilidade:

- receber `student`, `records`, `payments`, `anamnesis`, `activeWorkout`, `selectedDate`
- devolver um resumo pronto para tela

Dados calculados:

- primeiro nome
- status financeiro
- status de pacote
- restricoes de anamnese
- ultima aula registrada
- ultima observacao
- treino ativo
- alerta principal

Estrutura sugerida:

```js
export function buildSessionStudentSummary({
  student,
  records,
  payments,
  anamnesis,
  activeWorkout,
  selectedDate
}) {
  return {
    studentName: student?.name || "",
    firstName: getFirstName(student?.name),
    financialLabel: "",
    financialSeverity: "ok",
    riskTags: [],
    lastSessionNote: "",
    activeWorkoutName: activeWorkout?.name || "",
    primaryAlert: null
  };
}
```

Testes:

- aluno sem anamnese deve retornar `riskTags` vazio
- aluno com lesao deve retornar tag de risco
- aluno com pagamento vencido deve retornar severidade financeira
- aluno com ultima aula anotada deve retornar ultima observacao

#### 1.2 Carregar anamnese resumida na aba Aula

Hoje a anamnese e carregada no perfil. A aba Aula precisa acessar pelo menos os dados criticos.

Opcoes:

- carregar anamnese sob demanda para os alunos do horario
- ou adicionar um resumo persistido no aluno futuramente

Recomendacao inicial:

- carregar sob demanda em `SessionTab.jsx` para os alunos do horario atual
- armazenar em estado local `anamnesisByStudent`

Aceite:

- ao selecionar horario com aluno, a tela mostra riscos relevantes quando existirem
- se a anamnese nao existir, a tela nao quebra
- a aula continua utilizavel mesmo se a leitura falhar

#### 1.3 Reorganizar a tela Aula em tres blocos

Dentro de `SessionTab.jsx`, separar visualmente:

1. `Antes da aula`
2. `Durante a aula`
3. `Depois da aula`

Sugestao de componentes internos ou novos:

- `SessionBeforeClassPanel`
- `SessionExecutionPanel`
- `SessionAfterClassPanel`

Se `SessionTab.jsx` estiver grande, criar:

- `src/features/session/SessionBeforeClassPanel.jsx`
- `src/features/session/SessionExecutionPanel.jsx`
- `src/features/session/SessionAfterClassPanel.jsx`

Aceite:

- a tela deve deixar claro o que fazer antes, durante e depois
- em mobile, os blocos devem empilhar verticalmente
- em desktop, pode manter coluna principal e lateral

#### 1.4 Destacar aluno/aula atual

Na selecao de horario, destacar:

- horario selecionado
- aluno atual
- tipo de aula: fixa, avulsa, reposicao ou remarcada
- local, se existir

Aceite:

- o personal identifica em menos de 3 segundos qual aula esta registrando
- a troca de horario nao perde rascunhos ja salvos

#### 1.5 Adicionar acoes rapidas por exercicio

No bloco de exercicios, adicionar acoes curtas:

- `Subiu carga`
- `Manteve`
- `Sentiu dor`
- `Trocar`

Implementacao inicial:

- essas acoes podem preencher a nota do exercicio com texto padrao
- nao precisa ainda alterar automaticamente o treino

Exemplo:

- `Subiu carga`: adiciona `Aumentou carga nesta aula.`
- `Manteve`: adiciona `Manteve carga/repeticoes.`
- `Sentiu dor`: adiciona `Relatou dor/desconforto. Revisar exercicio.`
- `Trocar`: adiciona `Avaliar substituicao deste exercicio.`

Aceite:

- o personal consegue registrar ocorrencias sem digitar texto longo
- a nota continua editavel manualmente

### Validacao da fase

Comandos:

- `npm test`, se testes forem adicionados ao script
- ou executar testes existentes diretamente com Node, seguindo o padrao atual em `tests/*.test.mjs`
- `npm run build`

Teste manual:

1. abrir app
2. ir em `Aula`
3. selecionar data com aula
4. selecionar horario
5. marcar presenca
6. preencher nota geral
7. preencher carga/reps
8. usar uma acao rapida
9. salvar
10. confirmar que aparece no historico do aluno

## Fase 2 - Resumo do aluno como primeira aba do perfil

### Objetivo

Criar uma aba `Resumo` no perfil do aluno para consolidar tudo que importa antes de atender ou decidir algo sobre aquele aluno.

### Por que vem em segundo

O perfil ja existe e tem muitos dados, mas abre em `Dados`. Para aula presencial, a primeira tela deve ser operacional, nao cadastral.

### Escopo

Adicionar uma aba `Resumo` antes de `Dados`, contendo:

- proxima aula
- ultimo registro de aula
- status financeiro/pacote
- frequencia do mes
- restricoes importantes
- treino ativo
- notas internas ou observacoes recentes
- acoes rapidas

### Arquivos principais

- `src/features/students/StudentsTab.jsx`
- `src/features/students/StudentProfileDataTab.jsx`
- `src/features/billing/billingCalculations.js`
- `src/features/schedule/scheduleCalculations.js`
- `src/features/reports/reportsCalculations.js`
- `src/styles.css`

### Implementacao proposta

#### 2.1 Criar componente `StudentProfileSummaryTab`

Arquivo:

- `src/features/students/StudentProfileSummaryTab.jsx`

Props:

```js
{
  student,
  studentId,
  records,
  payments,
  scheduleOverrides,
  workoutPlans,
  anamnesis,
  theme,
  onEdit,
  onOpenWorkout,
  onOpenSession
}
```

Se a navegacao continuar por abas internas, `onOpenWorkout` pode trocar `activeTab` para `treinos`.

Cards recomendados:

- `Proxima aula`
- `Financeiro`
- `Frequencia`
- `Riscos`
- `Treino ativo`
- `Ultima aula`

#### 2.2 Criar helper de metricas do resumo

Arquivo:

- `src/features/students/studentProfileSummary.js`

Funcoes:

- `getNextStudentClass`
- `getStudentMonthAttendance`
- `getLastStudentRecord`
- `getStudentRiskTags`
- `getActiveWorkoutPlan`

Testes:

- criar `tests/studentProfileSummary.test.mjs`

Casos:

- aluno sem aulas futuras retorna nulo
- aluno com presencas no mes retorna taxa correta
- anamnese com lesao retorna tag
- treino ativo deve ser o primeiro `active === true`, ou primeiro treino se nenhum ativo

#### 2.3 Alterar tabs do perfil

Em `StudentProfile`, alterar:

- estado inicial de `activeTab` de `"dados"` para `"resumo"`
- inserir `{ id: "resumo", label: "Resumo" }` antes de `Dados`

Aceite:

- ao abrir aluno, a primeira aba e Resumo
- Dados continua acessivel
- nenhuma aba atual perde dados

#### 2.4 Adicionar acoes rapidas

No Resumo:

- `Abrir treino`
- `WhatsApp`
- `Registrar pagamento`
- `Editar dados`

No primeiro passo, `Registrar pagamento` pode apenas direcionar para a aba/tela de pagamentos, se nao houver navegacao granular por aluno.

Aceite:

- botoes nao quebram em alunos sem telefone, treino ou pagamento
- botoes indisponiveis mostram estado claro

## Fase 3 - Fluxo guiado de falta e reposicao

### Objetivo

Transformar uma falta em uma decisao operacional: apenas registrar, criar reposicao ou enviar mensagem.

### Escopo

Quando o personal marcar falta:

- oferecer criar reposicao
- sugerir mensagem de WhatsApp
- permitir selecionar data e horario
- salvar como `scheduleOverride` do tipo `replacement`

### Arquivos principais

- `src/features/session/SessionTab.jsx`
- `src/features/attendance/attendanceActions.js`
- `src/features/schedule/AgendaTab.jsx`
- `src/features/schedule/scheduleCalculations.js`
- `src/features/alerts/AlertsTab.jsx`
- `src/styles.css`
- `tests/navigation.test.mjs`

### Implementacao proposta

#### 3.1 Criar helper de reposicao

Arquivo:

- `src/features/schedule/replacementActions.js`

Funcoes:

- `buildReplacementOverride`
- `buildAbsenceReplacementMessage`
- `getAvailableReplacementDefaults`

`buildReplacementOverride` deve gerar payload compativel com `buildScheduleOverridePayload`.

#### 3.2 Criar modal/sheet `ReplacementFlow`

Arquivo:

- `src/features/schedule/ReplacementFlow.jsx`

Props:

```js
{
  student,
  missedClass,
  onClose,
  onSaveReplacement,
  theme
}
```

Campos:

- data
- horario
- observacao
- botao salvar reposicao
- botao WhatsApp

#### 3.3 Integrar na Aula

Em `SessionTab.jsx`, apos marcar falta:

- abrir `ReplacementFlow`
- permitir "Agora nao"

Aceite:

- marcar falta continua rapido
- criar reposicao e opcional
- reposicao aparece na agenda

#### 3.4 Integrar nas Pendencias

Em `AlertsTab.jsx`, para alertas de falta ou aula sem registro:

- se marcar falta, permitir criar reposicao

Aceite:

- mesma experiencia da aba Aula
- nao duplicar logica de payload

## Fase 4 - Modelos de treino editaveis

### Objetivo

Substituir o uso exclusivo de templates estaticos por modelos de treino editaveis pelo usuario.

### Escopo

Criar uma area de modelos:

- listar modelos do sistema e do usuario
- criar modelo
- editar modelo
- duplicar modelo
- aplicar modelo ao aluno
- salvar treino atual como modelo

### Arquivos principais

- `src/features/workouts/workoutPresets.js`
- `src/features/students/StudentsTab.jsx`
- `src/features/session/SessionTab.jsx`
- `src/appNavigation.js`
- `src/App.jsx`
- `src/services/appDataService.js`
- `src/styles.css`

Novos arquivos sugeridos:

- `src/features/workouts/WorkoutModelsTab.jsx`
- `src/features/workouts/workoutModelService.js`
- `src/features/workouts/workoutModelUtils.js`
- `tests/workoutModels.test.mjs`

### Estrutura de dados

Colecao sugerida:

- `users/{userId}/workoutModels/{modelId}`

Campos:

```js
{
  name: "Hipertrofia A/B",
  goal: "Hipertrofia",
  level: "Intermediario",
  notes: "",
  exercises: [
    {
      name: "Supino reto",
      sets: "4",
      reps: "8-10",
      weight: "",
      rest: "90s",
      notes: "",
      muscleGroup: "Peito",
      equipment: "Barra",
      instructions: ""
    }
  ],
  createdAt: "13/05/2026",
  updatedAt: "13/05/2026"
}
```

### Implementacao proposta

#### 4.1 Extrair modelos do sistema

Manter `WORKOUT_TEMPLATES` como modelos do sistema.

Criar util:

- `getSystemWorkoutModels()`
- `normalizeWorkoutModel(model)`
- `cloneModelToWorkoutPlan(model, studentId)`

#### 4.2 Criar tela `Modelos`

Adicionar em `Mais`:

- `Modelos`

Em `appNavigation.js`, incluir item:

```js
{ id: "workoutModels", label: "Modelos", description: "Treinos prontos para aplicar em alunos" }
```

Em `App.jsx`, renderizar `WorkoutModelsTab`.

#### 4.3 Criar CRUD de modelos

Servico:

- `fetchWorkoutModels(userId)`
- `createWorkoutModel(userId, model)`
- `updateWorkoutModel(userId, modelId, model)`
- `deleteWorkoutModel(userId, modelId)`

Aceite:

- modelos do usuario persistem no Firestore
- modelos do sistema aparecem como base, mas nao sao editados diretamente
- duplicar modelo do sistema cria um modelo do usuario

#### 4.4 Aplicar modelo no aluno

No perfil do aluno, aba Treinos:

- botao `Aplicar modelo`
- selecionar modelo
- criar `workoutPlan` no aluno
- marcar como ativo se o usuario escolher

Aceite:

- aluno recebe treino copiado
- alteracoes futuras no modelo nao alteram treino ja aplicado

#### 4.5 Salvar treino atual como modelo

Na aba Treinos do aluno:

- botao `Salvar como modelo`
- cria documento em `workoutModels`

Aceite:

- modelo aparece na tela Modelos
- exercicios sao preservados

## Fase 5 - Fechamento/check-out da aula

### Objetivo

Criar um fechamento curto para garantir que a aula terminou com dados completos e proximas acoes claras.

### Escopo

Ao fim da aula, mostrar checklist:

- presenca/falta registrada
- notas salvas
- cargas/reps salvas
- houve alteracao de treino?
- criar nova versao?
- pagamento pendente?
- enviar resumo por WhatsApp?

### Arquivos principais

- `src/features/session/SessionTab.jsx`
- `src/features/communication/CommunicationTab.jsx`
- `src/features/payments/PaymentsTab.jsx`
- `src/services/recordsService.js`
- `src/styles.css`

Novos arquivos:

- `src/features/session/SessionCheckoutPanel.jsx`
- `src/features/session/sessionCheckoutUtils.js`
- `tests/sessionCheckout.test.mjs`

### Implementacao proposta

#### 5.1 Criar helper de checkout

Funcoes:

- `buildSessionCheckoutStatus`
- `buildPostClassMessage`
- `shouldSuggestWorkoutVersion`
- `shouldSuggestPayment`

#### 5.2 Criar painel de fechamento

Mostrar no final da aula:

- chips de status
- botoes:
  - `Salvar notas`
  - `Criar nova versao do treino`
  - `Enviar resumo`
  - `Registrar pagamento`

#### 5.3 Mensagem pos-aula

Mensagem sugerida:

```text
Oi, {nome}! Aula de hoje registrada.

Resumo:
- {presenca}
- {principais observacoes}
- {ajustes de treino}

Qualquer dor ou duvida ate a proxima aula, me chama por aqui.
```

Aceite:

- se aluno nao tem telefone, botao de WhatsApp fica desabilitado
- se nao ha observacoes, mensagem nao fica vazia

## Fase 6 - Pendencias como central de acoes

### Objetivo

Fazer a tela `Pendencias` funcionar como uma lista de tarefas resolviveis, nao apenas alertas calculados.

### Escopo

Adicionar acoes:

- resolver
- adiar
- ignorar este mes
- abrir aula
- criar reposicao
- WhatsApp
- marcar pago

### Arquivos principais

- `src/features/alerts/AlertsTab.jsx`
- `src/features/alerts/alertsCalculations.js`
- `src/features/session/SessionTab.jsx`
- `src/features/schedule/replacementActions.js`
- `src/styles.css`

### Estrutura de dados sugerida

Colecao:

- `users/{userId}/alertActions/{alertActionId}`

Campos:

```js
{
  alertId: "payment_due_studentId_2026-05",
  status: "resolved",
  snoozedUntil: "",
  ignoredForMonth: "2026-05",
  createdAt: "13/05/2026",
  updatedAt: "13/05/2026"
}
```

### Implementacao proposta

1. Manter alertas calculados como fonte principal.
2. Aplicar camada de estado por cima:
   - se resolvido, ocultar
   - se adiado, ocultar ate a data
   - se ignorado no mes, ocultar no mes
3. Nao persistir alertas inteiros, apenas decisoes do usuario.

Aceite:

- pendencia resolvida nao reaparece imediatamente
- adiar funciona ate data escolhida
- acoes existentes continuam funcionando

## Fase 7 - Comunicacao contextual

### Objetivo

Melhorar mensagens prontas para WhatsApp com base no contexto real do aluno.

### Escopo

Adicionar mensagens:

- pos-aula
- falta e reposicao
- confirmacao da proxima aula
- pacote acabou
- pagamento pendente antes da aula
- aluno inativo

### Arquivos principais

- `src/features/communication/CommunicationTab.jsx`
- `src/features/alerts/AlertsTab.jsx`
- `src/features/session/sessionCheckoutUtils.js`
- `src/features/schedule/replacementActions.js`

Novo arquivo:

- `src/features/communication/messageTemplates.js`

### Implementacao proposta

Centralizar templates em `messageTemplates.js`:

- `buildWeeklyConfirmationMessage`
- `buildPaymentReminderMessage`
- `buildPackageEndingMessage`
- `buildPostClassMessage`
- `buildAbsenceReplacementMessage`
- `buildNextClassConfirmationMessage`

Aceite:

- mensagens usam primeiro nome
- mensagens usam dados reais quando disponiveis
- mensagens nao quebram se dado estiver ausente

## Fase 8 - Relatorios de decisao

### Objetivo

Transformar relatorios em ferramenta de decisao, nao apenas fechamento mensal.

### Escopo

Adicionar:

- comparativo com mes anterior
- ranking de faltas
- ranking de receita por aluno
- alunos com pacote acabando
- previsao de receita da semana

### Arquivos principais

- `src/features/reports/ReportsTab.jsx`
- `src/features/reports/reportsCalculations.js`
- `src/features/billing/billingCalculations.js`
- `src/features/schedule/scheduleCalculations.js`
- `src/styles.css`

### Implementacao proposta

#### 8.1 Expandir calculos

Em `reportsCalculations.js`, adicionar:

- `calculatePreviousMonthComparison`
- `getTopAbsenceStudents`
- `getTopRevenueStudents`
- `getUpcomingPackageRisks`
- `calculateWeeklyRevenueForecast`

#### 8.2 Atualizar UI

Em `ReportsTab.jsx`, adicionar cards:

- comparativo de receita liquida
- alunos com mais faltas
- maiores receitas
- riscos de pacote
- previsao da semana

Aceite:

- relatorio continua legivel no mobile
- informacoes novas nao substituem os cards atuais
- calculos sao testados isoladamente

## Roadmap recomendado por sprints

### Sprint 1

Foco: base da aula presencial.

Entregas:

- helper de resumo presencial
- bloco Antes da aula
- riscos/anamnese na Aula
- destaque do aluno/horario atual

### Sprint 2

Foco: perfil como hub.

Entregas:

- aba Resumo no perfil
- metricas de frequencia e financeiro
- ultimo registro de aula
- treino ativo e riscos

### Sprint 3

Foco: falta, reposicao e fechamento.

Entregas:

- fluxo de reposicao
- mensagem de falta
- painel de fechamento da aula
- mensagem pos-aula

### Sprint 4

Foco: produtividade com treinos.

Entregas:

- tela Modelos
- CRUD de modelos
- aplicar modelo no aluno
- salvar treino como modelo

### Sprint 5

Foco: operacao e decisao.

Entregas:

- pendencias com resolver/adiar/ignorar
- comunicacao contextual centralizada
- relatorios comparativos

## Critérios de sucesso do produto

Depois dessas melhorias, o PersonalPro deve permitir que o personal:

- abra o app e saiba a proxima aula
- conduza uma aula sem sair da aba Aula
- veja restricoes do aluno antes de prescrever ou executar
- registre presenca, carga, reps e observacoes rapidamente
- crie nova versao do treino a partir do que aconteceu
- resolva falta com reposicao e mensagem
- veja no perfil um resumo real do aluno
- use modelos de treino proprios
- cobre e acompanhe pacotes sem planilha paralela
- tome decisoes por relatorio

## Riscos e cuidados

### Risco 1 - Deixar a tela Aula pesada

Mitigacao:

- usar blocos recolhiveis
- priorizar informacao critica
- esconder detalhes secundarios

### Risco 2 - Criar modelos de treino complexos demais

Mitigacao:

- comecar com treino completo editavel
- nao criar pastas/presets de series na primeira versao

### Risco 3 - Duplicar regras de negocio

Mitigacao:

- mover calculos para helpers testaveis
- reutilizar `billingCalculations`, `scheduleCalculations` e novos utils

### Risco 4 - Aumentar friccao durante a aula

Mitigacao:

- toda acao critica deve ser feita em 1 ou 2 toques
- campos longos devem ser opcionais
- acoes rapidas devem preencher notas automaticamente

## Ordem de implementacao tecnica recomendada

1. Criar helpers puros e testes.
2. Integrar helpers na UI.
3. Ajustar CSS responsivo.
4. Validar fluxo manual.
5. Rodar build.
6. Repetir por fase.

Essa ordem reduz risco porque os calculos ficam testados antes da interface depender deles.

## Primeira tarefa sugerida

Comecar pela Fase 1, tarefa 1.1:

Criar `src/features/session/sessionStudentSummary.js` com testes em `tests/sessionStudentSummary.test.mjs`.

Essa tarefa e pequena, nao altera UI de imediato e cria a base para mostrar o resumo critico do aluno na aba Aula e depois no perfil.
