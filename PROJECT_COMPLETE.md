# PersonalPro - Estado Atual do Projeto

## Status

PersonalPro esta em estagio de MVP avancado / beta utilizavel. O app ja cobre a rotina operacional de uma personal trainer: agenda, alunos, aulas, presencas, pagamentos, relatorios, alertas acionaveis, comunicacao por WhatsApp e configuracoes.

O build de producao passa com `npm run build`. Existe um aviso de bundle grande por causa do app React + Firebase sem code splitting; isso nao bloqueia uso, mas fica como melhoria tecnica.

## Produto Entregue

### Plataforma

- React 18 + Vite.
- Firebase Authentication e Firestore.
- PWA com manifest e service worker.
- Tema customizavel por usuario.
- Conta demo disponivel pela tela de login.
- Dados isolados por usuario em `users/{userId}`.

### Areas do Aplicativo

1. **Inicio**
   - Painel do dia.
   - Aulas de hoje.
   - Registro rapido de presenca/falta.
   - Resumo financeiro e prioridades.

2. **Alunos**
   - Cadastro, edicao, busca e exclusao de alunos.
   - Dados pessoais, WhatsApp, e-mail, CPF, nascimento e observacoes.
   - Agenda fixa por dia e horario.
   - Tipos de cobranca: por aula, pacote, pacote mensal e mensalidade.
   - Perfil completo com anamnese, medidas, fotos, treinos e historico.

3. **Agenda**
   - Visualizacao mensal e semanal.
   - Aulas fixas, avulsas, reposicoes e remarcacoes.
   - Cancelamento por dia.
   - Confirmacao por WhatsApp.
   - Registro de presenca/falta dentro da agenda.

4. **Aula**
   - Fluxo de execucao da sessao.
   - Treino ativo do aluno.
   - Notas gerais e notas por exercicio.
   - Marcacao de presenca/falta.
   - Criacao de nova versao de treino a partir da aula.

5. **Registro**
   - Controle diario de presenca.
   - Atividade e valor customizado por aula.
   - Marcacao de presente, falta ou pendente.

6. **Pagamentos**
   - Registro de pagamento mensal.
   - Registro de pacotes adiantados.
   - Controle de aulas pagas, valor por aula, desconto, acrescimo e observacao.
   - Historico recente por aluno.
   - Sugestao de pacote mensal baseada na agenda do mes.

7. **Alertas**
   - Central de Acoes.
   - Alertas de pagamento vencido, vencimento proximo, pacote acabando/esgotado, credito vencido/esgotado, aluno inativo e aula sem registro.
   - Acoes diretas:
     - enviar WhatsApp contextual;
     - marcar pagamento como pago;
     - marcar aula pendente como presente ou falta.

8. **Contato**
   - Mensagens prontas para WhatsApp.
   - Confirmacao da semana.
   - Lembrete de pagamento.
   - Renovacao de pacote.
   - Check-in semanal.
   - Reforco de treino.

9. **Relatorio**
   - Receita bruta.
   - Taxa da academia.
   - Receita liquida.
   - Taxa de presenca.
   - Breakdown por aluno.

10. **Config**
    - Selecao de tema visual.
    - Persistencia da preferencia no Firestore.

## Regras de Negocio

- Dias uteis de segunda a sexta.
- Calculo financeiro por aluno e por mes.
- Taxa da academia por aula conforme regra do app.
- Pacotes com controle de aulas contratadas, usadas e restantes.
- Pacotes adiantados com validade e consumo por presencas.
- Pagamento mensal com status de vencido, proximo do vencimento ou em dia.

## Firebase

Estrutura principal:

```text
users/{userId}/students
users/{userId}/students/{studentId}/measurements
users/{userId}/students/{studentId}/workoutPlans
users/{userId}/students/{studentId}/profile/anamnesis
users/{userId}/students/{studentId}/progressPhotos
users/{userId}/records
users/{userId}/payments
users/{userId}/scheduleOverrides
users/{userId}/settings
```

As regras atuais permitem leitura e escrita apenas ao dono autenticado do caminho `users/{userId}`.

## Verificacao Atual

Comando executado:

```bash
npm run build
```

Resultado:

- Build concluido com sucesso.
- PWA gerado.
- Aviso conhecido: bundle JavaScript acima de 500 kB.

## Proximos Passos Recomendados

1. Rodar um teste piloto no celular com dados reais ou demo.
2. Validar os fluxos criticos: cadastrar aluno, agendar, executar aula, marcar presenca, cobrar e fechar mes.
3. Melhorar performance com code splitting depois da validacao operacional.
4. Revisar textos e acentos exibidos no app, pois alguns arquivos ainda carregam conteudo com caracteres quebrados.
5. Criar testes automatizados para calculos de cobranca, agenda e alertas.
