# Rosana Personal

App de gestão de aulas e finanças para personal trainer.

## Funcionalidades

- **Alunos**: cadastro com nome, valor/aula e grade de horários
- **Agenda**: calendário mensal com visualização das aulas do dia
- **Registro**: marcação de presença/falta para cada aula
- **Relatório**: receita bruta, taxa da academia (R$21/aula até R$5.500), receita líquida, frequência e detalhamento por aluno

## Como rodar localmente

```bash
npm install
npm run dev
```

## Como fazer deploy (Vercel - gratuito)

1. Suba o projeto no GitHub:
```bash
git init
git add .
git commit -m "rosana personal app"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/rosana-personal.git
git push -u origin main
```

2. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
3. Clique em "Add New Project"
4. Selecione o repositório `rosana-personal`
5. Clique em "Deploy" (as configurações padrão do Vite já funcionam)
6. Pronto! Você recebe uma URL tipo `rosana-personal.vercel.app`

## PWA (instalar no celular)

Depois do deploy, ao abrir o site no celular:
- **Android**: toque nos 3 pontinhos do Chrome > "Adicionar à tela inicial"
- **iPhone**: toque no ícone de compartilhar do Safari > "Adicionar à Tela de Início"

O app fica com ícone próprio e funciona sem barra do navegador.

## Dados

Os dados ficam salvos no localStorage do navegador (no próprio celular). Não precisa de banco de dados externo.
