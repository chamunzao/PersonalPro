export const EXERCISE_LIBRARY = [
  { name: "Agachamento livre", muscleGroup: "Pernas", equipment: "Barra", instructions: "Manter coluna neutra, joelhos alinhados e amplitude segura." },
  { name: "Leg press", muscleGroup: "Pernas", equipment: "Maquina", instructions: "Ajustar banco, controlar descida e evitar travar joelhos." },
  { name: "Cadeira extensora", muscleGroup: "Quadriceps", equipment: "Maquina", instructions: "Subir com controle, pausar no topo e descer sem soltar a carga." },
  { name: "Mesa flexora", muscleGroup: "Posterior", equipment: "Maquina", instructions: "Quadril apoiado, movimento controlado e sem compensar lombar." },
  { name: "Supino reto", muscleGroup: "Peito", equipment: "Barra", instructions: "Escapulas encaixadas, punhos alinhados e controle na descida." },
  { name: "Crucifixo inclinado", muscleGroup: "Peito", equipment: "Halteres", instructions: "Cotovelos levemente flexionados e amplitude sem dor no ombro." },
  { name: "Puxada frente", muscleGroup: "Costas", equipment: "Maquina", instructions: "Puxar com cotovelos, manter tronco firme e nao encolher ombros." },
  { name: "Remada baixa", muscleGroup: "Costas", equipment: "Maquina", instructions: "Trazer os cotovelos para tras e controlar a volta." },
  { name: "Desenvolvimento", muscleGroup: "Ombros", equipment: "Halteres", instructions: "Evitar arquear lombar e subir ate extensao confortavel." },
  { name: "Elevacao lateral", muscleGroup: "Ombros", equipment: "Halteres", instructions: "Subir ate linha dos ombros, sem impulso." },
  { name: "Rosca direta", muscleGroup: "Biceps", equipment: "Barra", instructions: "Cotovelos fixos e controle total da descida." },
  { name: "Triceps corda", muscleGroup: "Triceps", equipment: "Polia", instructions: "Cotovelos junto ao corpo e extensao completa." },
  { name: "Prancha", muscleGroup: "Core", equipment: "Peso corporal", instructions: "Manter quadril alinhado e respirar durante a isometria." },
  { name: "Abdominal infra", muscleGroup: "Core", equipment: "Peso corporal", instructions: "Controlar a pelve e evitar impulso." }
];

export const WORKOUT_TEMPLATES = [
  {
    id: "full-body-iniciante",
    name: "Full body iniciante",
    exercises: [
      { name: "Leg press", sets: "3", reps: "12", weight: "", rest: "60s", notes: "Carga leve/moderada", muscleGroup: "Pernas", equipment: "Maquina" },
      { name: "Supino reto", sets: "3", reps: "10", weight: "", rest: "60s", notes: "Focar tecnica", muscleGroup: "Peito", equipment: "Barra" },
      { name: "Puxada frente", sets: "3", reps: "12", weight: "", rest: "60s", notes: "", muscleGroup: "Costas", equipment: "Maquina" },
      { name: "Desenvolvimento", sets: "2", reps: "12", weight: "", rest: "60s", notes: "", muscleGroup: "Ombros", equipment: "Halteres" },
      { name: "Prancha", sets: "3", reps: "30s", weight: "", rest: "45s", notes: "", muscleGroup: "Core", equipment: "Peso corporal" }
    ]
  },
  {
    id: "hipertrofia-ab",
    name: "Hipertrofia A/B",
    exercises: [
      { name: "Supino reto", sets: "4", reps: "8-10", weight: "", rest: "90s", notes: "Progressao semanal se possivel", muscleGroup: "Peito", equipment: "Barra" },
      { name: "Remada baixa", sets: "4", reps: "10", weight: "", rest: "90s", notes: "", muscleGroup: "Costas", equipment: "Maquina" },
      { name: "Agachamento livre", sets: "4", reps: "8", weight: "", rest: "120s", notes: "Priorizar tecnica", muscleGroup: "Pernas", equipment: "Barra" },
      { name: "Elevacao lateral", sets: "3", reps: "12-15", weight: "", rest: "60s", notes: "", muscleGroup: "Ombros", equipment: "Halteres" },
      { name: "Triceps corda", sets: "3", reps: "12", weight: "", rest: "60s", notes: "", muscleGroup: "Triceps", equipment: "Polia" }
    ]
  },
  {
    id: "emagrecimento-circuito",
    name: "Emagrecimento circuito",
    exercises: [
      { name: "Agachamento livre", sets: "3", reps: "15", weight: "", rest: "30s", notes: "Circuito", muscleGroup: "Pernas", equipment: "Barra" },
      { name: "Puxada frente", sets: "3", reps: "15", weight: "", rest: "30s", notes: "Circuito", muscleGroup: "Costas", equipment: "Maquina" },
      { name: "Desenvolvimento", sets: "3", reps: "12", weight: "", rest: "30s", notes: "Circuito", muscleGroup: "Ombros", equipment: "Halteres" },
      { name: "Abdominal infra", sets: "3", reps: "15", weight: "", rest: "30s", notes: "Circuito", muscleGroup: "Core", equipment: "Peso corporal" }
    ]
  }
];
