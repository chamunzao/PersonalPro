# Analise do aplicativo MFIT Personal - area do personal

Data da analise: 2026-05-13  
URL observada: https://user.mfitpersonal.com.br/user

## Escopo e metodo

Esta analise foi feita com foco em produto, experiencia do usuario, layout, arquitetura de telas e ideias que podem inspirar melhorias no PersonalPro.

O acesso autenticado nao foi executado por mim, para nao manipular senha, dados privados ou sessoes reais. A leitura foi baseada nos arquivos publicos carregados pela aplicacao:

- HTML inicial da pagina `/user`
- CSS publico `main.8c840850.css`
- bundle JavaScript publico `main.f23ea64a.js`
- source map publico `main.f23ea64a.js.map`

Por isso, as telas descritas abaixo sao uma combinacao de observacoes diretas da estrutura do app e inferencias fortes a partir de rotas, componentes e nomes originais presentes no source map.

## Visao geral

O MFIT Personal e uma aplicacao web SPA, feita em React, para profissionais de treino acompanharem alunos, treinos, avaliacoes, notificacoes, planos e recursos comerciais.

O app nao parece ser apenas uma lista de alunos. Ele funciona como um painel operacional completo para o personal:

- cadastrar e organizar alunos
- criar treinos e sessoes
- montar biblioteca de exercicios e modelos de treino
- acompanhar feedbacks e progresso
- enviar comunicacoes/push
- receber alertas e atualizacoes
- fazer avaliacoes fisicas, online, bioimpedancia e anamnese
- controlar assinatura, pagamentos e plano
- acessar conteudos, cursos, loja, pontos e canais externos da marca
- usar recursos de IA para gerar treino, resumo de anamnese, analise de avaliacao e mensagens

A experiencia principal parece ser mobile-first, mas com suporte desktop/tablet.

## Stack tecnica observada

### Frontend

- React SPA
- React Router para rotas internas
- Redux Toolkit
- Redux Saga para fluxos assicronos
- RTK Query em areas mais novas, como retencao
- Axios para chamadas HTTP
- React Bootstrap e Bootstrap 5.3.2 como base visual
- Font Awesome 6.7.1 e icones proprietarios da MFIT
- i18next para internacionalizacao
- Formik para formularios
- FullCalendar para calendario
- Chart.js e react-chartjs-2 para graficos
- dnd-kit para drag and drop, especialmente em treino e ordenacao
- FingerprintJS para identificacao de dispositivo
- Microsoft Clarity para analytics/session replay
- Wootric para coleta de feedback/NPS

### Backend e dominios

API principal:

- `https://api.mfitpersonal.com.br`
- `https://api.mfitpersonal.com.br/v2`

Outros dominios integrados:

- `cdn.mfitpersonal.com.br`: imagens, fontes, logos, audios, bandeiras e icones
- `client.mfitpersonal.com.br`: experiencia externa do aluno, links de anamnese e cadastro
- `payments.mfitpersonal.com.br`: redirecionamento de pagamentos
- `wallet.mfitpersonal.com.br`: carteira/transferencias
- `whatsapp.mfitpersonal.com.br`: suporte ou comunicacao via WhatsApp
- `share.mfitpersonal.com.br`: compartilhamento
- `vd.mfitpersonal.com.br`: videos/medicoes
- `mfitcursos.mfitpersonal.com.br`, `mfitdeouro.mfitpersonal.com.br`, `pontos.mfitpersonal.com.br`, `blog.mfitpersonal.com.br`, `news.mfitpersonal.com.br`, `loja.mfitpersonal.com.br`: ecossistema de marca/conteudo/comunidade/comercial

## Arquitetura do app

A organizacao encontrada e bem modular:

- `api/*Actions.js`: funcoes de acesso HTTP por dominio
- `store/*Reducer.js`: estados por modulo
- `store/*Saga.js`: orquestracao de chamadas, efeitos e fluxos
- `store/*Selector.js`: seletores do Redux
- `pages/*`: paginas/rotas principais
- `components/*`: componentes reaproveitaveis
- `utils/*`: regras de negocio, formatadores, upload, rotas auxiliares, validacoes
- `routes/*`: guards e rotas protegidas

Isso mostra uma arquitetura antiga/robusta com Redux Saga em boa parte do app, e sinais de evolucao para RTK Query em areas mais recentes.

## Controle de acesso e estado global

A rota principal logada e envolvida por `UserRoute`. Esse componente faz varias verificacoes antes de entregar a experiencia:

- busca dados do usuario
- valida versao atual do app
- verifica senha ruim ou invalida
- verifica bloqueio de usuario
- verifica chargeback pendente
- verifica CSAT pendente
- verifica permissao
- identifica usuario no Microsoft Clarity
- atualiza idioma conforme preferencia do usuario
- resolve pais de pagamento
- envia timezone do navegador
- registra identificador push
- coleta informacoes de dispositivo com FingerprintJS

Na pratica, a tela logada nao e apenas renderizada: antes dela existe uma camada de governanca que pode redirecionar o personal para telas obrigatorias, como:

- `/blocked`
- `/chargeback`
- `/csat`
- `/exceeded-limit`
- `/block/trial-ended`
- `/block/no-payment`
- `/block/canceled-sub`
- `/block/no-sub`
- `/subscription`

Esse modelo ajuda a controlar pagamento, plano, limite de alunos, seguranca e pesquisas obrigatorias sem espalhar essas regras por todas as telas.

## Layout e experiencia visual

### Identidade visual

O visual usa uma combinacao de azul, azul escuro, branco e tons de apoio:

- azul principal: `#0080e8`
- azul claro: `#0c92eb`
- azul escuro/default: `#253850`
- azul mais escuro: `#172331`
- fundo geral claro: `#f8f9fe`
- sucesso: `#1cc671`
- perigo: `#d40714`
- alerta: `#ffb000`

O app usa fonte proprietaria Hartwell como fonte principal e Open Sans via Google Fonts. A combinacao da bastante identidade de produto, diferente de uma interface Bootstrap padrao.

### Padrao de cards

Boa parte da experiencia e composta por cards brancos, com bordas discretas ou sem borda, dentro de um fundo cinza/azulado muito claro. Isso cria uma leitura de dashboard mobile:

- cards para acoes rapidas
- cards para estatisticas
- cards para listas de alunos
- cards para feedbacks, atualizacoes, treinos e avaliacoes
- cards coloridos para alertas ou estados

Ha varios componentes reutilizaveis:

- `RoundedCard`
- `RoundedIcon`
- `CardButton`
- `CardButtonLg`
- `CardButtonLgRounded`
- `CardListItem`
- `CardMenu`
- `DeletedItemCard`

O padrao mais importante e: quase tudo que o usuario pode tocar vira um card com icone, texto curto, contador e/ou seta.

### Navegacao

Existem duas camadas principais:

- `TopBar`: navbar fixa no topo com logo MFIT
- `BottomBar`: barra fixa inferior, especialmente forte no mobile

A bottom bar tem quatro itens principais:

- Home
- Assinatura
- Ajuda
- Perfil

No topo tambem existe um botao flutuante de IA, com gradiente, que abre o chat/assistente.

Esse padrao cria uma experiencia bem mobile app, mesmo sendo web.

### Offcanvas e modais

O app usa bastante offcanvas e modal:

- ajuda
- menu do usuario
- chat bot
- edicao de informacoes
- confirmacoes
- filtros
- seletores
- composicao de push
- analises de IA

O CSS tem classes especificas para offcanvas responsivo, inclusive modo sheet no mobile com alca visual, e modo painel em telas maiores. Esse detalhe ajuda muito na sensacao de app nativo.

## Home do personal

A home em `/user` e um dashboard pessoal. Ela combina saudacao, perfil, banners, abas e atalhos.

Elementos observados:

- saudacao dinamica por horario
- primeiro nome formatado
- avatar clicavel para perfil
- banners temporarios/promocionais
- widget Wootric
- avisos de assinatura vencendo ou trial acabando
- contadores de feedbacks, atualizacoes, alunos pendentes e alunos ativos/inativos
- atalhos para comunicacao, alunos, treinos, relatorios e conteudo

### Acoes rapidas no topo

A home mostra um bloco de acoes rapidas:

- Feedbacks
- Atualizacoes
- Push
- Pontos MFIT, dependendo do pais e do estado do usuario

Esses itens podem ter contadores de pendencias. Isso deixa a home orientada a tarefas, nao apenas navegação.

### Bloco de alunos

Quando nao ha alunos, a home mostra um empty state com:

- mensagem de boas-vindas
- incentivo para adicionar aluno
- alternativa por link de cadastro

Quando ha alunos, aparecem:

- adicionar aluno
- link de cadastro
- card com total de alunos ativos e inativos
- protecao contra exceder limite do plano

Esse fluxo e importante: o estado vazio tambem ensina o usuario a comecar.

### Bloco de retencao

A home tambem exibe Retencao com taxa de engajamento. Isso posiciona a retencao como um indicador de negocio, nao apenas um relatorio escondido.

### Bloco de treinos

Atalhos principais:

- Biblioteca de treinos
- Grupo desafio
- Relatorio de frequencia
- Biblioteca de exercicios

Isso sugere que a criacao de treino nao fica isolada no perfil do aluno. O personal tambem constrói ativos reutilizaveis.

### Ecossistema MFIT

A home abre portas para:

- MFIT Cursos
- Conteudo exclusivo
- Instagram
- Newsletter
- Blog
- Loja, dependendo do pais e ambiente

Essa parte reforca marca, comunidade e monetizacao fora da assinatura do software.

## Principais areas/telas

### Alunos

Rotas e componentes indicam:

- lista de alunos
- grupos de alunos
- adicionar aluno
- editar aluno
- perfil do aluno
- dados cadastrais
- endereco
- preferencias
- notas internas
- redefinicao de senha do aluno
- foto de perfil
- status ativo/inativo
- clientes pendentes por link de cadastro

O app separa bem:

- gestao operacional do aluno
- agrupamento
- dados pessoais
- dados de acesso
- comunicacao e preferencias

### Link de cadastro

Existe um modulo forte para cadastro por link:

- `/user/signup-link`
- contatos do link
- contatos convertidos
- link externo em `client.mfitpersonal.com.br/out/signup-link`

Isso reduz friccao: o personal nao precisa cadastrar tudo manualmente; pode enviar um link para o aluno preencher.

### Treinos

O modulo de treino e grande. Ha varias camadas:

- treinos do aluno
- treino aerobico
- rotina de treino
- sessoes dentro da rotina
- exercicios dentro da sessao
- series
- substituicoes
- alternativas
- clonagem
- feedback da rotina
- progresso por sessao
- PDF de treino
- sessao executavel do treino

Rotas relevantes:

- `/user/client/:clientId/workout/:type?`
- `/user/client/:clientId/workout/routine/create`
- `/user/client/:clientId/workout/routine/:id/update`
- `/user/client/:clientId/workout/routine/:id/session/:sessionId/prescribe/:feedbacks?`
- `/user/client/:clientId/workout/routine/:id/session/:sessionId/exercise-list/:type?`
- `/user/client/:clientId/workout/aerobic/create`
- `/user/session/:sessionId`
- `/pdf/workout/:workoutId/session/:sessionId/:type?`

O fluxo parece pensado para:

1. criar ou reutilizar rotina
2. organizar sessoes
3. selecionar exercicios
4. configurar series e instrucoes
5. enviar/acompanhar execucao
6. receber feedback e progresso

### Biblioteca de exercicios

Existe uma biblioteca independente:

- criar exercicio
- editar exercicio
- favoritos
- grupos
- categorias
- busca
- uso dentro de sessoes de treino
- videos do YouTube e arquivos/imagens

Componentes como `ExerciseInstantSearch`, `ExerciseSearchBox`, `ExerciseHit`, `SearchableExerciseList` indicam uma busca forte e rapida.

### Biblioteca de treinos e presets

O app tambem tem:

- biblioteca de treinos
- pastas
- clonagem de treino
- presets de treino
- preview de preset
- picker por offcanvas
- validacao de preset

Isso e um ponto muito bom para produtividade: o personal nao precisa montar tudo do zero para cada aluno.

### Avaliacoes

Ha varios tipos de avaliacao:

- anamnese
- avaliacao online
- avaliacao fisica
- bioimpedancia
- avaliacao customizada
- testes neuromotores
- VO2 max
- frequencia cardiaca

Funcionalidades recorrentes:

- criar
- editar
- visualizar
- finalizar
- comparar
- graficos
- deletados/arquivados
- modelos
- respostas online

O padrao de avaliacao e bem completo: cada modulo tem cadastro, historico, comparacao e visualizacao.

### Anamnese

O app tem:

- modelos de anamnese
- criar/editar modelo
- perguntas e campos
- envio para aluno
- resposta pelo aluno
- visualizacao
- resumo via IA

Isso transforma anamnese em fluxo digital, nao apenas formulario estatico.

### Feedbacks

Modulo dedicado para:

- feedbacks nao lidos
- historico
- resolvidos
- contadores
- filtros
- resolver individual
- resolver todos

Isso e uma boa decisao de produto: feedback vira inbox operacional.

### Atualizacoes/alertas

O app tem uma central de atualizacoes com tipos diferentes:

- anamnese
- aniversario
- progresso do aluno
- avaliacao
- fatura paga
- avaliacao online
- plano recorrente
- rotina
- corrida
- pagina de vendas
- link de cadastro

Tambem existe:

- contagem por tipo
- resolver item
- resolver todos
- filtro por data

Esse modelo cria uma central de tarefas do personal.

### Push/comunicacao

O modulo de push tem:

- lista de mensagens
- criar push
- enviar push
- enviados
- agendamento
- recorrencia
- filtros por audiencia
- gerador de mensagem com IA

Componentes como `PushAudienceFields`, `PushMessageFields`, `PushComposerFlow` e `PushComposeOffcanvas` indicam um fluxo guiado de composicao.

### Retencao

O modulo de retencao tem dashboard, graficos, metricas, classificacoes, acoes e notificacao:

- summary mensal
- taxa de engajamento
- clientes por classificacao
- graficos comparativos
- eventos de acesso
- tour guiado
- acao de notificar

Essa area parece responder a pergunta: "quais alunos podem abandonar ou estao menos engajados?"

### Financeiro pessoal

Existe modulo de financas:

- lista
- categorias
- criar lancamento
- editar lancamento
- filtro por data

Isso amplia o produto para gestao do negocio do personal, nao so entrega de treino.

### Arquivos e progresso

No perfil do aluno existem areas para:

- arquivos
- editar arquivo
- progresso
- fotos de progresso
- responder progresso

Isso ajuda a centralizar documentos e evolucao visual do aluno.

### Extra training

Ha um modulo de treino extra:

- listar
- criar
- editar
- executar
- enviar

Pode servir para atividades avulsas fora do plano principal.

### Assinatura e pagamentos

O app tem fluxo completo de assinatura:

- plano atual
- metodo de pagamento
- selecao de plano
- cupom
- PIX
- cartao
- wallet
- processamento
- sucesso
- falha
- cancelamento
- plano gratis
- plano mensal
- dados de comprador
- pais de pagamento

Rotas e componentes mostram que assinatura e parte central da experiencia, com bloqueios quando ha trial encerrado, falta de pagamento, cancelamento ou ausencia de assinatura.

### IA

Recursos de IA observados:

- chat/assistente flutuante
- pagina `/user/mfit-ia`
- resumo de anamnese
- geracao de push
- geracao de treino
- analise de avaliacao online

A IA aparece como recurso transversal, nao como tela isolada. O botao flutuante no app inteiro ajuda a manter a percepcao de assistente sempre disponivel.

## Como ele entrega a experiencia para o usuario

O MFIT entrega a experiencia em camadas:

1. Primeiro, garante que o usuario pode acessar: assinatura, bloqueio, chargeback, CSAT, permissao e versao.
2. Depois, mostra uma home com saudacao, alertas e atalhos de maior frequencia.
3. Em seguida, organiza a operacao em modulos claros: alunos, treinos, avaliacoes, feedbacks, atualizacoes, push, retencao e assinatura.
4. Dentro dos modulos, usa fluxos profundos, mas divididos por telas pequenas e rotas especificas.
5. Para tarefas complexas, usa modais/offcanvas, cards, etapas e seletores.
6. Para engajamento, usa contadores, alertas, banners, notificacoes, feedbacks, Wootric e Clarity.
7. Para produtividade, oferece bibliotecas, clonagem, presets, modelos e IA.
8. Para monetizacao, conecta assinatura, wallet, cursos, loja, conteudos e pontos.

O ponto mais forte e que a home nao tenta mostrar tudo. Ela mostra o que exige acao e joga o resto para telas especializadas.

## Aprofundamento: treinos e modelos de treino

### Conceito principal

A area de treinos do MFIT nao trata "treino" como uma tela unica. Ela quebra o dominio em varias camadas:

- treino do aluno
- rotina de treino
- sessoes dentro da rotina
- exercicios dentro da sessao
- series dentro do exercicio
- alternativas/substituicoes
- treino aerobico
- biblioteca de treinos
- pastas da biblioteca
- clonagem
- presets de series
- prescricao assistida por IA
- execucao pelo aluno
- feedback e progresso

Essa separacao e importante porque cada camada tem uma responsabilidade especifica. Para o usuario, isso evita que uma tela vire um formulario gigante. Para o sistema, permite reaproveitar partes pequenas: uma rotina pode ser clonada, uma sessao pode ser reordenada, uma serie pode usar preset, um exercicio pode receber alternativa.

### Entrada do modulo de treinos

A tela principal de treino do aluno fica em:

- `/user/client/:clientId/workout/:type?`

Ela carrega o aluno, busca todos os treinos e mostra duas abas:

- planos de treino/rotinas
- aerobico

Esse detalhe de UX e bom: o personal nao mistura musculacao/rotina com aerobico na mesma lista. A separacao por aba reduz ruido e deixa o usuario escolher o tipo de prescricao antes de operar.

### Rotinas de treino

A rotina e o "container" do plano de treino. Ela tem campos como:

- nome da rotina
- tipo de divisao do treino
- objetivo
- dificuldade
- instrucoes
- permissao para baixar PDF
- mostrar tempo de treino
- data inicial
- data final
- remover/arquivar ao expirar
- ocultar antes do inicio

Ha dois modos de divisao:

- por dia da semana
- numerico, como Treino 1, Treino 2, Treino 3

Esse e um ponto forte de produto porque atende profissionais que prescrevem por agenda semanal e tambem profissionais que prescrevem por sequencia de treinos.

Rotas principais:

- criar rotina: `/user/client/:clientId/workout/routine/create`
- ver rotina: `/user/client/:clientId/workout/routine/:id/:goBackTo?`
- editar rotina: `/user/client/:clientId/workout/routine/:id/update`
- ver arquivados/deletados: `/user/client/:clientId/workout/secondary/status/:status/type/:type`

### Card de treino

O card de treino mostra:

- icone visual conforme objetivo/genero
- nome do treino
- periodo de validade
- objetivo
- dificuldade
- menu de acoes

O menu de acoes inclui:

- compartilhar
- clonar
- editar
- arquivar
- deletar
- recuperar

O compartilhamento gera um link externo para o aluno:

- `https://client.mfitpersonal.com.br/workout/...`
- `https://client.mfitpersonal.com.br/aerobic/...`

O link e composto com identificadores codificados em base64, combinando aluno, treino e usuario. Do ponto de vista de experiencia, isso permite enviar treino direto por WhatsApp ou copiar mensagem pronta, sem obrigar o aluno a navegar pelo painel do personal.

### Status da rotina

Pelo comportamento dos cards e endpoints, a rotina trabalha com estados:

- ativa
- arquivada
- deletada
- recuperavel

Isso e melhor do que apagar definitivamente de imediato. O personal pode arquivar treinos antigos, recuperar treinos e consultar historico sem poluir a lista principal.

### Sessoes dentro da rotina

Dentro da rotina, o personal cria sessoes. Uma sessao representa um dia ou unidade de treino.

Campos observados:

- treino/dia
- nome da sessao
- instrucoes
- rotina vinculada
- aluno vinculado
- status
- opcao de copiar de outra sessao

Quando a rotina e por dia da semana, o campo de treino vira seletor:

- domingo
- segunda
- terca
- quarta
- quinta
- sexta
- sabado

Quando a rotina e numerica, o campo vira numero:

- Treino 1
- Treino 2
- Treino 3

Esse detalhe deixa o mesmo fluxo servir para duas metodologias de prescricao.

### Lista reordenavel de sessoes

As sessoes usam `dnd-kit` para drag and drop. O usuario pode ativar/desativar modo de arrastar, reordenar sessoes e o app salva a nova ordem via endpoint de `change-order`.

Esse padrao e interessante:

- por padrao, os cards funcionam como links
- ao ativar ordenacao, os links ficam desativados e aparece alca de arraste
- ao soltar, a nova ordem e salva

Isso evita clique acidental durante reordenacao.

### Card de sessao

Cada sessao mostra:

- dia da semana ou numero do treino
- nome
- instrucoes/observacoes expansivas
- contagem de feedbacks
- menu de opcoes

Acoes da sessao:

- abrir prescricao
- clonar sessao
- editar
- excluir
- ver feedbacks
- ver progresso

Rotas relevantes:

- prescrever: `/user/client/:clientId/workout/routine/:id/session/:sessionId/prescribe/:feedbacks?`
- clonar sessao: `/user/client/:clientId/workout/routine/:id/session/:sessionId/clone`
- feedback: `/user/client/:clientId/workout/routine/:id/session/:sessionId/feedback`
- progresso: `/user/client/:clientId/workout/routine/:id/session/:sessionId/progress/:goBackToSession?`

### Prescricao de exercicios

A tela de prescricao e o nucleo operacional do treino. Ela permite montar os exercicios da sessao e organizar a ordem.

Recursos observados:

- adicionar exercicio
- buscar exercicio
- reordenar exercicios por drag and drop
- expandir/recolher exercicios
- selecionar multiplos exercicios
- combinar exercicios
- dividir exercicios
- excluir varios exercicios
- substituir exercicio
- adicionar alternativa
- promover exercicio
- replicar series
- editar ordem de series
- aplicar preset de series
- salvar configuracao atual como preset
- gerar treino com IA

Endpoints indicam operacoes de alto nivel:

- `/user/workout/prescription/exerc-order`
- `/user/workout/prescription/series-order`
- `/user/workout/prescription/serie`
- `/user/workout/prescription/serie-exercise`
- `/user/workout/prescription/replicate`
- `/user/workout/prescription/combine`
- `/user/workout/prescription/split`
- `/user/workout/prescription/replace`
- `/user/workout/prescription/promote`
- `/user/workout/prescription/alternative`
- `/user/workout/prescription/generate-workout`

Essa granularidade mostra uma preocupacao com velocidade de edicao. O personal consegue manipular blocos pequenos sem refazer a sessao inteira.

### Series e tipos de prescricao

Os presets e series suportam formatos variados. Tipos observados:

- repeticoes + carga
- repeticoes + carga + tempo
- repeticoes + tempo
- corrida
- observacao
- tempo + inclinacao
- cadencia

Campos de serie observados:

- repeticao
- carga
- tempo
- velocidade
- distancia
- pace
- intervalo
- observacao
- inclinacao
- cadencia

O ponto bom aqui e que a estrutura nao presume que toda serie e "3x10 com carga". Ela aceita modalidades diferentes, incluindo corrida e parametros tecnicos.

### Presets de series

O MFIT tem uma area propria de presets:

- `/user/workout-presets`
- `/user/workout-presets/create`
- `/user/workout-presets/edit/:presetId`

Esses presets nao sao necessariamente treinos completos. Eles parecem funcionar como modelos de series aplicaveis dentro da prescricao.

A lista de presets separa:

- presets do usuario
- presets do sistema

Tem tambem:

- busca normalizada sem acentos
- paginacao
- preview em offcanvas
- criar a partir de preset do sistema
- editar preset proprio
- deletar preset proprio
- aplicar preset em exercicio
- salvar series atuais como novo preset

Esse e um padrao excelente para produtividade: o personal pode reutilizar combinacoes de series sem precisar duplicar treino inteiro.

### Biblioteca de treinos

A biblioteca de treinos fica em:

- `/user/workout-library/:pg?`

Ela tambem tem abas:

- rotinas
- aerobico

Dentro dela ha:

- pastas
- busca
- paginacao
- criar pasta
- editar pasta
- mover rotina para pasta
- duplicar rotina
- clonar rotina para aluno
- deletar rotina da biblioteca
- abrir rotina da biblioteca usando `clientId` igual a `0`

Esse uso de `clientId = 0` e uma decisao tecnica clara: o mesmo fluxo de rotina/sessao/prescricao serve para treino real de aluno e para treino-modelo da biblioteca. Quando `clientId` e `0`, a tela muda pequenos comportamentos:

- nao mostra cabecalho do aluno
- usa Page com titulo de biblioteca
- nao exige datas de inicio/fim em alguns formularios
- volta para biblioteca em vez de perfil do aluno

Isso reduz duplicacao de telas.

### Clonagem

Ha clonagem em varias camadas:

- clonar treino da biblioteca para aluno
- duplicar rotina dentro da biblioteca
- clonar rotina de aluno
- clonar sessao
- criar preset a partir de outro preset

Esse e um dos pontos mais valiosos para o PersonalPro. A clonagem e o que transforma o sistema de "cadastro" em ferramenta de produtividade.

### Treino aerobico

O aerobico tem fluxo separado:

- criar treino aerobico
- editar nome
- editar instrucoes
- criar dias
- editar dias
- deletar dia
- controlar status
- configurar pace
- deletar pace

Endpoints observados:

- `/user/aerobic/create`
- `/user/aerobic/day`
- `/user/aerobic/instructions`
- `/user/aerobic/name`
- `/user/aerobic/pace`
- `/user/aerobic/status`

Isso sugere uma estrutura propria para corrida/cardio, com dias e parametros diferentes de musculacao.

### Execucao pelo aluno

O app tem uma tela de sessao:

- `/user/session/:sessionId`

Componentes indicam:

- cronometro
- timer
- series
- formulario de serie
- exercicio completo
- exercicio regular
- multiplos exercicios
- imagem/video/YouTube
- feedback da sessao

Esse ponto mostra que o MFIT nao apenas cadastra treino; ele entrega uma experiencia executavel para o aluno.

### Feedback e progresso do treino

O treino tem feedback e progresso por sessao. Isso fecha o ciclo:

1. personal prescreve
2. aluno executa
3. aluno envia feedback ou progresso
4. personal visualiza na rotina ou central de feedbacks
5. personal ajusta treino

Esse ciclo e mais importante do que a tela de cadastro em si.

## Aprofundamento: perfil do aluno

### Estrutura da tela

O perfil do aluno fica em:

- `/user/client/:id/:type?`

Ele usa um cabecalho visual com:

- botao voltar
- avatar do aluno
- nome completo
- grupo do aluno

Abaixo, quando o aluno nao esta deletado, ha duas abas:

- Inicio
- Opcoes

Essa divisao e boa porque separa o que o personal faz com frequencia do que ele faz ocasionalmente.

### Aba Inicio

A aba Inicio funciona como um hub operacional do aluno. Ela junta:

- alertas financeiros do aluno
- frequencia semanal
- status de acesso
- atalhos principais
- notas internas
- informacoes de login, se solicitado pela URL

Atalhos principais:

- treino
- avaliacoes
- financeiro
- progresso do aluno
- treino extra
- arquivos

Rotas desses atalhos:

- treino: `/user/client/:id/workout`
- avaliacoes: `/user/client/evaluation/:id`
- progresso: `/user/client/:id/progress`
- treino extra: `/user/client/:id/extratraining`
- arquivos: `/user/client/:id/files`
- financeiro: redireciona para fluxo legado/externo em `app.mfitpersonal.com.br`

Essa tela e o ponto de partida para quase tudo que se faz com um aluno especifico.

### Alertas financeiros no perfil

O perfil busca faturas do aluno:

- `/user/client/invoices?id=:id`

Quando existem faturas, mostra um card expansivel com:

- fatura vencida
- fatura proxima do vencimento
- valor
- data de vencimento

O card e clicavel e leva para o financeiro do aluno. Esse e um bom padrao: o problema aparece no contexto certo, sem exigir que o personal abra um financeiro separado para descobrir pendencias.

### Frequencia semanal

O perfil tambem busca frequencia semanal:

- `/user/training-frequency/week?id=:id&startDate=:start&endDate=:end`

Ele calcula a semana atual, de segunda a domingo, e exibe um componente `FrequencyTraining`.

Isso cria uma leitura rapida de aderencia: ao abrir o aluno, o personal ve se ele treinou/teve atividade na semana.

### Status do aluno

O aluno pode ter status:

- ativo
- inativo
- deletado

Quando esta inativo, a aba Inicio mostra um alerta amarelo dizendo que o aluno nao tem acesso, com um switch para reativar.

Quando esta deletado, a tela muda completamente:

- mostra dados basicos
- exibe alerta vermelho de aluno excluido
- oferece recuperacao se o plano permite e o limite nao foi atingido

Essa experiencia evita que um aluno deletado pareca igual a um aluno ativo.

### Notas internas

O perfil tem um card de notas:

- busca notas por aluno
- mostra textarea
- so exibe botao salvar quando o formulario esta alterado

Endpoint:

- GET `/user/client/notes?id=:id`
- POST `/user/client/notes?id=:id`

E uma funcionalidade simples, mas muito util. Ela transforma o perfil em memoria operacional do personal.

### Aba Opcoes

A aba Opcoes concentra acoes administrativas:

- falar no WhatsApp
- ver informacoes de login
- preferencias de notificacao
- editar aluno
- ativar/inativar aluno
- deletar aluno

Isso e uma boa separacao. Acoes perigosas ou menos frequentes nao ficam competindo com treino, avaliacao e progresso.

### Informacoes de login do aluno

O modal de login mostra:

- email/login
- senha, quando ainda existe senha temporaria
- botao copiar
- botao compartilhar via WhatsApp
- link para download do app MFIT

Se a senha ja foi alterada, o modal muda:

- informa que a senha foi trocada
- avisa que nao e mais possivel ver a senha atual
- oferece redefinir senha

Esse fluxo e pragmatico para onboarding do aluno. O personal consegue enviar acesso rapidamente sem sair da tela.

### Preferencias de notificacao

O perfil tem modal de preferencias de notificacao do aluno, com endpoint:

- GET `/user/client/preference?id=:id`
- POST `/user/client/preference?id=:id`

Isso indica que o aluno pode receber comunicacoes configuraveis. Para o PersonalPro, uma versao simples poderia controlar lembretes de treino, cobranca e check-in.

### Edicao/cadastro do aluno

O formulario de aluno e bem completo. Campos e comportamentos observados:

- nome completo obrigatorio
- validacao de pelo menos dois nomes
- email obrigatorio e validado
- data de nascimento obrigatoria e validada
- telefone obrigatorio
- validacao especifica de telefone brasileiro
- genero obrigatorio
- pais
- idioma
- timezone
- bloqueio de acesso por cobranca vencida, dependendo do pais/carteira
- imagem de perfil com cropper
- selecao internacional de telefone
- dados de endereco
- dados de grupo/modelos relacionados

Endpoints:

- POST `/user/client/create`
- POST `/user/client/update?id=:id`
- POST `/user/client/profile-picture`
- POST `/user/client/address?id=:id`
- GET `/user/client/address?id=:id`

O cadastro mistura dados pessoais, contato, preferencia regional e regras de acesso. O ponto para copiar com cuidado: e completo, mas pode ficar pesado se o usuario so quer cadastrar rapido.

### Perfil como hub, nao como ficha

O aprendizado principal e que o perfil do aluno nao e apenas uma ficha cadastral. Ele e um hub de trabalho:

- mostra alertas
- mostra frequencia
- da acesso ao treino
- da acesso a avaliacoes
- da acesso ao financeiro
- guarda notas
- facilita WhatsApp
- controla acesso
- permite arquivos e progresso

Isso muda a percepcao do produto: o aluno vira uma unidade de operacao, nao apenas um registro no banco.

## O que adaptar no PersonalPro para treinos e perfil

### Treinos: modelo recomendado

Para o PersonalPro, eu recomendo uma estrutura em 4 niveis:

1. Modelo de treino: template reutilizavel, sem aluno.
2. Plano de treino do aluno: copia ativa do modelo ou treino criado do zero.
3. Sessoes: Treino A/B/C ou Segunda/Terca/Quarta.
4. Exercicios e series: detalhes executaveis.

Essa estrutura e mais simples que o MFIT, mas preserva o melhor da arquitetura.

### Campos minimos para plano de treino

Um bom primeiro formulario poderia ter:

- nome do plano
- objetivo
- nivel/dificuldade
- tipo de divisao: dias da semana ou A/B/C numerico
- data inicial
- data final opcional
- instrucoes gerais
- permitir visualizacao pelo aluno

Evitaria, no inicio, campos como PDF, ocultar antes do inicio e arquivar automaticamente, a menos que isso ja esteja nos seus planos imediatos.

### Campos minimos para sessao

Para cada sessao:

- identificador: Segunda, Terca ou Treino A/B/C
- nome curto
- instrucoes
- lista de exercicios

Depois, adicionar:

- reordenacao por drag and drop
- clonar sessao
- copiar de modelo

### Series flexiveis

Nao limitar a serie a `repeticoes + carga`. Usar tipos:

- repeticoes/carga
- tempo
- distancia
- pace/velocidade
- observacao livre

Isso deixa o PersonalPro preparado para musculacao, funcional e cardio.

### Modelos em dois tamanhos

O MFIT sugere dois tamanhos de modelo:

- modelo grande: treino completo
- modelo pequeno: preset de series

Para o PersonalPro, comecaria pelo modelo grande. Depois adicionaria presets pequenos para series/exercicios, quando a tela de prescricao estiver madura.

### Perfil do aluno recomendado

O perfil do aluno no PersonalPro deveria priorizar:

- cabecalho com foto, nome e status
- cards de alerta
- abas: Resumo, Treinos, Avaliacoes, Financeiro, Arquivos/Notas
- atalhos rapidos no Resumo
- frequencia ou atividade recente
- notas internas sempre visiveis
- acoes administrativas em menu separado

O mais importante: separar "o que eu preciso fazer agora" de "configuracoes do aluno".

## Padroes que podem inspirar melhorias no PersonalPro

### 1. Home como cockpit operacional

Hoje, uma melhoria importante para o PersonalPro seria transformar o dashboard em um cockpit com:

- alunos ativos
- alunos em atraso
- sessoes de hoje
- pagamentos pendentes
- feedbacks/observacoes recentes
- alertas de renovacao
- atalhos para criar aluno, treino, avaliacao e cobranca

O objetivo e que o usuario abra o app e saiba exatamente o que precisa fazer.

### 2. Barra inferior mobile

Uma bottom bar simples pode melhorar muito a experiencia mobile:

- Inicio
- Alunos
- Agenda/Treinos
- Financeiro
- Perfil/Menu

Isso evita menus escondidos e deixa a aplicacao com sensacao de app.

### 3. Central de alertas

Criar uma central parecida com "Atualizacoes":

- pagamento venceu
- aluno sem treino
- aluno sem avaliacao recente
- aniversario
- feedback novo
- sessao perdida
- plano perto do fim

Cada alerta deve ser resolvivel. Isso transforma notificacao em tarefa.

### 4. Perfil do aluno mais modular

O perfil do aluno pode ser separado em abas ou secoes:

- Resumo
- Treinos
- Avaliacoes
- Progresso
- Pagamentos
- Arquivos
- Notas internas

O MFIT usa rotas profundas para cada subfluxo. No PersonalPro, uma abordagem com abas bem claras pode ser mais simples e ainda poderosa.

### 5. Biblioteca reutilizavel

Uma biblioteca de treinos/modelos pode economizar muito tempo:

- modelos de treino por objetivo
- modelos por frequencia semanal
- exercicios favoritos
- duplicar treino de um aluno para outro
- salvar treino atual como modelo

Esse e provavelmente um dos maiores ganhos de produtividade.

### 6. Estados vazios melhores

Quando nao houver alunos, pagamentos ou treinos, a tela deve orientar o proximo passo:

- titulo acolhedor
- explicacao curta
- botao principal
- alternativa secundaria

Exemplo: "Voce ainda nao tem alunos. Cadastre manualmente ou envie um link de convite."

### 7. Fluxo de convite/cadastro

Um link de cadastro para o aluno preencher dados basicos pode reduzir trabalho manual:

- nome
- contato
- objetivo
- restricoes
- disponibilidade
- anamnese inicial

No PersonalPro, isso poderia virar "Convite do aluno".

### 8. Retencao e engajamento

Mesmo uma versao simples ja ajudaria:

- alunos sem treino ha X dias
- alunos sem check-in recente
- alunos com pagamento atrasado
- alunos com baixa frequencia
- alunos que nao respondem mensagens

Isso pode aparecer como um card "Risco de abandono".

### 9. IA como assistente contextual

Em vez de uma IA generica, priorizar recursos contextualizados:

- gerar mensagem para aluno atrasado
- resumir evolucao do aluno
- sugerir ajuste de treino
- criar treino base por objetivo
- transformar observacoes em plano de acao

### 10. Offcanvas para tarefas rapidas

No PersonalPro, tarefas pequenas poderiam abrir em painel lateral ou sheet mobile:

- adicionar nota
- editar status
- registrar pagamento
- criar lembrete
- enviar mensagem

Isso mantem o usuario no contexto da tela atual.

## Recomendada adaptacao para o PersonalPro

Em vez de tentar copiar todo o MFIT, eu recomendo priorizar uma versao mais enxuta:

### Fase 1 - Navegacao e cockpit

- dashboard orientado a tarefas
- bottom bar mobile
- cards de resumo
- alertas resolviveis
- perfil do aluno com abas claras

### Fase 2 - Produtividade

- modelos de treino
- duplicar treino
- biblioteca de exercicios
- link de convite para aluno
- estados vazios guiados

### Fase 3 - Inteligencia e retencao

- central de engajamento
- sugestoes automaticas
- IA para mensagens e resumo de aluno
- relatorios comparativos

## Pontos de atencao

- O MFIT e muito amplo. Copiar tudo pode deixar o PersonalPro pesado.
- O melhor aprendizado e a organizacao da experiencia, nao necessariamente a quantidade de funcionalidades.
- A home deve continuar simples, mesmo com muitos recursos no sistema.
- Cada contador ou alerta precisa levar a uma acao clara.
- O mobile deve ser tratado como experiencia principal.
- Funcionalidades avancadas devem nascer como fluxos guiados, nao como formularios gigantes.

## Conclusao

O MFIT Personal entrega uma experiencia de plataforma completa para personal trainers, com forte foco em operacao diaria, produtividade e retencao. A estrutura combina dashboard mobile-first, cards de acao, modulos profundos, central de alertas, bibliotecas reutilizaveis, assinatura integrada e recursos de IA.

Para o PersonalPro, o melhor caminho e aproveitar os principios:

- dashboard como cockpit
- navegacao mobile simples
- perfil do aluno modular
- alertas acionaveis
- modelos reutilizaveis
- retencao como indicador central
- IA contextual

Com isso, o PersonalPro pode ganhar clareza e eficiencia sem ficar tao complexo quanto uma plataforma grande como o MFIT.
