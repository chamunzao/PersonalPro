# PersonalPro - Delivery Checklist Atual

## Status Geral

- [x] App React + Vite funcional.
- [x] Firebase Auth integrado.
- [x] Firestore integrado.
- [x] PWA configurado.
- [x] Build de producao validado.
- [x] Central de Acoes nos alertas.
- [ ] Teste piloto completo com usuario real.
- [ ] Testes automatizados dos calculos principais.
- [ ] Code splitting para reduzir bundle.

## Fluxos Principais

### Autenticacao

- [x] Login com e-mail e senha.
- [x] Cadastro de conta.
- [x] Recuperacao de senha.
- [x] Logout.
- [x] Conta demo acessivel pelo login.

### Inicio

- [x] Resumo do dia.
- [x] Aulas de hoje.
- [x] Presenca/falta rapida.
- [x] Prioridades operacionais.
- [x] Resumo financeiro do mes.

### Alunos

- [x] Criar aluno.
- [x] Editar aluno.
- [x] Excluir aluno.
- [x] Buscar alunos.
- [x] Dados pessoais.
- [x] Agenda semanal.
- [x] Tipos de cobranca.
- [x] Anamnese.
- [x] Medidas.
- [x] Fotos de evolucao por URL HTTPS.
- [x] Planos de treino.
- [x] Historico de aulas e versoes de treino.

### Agenda

- [x] Visualizacao mensal.
- [x] Visualizacao semanal.
- [x] Aulas fixas.
- [x] Aulas avulsas.
- [x] Reposicoes/remarcacoes.
- [x] Cancelamento apenas no dia.
- [x] Confirmacao por WhatsApp.
- [x] Registro de presenca/falta.

### Aula

- [x] Selecionar aula do dia.
- [x] Visualizar treino ativo.
- [x] Anotar ajustes gerais.
- [x] Anotar ajustes por exercicio.
- [x] Marcar presenca/falta.
- [x] Gerar nova versao de treino.

### Registro

- [x] Filtrar por data.
- [x] Marcar presente.
- [x] Marcar falta.
- [x] Limpar registro.
- [x] Informar atividade.
- [x] Informar valor customizado.

### Pagamentos

- [x] Registrar pagamento mensal.
- [x] Editar pagamento.
- [x] Remover pagamento.
- [x] Registrar pacote adiantado.
- [x] Controlar aulas pagas.
- [x] Registrar desconto/acrescimo.
- [x] Guardar observacao.
- [x] Sugerir pacote mensal a partir da agenda.
- [x] Mostrar historico recente.

### Alertas / Central de Acoes

- [x] Pagamento vencido.
- [x] Vencimento proximo.
- [x] Pacote acabando.
- [x] Pacote esgotado.
- [x] Credito vencido.
- [x] Credito esgotado.
- [x] Aluno inativo.
- [x] Aula sem registro.
- [x] Enviar WhatsApp pelo alerta.
- [x] Marcar pagamento como pago pelo alerta.
- [x] Marcar aula como presente/falta pelo alerta.

### Comunicacao

- [x] Confirmar semana.
- [x] Cobrar pagamento.
- [x] Avisar pacote acabando.
- [x] Check-in semanal.
- [x] Enviar lembrete de treino.

### Relatorios

- [x] Receita bruta.
- [x] Receita liquida.
- [x] Taxa da academia.
- [x] Taxa de presenca.
- [x] Breakdown por aluno.

### Configuracoes

- [x] Tema visual.
- [x] Persistencia no Firestore.

## Riscos e Dividas

- [ ] Bundle grande: aplicar `React.lazy`/dynamic import por aba.
- [ ] Alguns textos aparecem com acentos quebrados em arquivos antigos.
- [ ] Regras Firestore sao seguras por usuario, mas amplas dentro de `users/{userId}`.
- [ ] Falta suite automatizada para calculos financeiros e de agenda.
- [ ] Documentacao de setup ainda pode ser enxugada para o fluxo real de producao.
