export const EXERCISE_LIBRARY = [
  { name: "Agachamento livre", muscleGroup: "Pernas", equipment: "Barra", instructions: "Manter coluna neutra, joelhos alinhados e amplitude segura." },
  { name: "Leg press", muscleGroup: "Pernas", equipment: "Máquina", instructions: "Ajustar banco, controlar descida e evitar travar joelhos." },
  { name: "Cadeira extensora", muscleGroup: "Quadríceps", equipment: "Máquina", instructions: "Subir com controle, pausar no topo e descer sem soltar a carga." },
  { name: "Mesa flexora", muscleGroup: "Posterior", equipment: "Máquina", instructions: "Quadril apoiado, movimento controlado e sem compensar lombar." },
  { name: "Supino reto", muscleGroup: "Peito", equipment: "Barra", instructions: "Escápulas encaixadas, punhos alinhados e controle na descida." },
  { name: "Crucifixo inclinado", muscleGroup: "Peito", equipment: "Halteres", instructions: "Cotovelos levemente flexionados e amplitude sem dor no ombro." },
  { name: "Puxada frente", muscleGroup: "Costas", equipment: "Máquina", instructions: "Puxar com cotovelos, manter tronco firme e não encolher ombros." },
  { name: "Remada baixa", muscleGroup: "Costas", equipment: "Máquina", instructions: "Trazer os cotovelos para trás e controlar a volta." },
  { name: "Desenvolvimento", muscleGroup: "Ombros", equipment: "Halteres", instructions: "Evitar arquear lombar e subir até extensão confortável." },
  { name: "Elevação lateral", muscleGroup: "Ombros", equipment: "Halteres", instructions: "Subir até linha dos ombros, sem impulso." },
  { name: "Rosca direta", muscleGroup: "Bíceps", equipment: "Barra", instructions: "Cotovelos fixos e controle total da descida." },
  { name: "Tríceps corda", muscleGroup: "Tríceps", equipment: "Polia", instructions: "Cotovelos junto ao corpo e extensão completa." },
  { name: "Prancha", muscleGroup: "Core", equipment: "Peso corporal", instructions: "Manter quadril alinhado e respirar durante a isometria." },
  { name: "Abdominal infra", muscleGroup: "Core", equipment: "Peso corporal", instructions: "Controlar a pelve e evitar impulso." }
];

export const WORKOUT_TEMPLATES = [
  {
    id: "full-body-iniciante",
    name: "Full body iniciante",
    exercises: [
      { name: "Leg press", sets: "3", reps: "12", weight: "", rest: "60s", notes: "Carga leve/moderada", muscleGroup: "Pernas", equipment: "Máquina" },
      { name: "Supino reto", sets: "3", reps: "10", weight: "", rest: "60s", notes: "Focar técnica", muscleGroup: "Peito", equipment: "Barra" },
      { name: "Puxada frente", sets: "3", reps: "12", weight: "", rest: "60s", notes: "", muscleGroup: "Costas", equipment: "Máquina" },
      { name: "Desenvolvimento", sets: "2", reps: "12", weight: "", rest: "60s", notes: "", muscleGroup: "Ombros", equipment: "Halteres" },
      { name: "Prancha", sets: "3", reps: "30s", weight: "", rest: "45s", notes: "", muscleGroup: "Core", equipment: "Peso corporal" }
    ]
  },
  {
    id: "hipertrofia-ab",
    name: "Hipertrofia A/B",
    exercises: [
      { name: "Supino reto", sets: "4", reps: "8-10", weight: "", rest: "90s", notes: "Progressão semanal se possível", muscleGroup: "Peito", equipment: "Barra" },
      { name: "Remada baixa", sets: "4", reps: "10", weight: "", rest: "90s", notes: "", muscleGroup: "Costas", equipment: "Máquina" },
      { name: "Agachamento livre", sets: "4", reps: "8", weight: "", rest: "120s", notes: "Priorizar técnica", muscleGroup: "Pernas", equipment: "Barra" },
      { name: "Elevação lateral", sets: "3", reps: "12-15", weight: "", rest: "60s", notes: "", muscleGroup: "Ombros", equipment: "Halteres" },
      { name: "Tríceps corda", sets: "3", reps: "12", weight: "", rest: "60s", notes: "", muscleGroup: "Tríceps", equipment: "Polia" }
    ]
  },
  {
    id: "emagrecimento-circuito",
    name: "Emagrecimento circuito",
    exercises: [
      { name: "Agachamento livre", sets: "3", reps: "15", weight: "", rest: "30s", notes: "Circuito", muscleGroup: "Pernas", equipment: "Barra" },
      { name: "Puxada frente", sets: "3", reps: "15", weight: "", rest: "30s", notes: "Circuito", muscleGroup: "Costas", equipment: "Máquina" },
      { name: "Desenvolvimento", sets: "3", reps: "12", weight: "", rest: "30s", notes: "Circuito", muscleGroup: "Ombros", equipment: "Halteres" },
      { name: "Abdominal infra", sets: "3", reps: "15", weight: "", rest: "30s", notes: "Circuito", muscleGroup: "Core", equipment: "Peso corporal" }
    ]
  }
];
