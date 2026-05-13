# Levantamento do PersonalPro com base no MFIT

Data: 2026-05-13  
Base de comparacao: analise do MFIT em `docs/mfit-user-app-analysis.md`  
Contexto do PersonalPro: personal/instrutor que atende alunos em aula presencial.

## Resumo executivo

O PersonalPro nao deve tentar virar uma copia do MFIT. O MFIT e uma plataforma ampla para operacao digital, prescricao, biblioteca, avaliacao, IA, assinatura e experiencia remota do aluno. O PersonalPro tem outro melhor caminho: ser o cockpit de aula presencial.

O publico do PersonalPro precisa resolver, com velocidade:

- quem tem aula hoje
- quem compareceu ou faltou
- o que aconteceu na aula
- qual treino foi ajustado na hora
- quem precisa pagar
- quem tem pacote acabando
- quem precisa receber mensagem
- quanto entrou, quanto ficou liquido e quanto foi pago para academia

O app atual ja tem uma base muito boa para esse posicionamento. Ele tem navegacao por bottom bar, dashboard operacional, aula como aba principal, agenda mensal/semanal, presenca, pagamentos, pendencias, comunicacao por WhatsApp, relatorios, perfil do aluno, anamnese, medidas, fotos, treinos e historico.

A maior oportunidade nao e adicionar dezenas de modulos. E organizar a experiencia ao redor do momento presencial da aula: antes da aula, durante a aula e depois da aula.

## Posicionamento recomendado

### PersonalPro em uma frase

PersonalPro e um app de operacao diaria para personal trainers que dao aulas presenciais, controlando agenda, presenca, treino executado, evolucao, pagamentos e comunicacao com alunos.

### Diferenca central em relacao ao MFIT

No MFIT, o treino digital e uma entrega importante para o aluno executar. No PersonalPro, a aula presencial e o evento principal. O treino existe para apoiar a sessao presencial, registrar progresso e orientar a proxima aula.

Isso muda as prioridades:

- MFIT prioriza biblioteca, prescricao detalhada, link do aluno, feedback remoto e assinatura do software.
- PersonalPro deve priorizar agenda, registro rapido de aula, ajuste de treino ao vivo, presenca, cobranca e continuidade do atendimento.

## Estrutura atual do PersonalPro

### Stack observada

- React 18
- Vite
- Firebase Authentication
- Firestore
- Vite PWA
- CSS proprio em `src/styles.css`
- Navegacao interna por estado de aba, sem React Router

### Dados principais

Colecoes atuais:

- `users/{userId}/students`
- `users/{userId}/records`
- `users/{userId}/payments`
- `users/{userId}/scheduleOverrides`
- `users/{userId}/students/{studentId}/measurements`
- `users/{userId}/students/{studentId}/workoutPlans`
- `users/{userId}/students/{studentId}/profile/anamnesis`
- `users/{userId}/students/{studentId}/progressPhotos`

O modelo ja esta muito conectado ao uso presencial:

- alunos tem horarios fixos
- registros usam chave por data, aluno e horario
- pagamentos podem ser por aula, pacote ou mensalidade
- agenda aceita aula fixa, avulsa, reposicao e remarcada
- sessoes de aula podem salvar nota geral, notas por exercicio e logs de serie

## Navegacao e arquitetura de experiencia

### Navegacao atual

A barra principal tem:

- Inicio
- Aula
- Agenda
- Alunos
- Mais

O menu Mais inclui:

- Pagamentos
- Pendencias
- Contato
- Relatorio
- Ajustes

Essa organizacao esta correta para aula presencial. O item "Aula" estar na barra principal e uma excelente decisao, porque ele corresponde ao momento de maior uso do app.

### Comparacao com MFIT

O MFIT usa home, assinatura, ajuda e perfil na bottom bar. Para o PersonalPro, isso seria fraco, porque o personal presencial nao abre o app para configurar assinatura: ele abre para executar aula.

O PersonalPro esta mais adequado ao publico porque coloca "Aula", "Agenda" e "Alunos" como rotas primarias.

### Oportunidade

Manter a bottom bar, mas tornar a experiencia ainda mais operacional:

- Inicio: cockpit do dia
- Aula: execucao da aula atual
- Agenda: visao de horarios e ajustes
- Alunos: base e perfil
- Mais: financeiro, pendencias, mensagens, relatorios e ajustes

## Dashboard atual

### O que ja existe

O dashboard atual funciona como painel do dia:

- aulas de hoje
- proxima acao
- resumo financeiro
- liquido no mes
- alertas criticos
- pagamentos pendentes
- cards para marcar presenca/falta
- lista de prioridades
- onboarding quando nao ha alunos

Esse e um dos pontos mais fortes do app atual. Ele ja se aproxima do "cockpit operacional" que foi observado no MFIT, mas com foco melhor para aula presencial.

### O que esta bem alinhado

- Mostra o que precisa acontecer hoje.
- Permite registrar presenca sem entrar em outra tela.
- Mostra pendencias e alertas.
- Mostra caixa liquido, que e uma dor real do personal.
- Usa linguagem de rotina presencial: aulas, registros, caixa, pendencias.

### Oportunidades

Adicionar no dashboard:

- bloco "Proxima aula" ainda mais forte, com botao direto para abrir a aula no horario correto
- indicador de aulas sem treino ativo
- indicador de alunos com pacote acabando
- indicador de alunos sem anamnese
- indicador de alunos com observacao importante para hoje
- resumo de remarcacoes/reposicoes da semana

## Aba Aula

### O que ja existe

A aba Aula e o maior diferencial do PersonalPro em relacao ao MFIT.

Ela permite:

- escolher data
- escolher horario
- carregar alunos naquele horario
- carregar treino ativo do aluno
- marcar presenca
- marcar falta
- registrar nota geral da aula
- registrar notas por exercicio
- registrar reps/carga realizadas por serie
- salvar anotacoes da sessao
- editar treino na propria aula
- criar nova versao do treino a partir do que aconteceu na aula

Isso e muito forte para aula presencial, porque o personal frequentemente ajusta carga, repeticoes, exercicios e observacoes na hora.

### Comparacao com MFIT

O MFIT tem prescricao digital muito mais completa, mas a logica dele parece mais centrada em montar e entregar treino. O PersonalPro ja tem um conceito melhor para presencial: a aula real gera dados e pode atualizar o treino.

Esse fluxo deveria ser o coracao do produto:

1. abrir aula atual
2. ver aluno(s) do horario
3. ver treino ativo
4. registrar execucao real
5. marcar presenca
6. salvar observacoes
7. gerar proxima versao do treino se necessario

### Lacunas atuais

Hoje a aba Aula ainda parece mais uma area operacional do que uma "tela de aula guiada". Oportunidades:

- destacar qual aluno esta em atendimento agora
- mostrar anamnese/resumo de restricoes no topo da aula
- mostrar alertas do aluno antes dos exercicios
- ter botao rapido "subiu carga", "manteve", "sentiu dor", "trocar exercicio"
- mostrar ultimo desempenho do mesmo exercicio
- permitir finalizar aula com checklist rapido
- gerar automaticamente resumo da aula

### Recomendacao de experiencia

A tela Aula deveria ser dividida em tres blocos:

#### Antes da aula

- aluno
- horario
- status financeiro resumido
- restricoes/anamnese critica
- treino ativo
- observacao da aula anterior

#### Durante a aula

- exercicios do treino
- series previstas
- carga/reps realizadas
- notas rapidas
- marcar presente/falta

#### Depois da aula

- resumo
- proxima acao
- atualizar treino
- enviar mensagem ao aluno
- marcar pagamento se for por aula

## Agenda

### O que ja existe

A agenda atual tem:

- visao mensal
- visao semanal
- resumo da semana
- aulas por dia
- status de presenca
- aula fixa
- aula avulsa
- reposicao
- remarcada
- modal/sheet de dia
- WhatsApp a partir do contexto da aula

Isso e muito adequado para presencial.

### Diferenca em relacao ao MFIT

No MFIT, calendario aparece mais como recurso entre muitos. No PersonalPro, agenda e espinha dorsal do negocio. A agenda define:

- receita esperada
- presenca
- reposicoes
- horario de trabalho
- carga semanal do personal

### Oportunidades

- arrastar/remarcar aula na semana
- destacar conflitos de horario
- indicar local da aula, caso o personal atenda em mais de uma academia/condominio
- indicar alunos sem pagamento diretamente no calendario
- botao "abrir aula" em cada item
- criar aula avulsa a partir de um dia vazio
- fluxo rapido de reposicao: selecionar falta e criar nova data

## Alunos e perfil do aluno

### O que ja existe

O app tem lista de alunos e perfil detalhado. O perfil possui abas:

- Dados
- Anamnese
- Medidas
- Fotos
- Treinos
- Historico

Isso ja cobre uma parte importante do que o MFIT faz, mas com uma abordagem mais enxuta.

### Dados do aluno

O app registra:

- nome
- email
- telefone
- preco por aula
- agenda fixa
- tipo de cobranca
- pacote/mensalidade
- vencimentos
- horarios
- possivelmente local padrao

### Anamnese

A anamnese atual tem campos praticos:

- objetivo principal
- historico de treino
- lesoes
- restricoes
- condicoes de saude
- medicamentos
- sono
- nutricao
- disponibilidade
- observacoes gerais

Ela tambem gera um resumo de risco com tags:

- lesao registrada
- restricao de treino
- condicao de saude
- uso de medicamento
- disponibilidade mapeada

Esse resumo e extremamente relevante para aula presencial. Ele deveria aparecer tambem na tela Aula quando houver risco.

### Medidas e fotos

O app permite medidas e fotos de evolucao. Para presencial, isso pode virar um ritual de acompanhamento:

- medir a cada 30 dias
- tirar fotos em ciclos
- relacionar evolucao com frequencia
- mostrar comparativo simples por periodo

### Treinos no perfil

O perfil ja tem planos de treino por aluno e usa modelos locais:

- `EXERCISE_LIBRARY`
- `WORKOUT_TEMPLATES`

Ha modelos como:

- Full body iniciante
- Hipertrofia A/B
- Emagrecimento circuito

O app tambem permite versoes de treino criadas a partir da aula. Essa parte e mais valiosa para presencial do que uma biblioteca complexa estilo MFIT.

### Historico

O historico mostra:

- registros de aula
- status presente/falta
- notas da aula
- atividade
- alteracoes por exercicio
- versoes recentes de treino

Esse e um grande diferencial. Ele transforma o perfil do aluno em linha do tempo do acompanhamento presencial.

### Comparacao com MFIT

O MFIT trata o perfil como hub amplo do aluno, com treino, avaliacao, progresso, financeiro, arquivos e notas. O PersonalPro ja tem quase o mesmo conceito, mas falta deixar o "Resumo" mais forte.

Hoje o perfil abre em "Dados". Para o publico presencial, talvez a primeira aba ideal seja "Resumo", com:

- proxima aula
- ultimo treino/aula
- status financeiro
- frequencia do mes
- restricoes importantes
- treino ativo
- nota interna

Dados cadastrais poderiam virar uma aba secundaria.

## Treinos e modelos

### O que existe hoje

O PersonalPro tem uma estrutura simples:

- biblioteca estatica de exercicios
- templates estaticos de treino
- planos de treino por aluno
- exercicios com sets, reps, peso, descanso, notas, grupo muscular, equipamento e instrucoes
- versoes de treino criadas a partir da aula

### Comparacao com MFIT

O MFIT tem uma arquitetura de treino mais granular:

- biblioteca
- pastas
- rotina
- sessao
- exercicio
- serie
- preset de serie
- clonagem
- aerobico
- feedback
- progresso

O PersonalPro nao precisa copiar tudo. Para aula presencial, a prioridade e menor:

1. modelo de treino reutilizavel
2. treino ativo por aluno
3. registro do que foi feito na aula
4. versao nova do treino quando houver alteracao
5. historico de progresso

### Oportunidade principal

Transformar os templates estaticos em "Modelos de treino" editaveis pelo usuario:

- criar modelo
- editar modelo
- duplicar modelo
- aplicar modelo em aluno
- salvar treino atual como modelo

Isso traz o ganho de produtividade do MFIT sem construir uma biblioteca pesada.

### Estrutura recomendada

Para o PersonalPro, usar:

- Modelo: treino reutilizavel sem aluno
- Plano ativo: treino atual do aluno
- Versao: alteracao gerada a partir da aula
- Sessao/Aula: execucao real de um dia

Nao e necessario, no primeiro momento, ter pastas, presets de series e prescricao digital super profunda.

## Pagamentos e financeiro

### O que ja existe

O app tem uma parte financeira bem alinhada com aula presencial:

- pagamento por aula
- pacote
- pacote mensal
- mensalidade
- credito de pacote
- aulas compradas
- aulas usadas
- vencimento
- pagamento avulso
- desconto
- acrescimo
- forma de pagamento
- observacao
- taxa da academia
- receita bruta
- receita liquida

Essa area e mais especifica para o publico do PersonalPro do que o MFIT, porque considera taxa por aula presencial.

### Ponto forte

O app calcula status de pacote e vencimento:

- vencido
- pacote esgotado
- vence em poucos dias
- poucas aulas
- em dia

Isso alimenta pendencias e comunicacao.

### Oportunidades

- card no perfil do aluno com credito/pagamento
- botao rapido na tela Aula: "registrar pagamento desta aula"
- historico financeiro por aluno
- previsao de receita da semana
- alerta de aluno com aula hoje e pagamento pendente

## Pendencias

### O que ja existe

A central de acoes calcula alertas e permite agir:

- cobranças vencidas
- cobranças a vencer
- pacote acabando
- aluno inativo
- aula sem registro
- enviar WhatsApp
- marcar pago
- marcar presente/falta

Esse e um padrao muito parecido com a central de atualizacoes do MFIT, mas adaptado melhor ao presencial.

### Oportunidade

Dar a cada pendencia um estado de resolucao ou adiamento:

- resolver
- lembrar amanha
- ignorar este mes
- enviar mensagem
- registrar pagamento
- abrir aula

Hoje muitas acoes ja resolvem indiretamente a pendencia. Um estado explicito ajudaria a evitar que ela reapareca sem contexto.

## Comunicacao

### O que ja existe

A central de comunicacao gera mensagens prontas para WhatsApp:

- confirmar semana
- cobrar pagamento
- pacote acabando
- check-in semanal
- enviar treino

Essa decisao e excelente. Para personal presencial, WhatsApp provavelmente e o canal principal.

### Comparacao com MFIT

O MFIT tem push e comunicacao interna. O PersonalPro deve continuar focado em WhatsApp, porque o publico presencial ja conversa ali.

### Oportunidades

- mensagem depois da aula com resumo simples
- mensagem de falta com reposicao
- mensagem automatizada de pacote quase acabando
- filtros: alunos com aula hoje, pagamento pendente, pacote acabando, sem WhatsApp
- copiar mensagem sem abrir WhatsApp

## Relatorios

### O que ja existe

Relatorio mensal com:

- total de aulas
- presentes
- faltas
- taxa de falta
- receita liquida
- taxa de pagamento
- receita bruta
- taxa da academia
- detalhamento por aluno

Isso cobre o essencial do negocio presencial.

### Oportunidades

- comparativo mes anterior
- ranking de faltas
- ranking de receita por aluno
- alunos com maior risco financeiro
- alunos com baixa frequencia
- exportacao simples
- visao semanal para fechamento rapido

## Lacunas em relacao ao publico presencial

### 1. Resumo do aluno antes da aula

O personal precisa abrir a aula e ver:

- restricoes
- dores
- objetivo
- ultima observacao
- pagamento/pacote
- treino ativo

Hoje esses dados existem espalhados, mas podem aparecer melhor no fluxo de aula.

### 2. Reposicao de falta

O app ja entende reposicao/remarcada, mas a experiencia pode ser mais guiada:

- aluno faltou
- registrar falta
- oferecer criar reposicao
- selecionar data e horario
- enviar WhatsApp com combinacao

### 3. Modelos editaveis

Templates estaticos ajudam, mas o personal precisa criar os proprios modelos.

### 4. Local de atendimento

O codigo ja tem conceito de local em calculos de agenda, mas a experiencia poderia destacar:

- academia
- condominio
- domicilio
- online eventual

Para aula presencial, local importa muito.

### 5. Check-out da aula

Ao finalizar aula:

- marcar presenca
- salvar cargas/reps
- salvar nota
- registrar pagamento se necessario
- criar proxima versao do treino
- enviar resumo opcional

Isso pode virar um fluxo guiado.

## Priorizacao recomendada

### Prioridade 1 - Consolidar o fluxo presencial

- Melhorar a tela Aula como experiencia de antes/durante/depois.
- Mostrar resumo critico do aluno na aula.
- Adicionar finalizacao de aula.
- Ligar falta a reposicao.

### Prioridade 2 - Melhorar perfil do aluno

- Criar aba Resumo como primeira aba.
- Mover Dados cadastrais para aba secundaria.
- Mostrar proxima aula, status financeiro, frequencia, restricoes e ultimo historico.
- Deixar notas internas mais proximas do resumo.

### Prioridade 3 - Modelos de treino editaveis

- Criar area de modelos.
- Permitir salvar treino atual como modelo.
- Permitir aplicar modelo ao aluno.
- Permitir duplicar modelo.

### Prioridade 4 - Comunicacao contextual

- Mensagem de pos-aula.
- Mensagem de falta/reposicao.
- Mensagem de pacote acabando com dados reais.
- Filtros por situacao.

### Prioridade 5 - Relatorios de decisao

- Comparativo mensal.
- Alunos com mais faltas.
- Alunos que mais geram receita.
- Previsao semanal.

## Mapa de telas ideal para o PersonalPro

### Inicio

Função: mostrar o dia e as prioridades.

Conteudo:

- proxima aula
- aulas de hoje
- pendencias criticas
- liquido do mes
- pagamentos pendentes
- pacotes acabando

### Aula

Função: executar a sessao presencial.

Conteudo:

- data e horario
- aluno(s) do horario
- resumo do aluno
- treino ativo
- registro por exercicio
- presenca/falta
- notas
- finalizar aula

### Agenda

Função: organizar horario presencial.

Conteudo:

- mes/semana
- aulas fixas
- avulsas
- reposicoes
- remarcadas
- status de presenca
- abrir aula
- enviar WhatsApp

### Alunos

Função: base e acompanhamento individual.

Conteudo:

- lista
- busca/filtros
- perfil
- resumo
- anamnese
- medidas
- fotos
- treinos
- historico
- financeiro do aluno

### Mais

Função: rotinas complementares.

Conteudo:

- pagamentos
- pendencias
- comunicacao
- relatorios
- ajustes
- modelos de treino, quando existir

## O que copiar do MFIT

Copiar como principio, nao como tela:

- home como cockpit
- cards de acao com contadores
- perfil do aluno como hub
- treino em camadas
- modelos reutilizaveis
- central de alertas acionaveis
- comunicacao pronta
- estados vazios guiados

## O que nao copiar do MFIT agora

- assinatura complexa
- push interno
- loja/cursos/ecossistema de marca
- biblioteca com pastas complexas logo no inicio
- presets de series antes dos modelos editaveis
- fluxo remoto do aluno com login proprio
- excesso de rotas profundas

Essas coisas fazem sentido para uma plataforma grande, mas podem tirar foco do PersonalPro.

## Conclusao

O PersonalPro ja tem uma base muito promissora e, em alguns pontos, mais adequada ao publico presencial do que o MFIT. A maior forca atual e a aba Aula: ela conecta agenda, presenca, treino, anotacoes e versao de treino. Isso deve virar o centro da experiencia.

O melhor caminho e evoluir o PersonalPro como um app de execucao presencial:

- Inicio mostra o que exige atencao hoje.
- Aula guia o atendimento ao vivo.
- Agenda organiza a rotina.
- Perfil resume o acompanhamento.
- Pagamentos e pendencias fecham o ciclo operacional.

Com essa direcao, o PersonalPro pode ser mais simples que o MFIT e, ao mesmo tempo, mais util para o personal que vive de aulas presenciais.
