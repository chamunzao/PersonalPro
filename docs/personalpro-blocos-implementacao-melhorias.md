# Blocos de implementacao das melhorias do PersonalPro

Data: 2026-05-13  
Branch: `melhoria-aula-resumo-presencial`  
Base: `docs/personalpro-plano-priorizado-melhorias.md`

## Criterios de trabalho

- Implementar em blocos pequenos, testaveis e aprovaveis.
- Priorizar a experiencia de aula presencial.
- Manter regra de negocio fora do JSX sempre que possivel.
- Criar ou atualizar testes antes de considerar o bloco concluido.
- Validar com build antes de entregar para aprovacao.

## Bloco 1 - Resumo presencial do aluno na Aula

Status: implementado para validacao.

Objetivo:

- Mostrar ao personal, antes da execucao da aula, um resumo rapido do aluno do horario.
- Reduzir a necessidade de abrir o perfil durante a aula.
- Destacar informacoes criticas: financeiro, treino ativo, ultima observacao e riscos da anamnese.

Implementado:

- Criado helper `src/features/session/sessionStudentSummary.js`.
- Criado teste `tests/sessionStudentSummary.test.mjs`.
- A aba `Aula` agora carrega anamnese sob demanda para os alunos do horario.
- A tela exibe um painel `Resumo do aluno` dentro do card da aula.
- O painel mostra:
  - primeiro nome do aluno;
  - alerta principal;
  - status financeiro ou saldo de pacote;
  - treino ativo;
  - ultima anotacao registrada;
  - tags de risco da anamnese.

Arquivos alterados:

- `src/features/session/sessionStudentSummary.js`
- `src/features/session/SessionTab.jsx`
- `src/features/billing/billingCalculations.js`
- `src/styles.css`
- `tests/sessionStudentSummary.test.mjs`

Validacao executada:

- `node tests\sessionStudentSummary.test.mjs`
- `node tests\sessionWorkouts.test.mjs`
- `node tests\recordsService.test.mjs`
- `npm run build`

Observacoes:

- O build passou.
- O Vite manteve um aviso de bundle maior que 500 kB; isso nao foi criado por este bloco, mas deve entrar em uma melhoria futura de performance.
- O workspace ja possuia alteracoes anteriores em varios arquivos. Por isso, este bloco foi entregue sem commit automatico para evitar misturar mudancas nao relacionadas.

## Bloco 2 - Organizar Aula em antes, durante e depois

Objetivo:

- Transformar a tela de aula em fluxo guiado.
- Separar visualmente preparacao, execucao e fechamento.

Status: implementado para validacao.

Como implementar:

- Extrair componentes internos ou arquivos dedicados:
  - `SessionBeforeClassPanel`
  - `SessionExecutionPanel`
  - `SessionAfterClassPanel`
- Manter o card do aluno como unidade principal.
- Reaproveitar o resumo criado no Bloco 1 como entrada do bloco `Antes da aula`.

Aceite:

- O personal entende rapidamente o que revisar antes da aula.
- A execucao do treino continua no centro da tela.
- As acoes finais ficam agrupadas e nao competem com o registro de series.

Implementado:

- Criado helper `src/features/session/sessionClassFlow.js` para definir os tres blocos da aula.
- Criado teste `tests/sessionClassFlow.test.mjs` para garantir ordem e estado dos blocos.
- A aba `Aula` agora separa o card do aluno em:
  - `Antes da aula`, com resumo do aluno;
  - `Durante a aula`, com treino, exercicios, series, repeticoes, carga e edicao;
  - `Depois da aula`, com notas gerais, salvar notas e nova versao do treino.
- Adicionados estilos responsivos para os blocos do fluxo presencial.

Validacao executada:

- `node tests\sessionClassFlow.test.mjs`
- `node tests\sessionStudentSummary.test.mjs`
- `node tests\sessionWorkouts.test.mjs`
- `node tests\recordsService.test.mjs`
- `npm run build`

## Bloco 3 - Check-out da aula

Objetivo:

- Criar fechamento rapido depois da aula.
- Padronizar o que deve ser registrado.

Status: implementado para validacao.

Como implementar:

- Adicionar campos curtos:
  - percepcao de esforco;
  - dor ou limitacao;
  - evolucao de carga;
  - proxima acao sugerida.
- Gerar resumo reutilizavel para historico do aluno.

Aceite:

- O personal consegue fechar a aula em menos de um minuto.
- As notas salvas alimentam a proxima aula.

Implementado:

- Criado helper `src/features/session/sessionCheckoutUtils.js`.
- Criado teste `tests/sessionCheckout.test.mjs`.
- O bloco `Depois da aula` agora possui campos de check-out:
  - esforco;
  - dor ou limitacao;
  - evolucao de carga;
  - proxima acao.
- O check-out e salvo junto com as notas da aula em `records`.
- Campos de check-out contam como alteracao da aula e liberam o fluxo de salvar/gerar nova versao.
- Quando uma nova versao de treino e criada, o resumo da versao inclui tambem o check-out preenchido.

Validacao executada:

- `node tests\sessionCheckout.test.mjs`
- `node tests\sessionNotes.test.mjs`
- `node tests\sessionClassFlow.test.mjs`
- `node tests\sessionStudentSummary.test.mjs`
- `node tests\sessionWorkouts.test.mjs`
- `node tests\recordsService.test.mjs`
- `npm run build`

## Bloco 4 - Perfil do aluno como hub presencial

Objetivo:

- Fazer o perfil responder o que o personal precisa saber antes de atender o aluno.

Status: implementado para validacao.

Como implementar:

- Criar bloco superior com:
  - status financeiro;
  - plano ou pacote;
  - proxima aula;
  - treino ativo;
  - riscos da anamnese;
  - ultimas observacoes.

Aceite:

- O perfil deixa de ser apenas cadastro e vira pagina de decisao.

Implementado:

- Criado helper `src/features/students/studentProfileSummary.js`.
- Criado teste `tests/studentProfileSummary.test.mjs`.
- Criado componente `src/features/students/StudentProfileSummaryTab.jsx`.
- O perfil do aluno agora abre na aba `Resumo`.
- A aba `Resumo` mostra:
  - proxima aula;
  - financeiro;
  - frequencia do mes;
  - treino ativo;
  - ultima aula;
  - riscos da anamnese;
  - observacoes recentes;
  - acoes para editar dados e abrir treino.

Validacao executada:

- `node tests\studentProfileSummary.test.mjs`
- `node tests\sessionStudentSummary.test.mjs`
- `node tests\sessionCheckout.test.mjs`
- `node tests\sessionNotes.test.mjs`
- `node tests\sessionClassFlow.test.mjs`
- `node tests\sessionWorkouts.test.mjs`
- `node tests\recordsService.test.mjs`
- `npm run build`

## Bloco 5 - Falta, reposicao e comunicacao

Objetivo:

- Guiar o personal quando o aluno falta ou precisa remarcar.

Status: implementado para validacao.

Como implementar:

- Adicionar motivo da falta.
- Registrar se gera reposicao.
- Criar mensagem pronta para WhatsApp.

Aceite:

- Falta nao vira apenas status; vira fluxo operacional.

Implementado:

- Criado helper `src/features/schedule/replacementActions.js`.
- Criado teste `tests/replacementActions.test.mjs`.
- Criado painel `src/features/schedule/ReplacementFlow.jsx`.
- Ao marcar falta na aba `Aula`, a falta continua sendo registrada rapidamente.
- Depois da falta, a tela oferece:
  - registrar motivo da falta;
  - criar reposicao com data e horario;
  - salvar reposicao como `scheduleOverride` do tipo `replacement`;
  - abrir mensagem pronta no WhatsApp quando houver telefone.
- A reposicao criada atualiza o estado local de agenda e passa a aparecer nas telas que usam `scheduleOverrides`.

Validacao executada:

- `node tests\replacementActions.test.mjs`
- `node tests\sessionClassFlow.test.mjs`
- `node tests\sessionNotes.test.mjs`
- `node tests\recordsService.test.mjs`
- `node tests\sessionStudentSummary.test.mjs`
- `node tests\sessionCheckout.test.mjs`
- `node tests\studentProfileSummary.test.mjs`
- `node tests\sessionWorkouts.test.mjs`
- `npm run build`

## Bloco 6 - Modelos de treino editaveis

Objetivo:

- Acelerar criacao e adaptacao de treinos.

Status: implementado para validacao.

Como implementar:

- Criar biblioteca de modelos por objetivo.
- Permitir aplicar modelo ao aluno e editar antes de salvar.
- Manter versoes do treino quando houver ajuste relevante.

Aceite:

- Um treino base pode ser aplicado sem redigitar exercicios.

Implementado:

- Criado helper `src/features/workouts/workoutModelUtils.js`.
- Criado teste `tests/workoutModels.test.mjs`.
- Os templates existentes agora sao tratados como modelos de sistema.
- A aba `Treinos` do perfil carrega modelos do usuario em `users/{userId}/workoutModels`.
- O seletor de modelo do formulario de treino permite aplicar modelos do sistema e modelos do usuario.
- Ao aplicar um modelo, o aluno recebe uma copia independente do treino.
- Cada treino existente ganhou acao `Modelo` para salvar o treino atual como modelo do usuario.

Validacao executada:

- `node tests\workoutModels.test.mjs`
- `node tests\sessionWorkouts.test.mjs`
- `node tests\studentProfileSummary.test.mjs`
- `node tests\replacementActions.test.mjs`
- `node tests\sessionNotes.test.mjs`
- `node tests\sessionClassFlow.test.mjs`
- `node tests\recordsService.test.mjs`
- `node tests\sessionStudentSummary.test.mjs`
- `npm run build`

## Bloco 7 - Pendencias acionaveis

Objetivo:

- Concentrar o que precisa ser resolvido.

Como implementar:

- Criar pendencias por categoria:
  - financeiro;
  - aulas;
  - anamnese;
  - treino;
  - comunicacao.
- Cada pendencia deve ter acao clara.

Aceite:

- A central de pendencias ajuda a decidir o proximo passo, nao apenas informa problemas.

## Bloco 8 - Relatorios de decisao

Objetivo:

- Melhorar a visao do personal sobre alunos, receita e rotina.

Como implementar:

- Separar relatorios por decisao:
  - quem esta devendo;
  - quem esta sem treino atualizado;
  - quem teve muitas faltas;
  - pacotes acabando;
  - alunos ativos por frequencia.

Aceite:

- Relatorios viram ferramenta de acao e acompanhamento.
