import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from '../../firebase';
import { formatDate } from '../../lib/dates';
import {
  getSystemWorkoutModels,
  normalizeWorkoutModel
} from './workoutModelUtils';

const EMPTY_EXERCISE = {
  name: '',
  sets: '',
  reps: '',
  weight: '',
  rest: '',
  notes: '',
  muscleGroup: '',
  equipment: '',
  instructions: ''
};

const EMPTY_FORM = {
  name: '',
  goal: '',
  level: '',
  notes: '',
  exercises: [{ ...EMPTY_EXERCISE }]
};

function buildModelPayload(form, dateText) {
  const normalized = normalizeWorkoutModel({
    ...form,
    source: 'user',
    createdAt: form.createdAt || dateText,
    updatedAt: dateText,
    exercises: (form.exercises || []).filter(exercise => exercise.name?.trim())
  });
  const { id, ...payload } = normalized;
  return payload;
}

function ModelForm({ form, setForm, saving, editingModelId, onSubmit, onCancel, theme }) {
  function updateExercise(index, patch) {
    setForm(current => ({
      ...current,
      exercises: current.exercises.map((exercise, itemIndex) => (
        itemIndex === index ? { ...exercise, ...patch } : exercise
      ))
    }));
  }

  return (
    <form className="workout-model-form" onSubmit={onSubmit}>
      <div className="workout-model-form-grid">
        <input value={form.name} onChange={(event) => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Nome do modelo" />
        <input value={form.goal} onChange={(event) => setForm(current => ({ ...current, goal: event.target.value }))} placeholder="Objetivo" />
        <input value={form.level} onChange={(event) => setForm(current => ({ ...current, level: event.target.value }))} placeholder="Nivel" />
      </div>
      <textarea value={form.notes} onChange={(event) => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Observacoes do modelo" rows={3} />

      <div className="workout-model-exercises">
        {(form.exercises || []).map((exercise, index) => (
          <div key={index} className="workout-model-exercise">
            <input value={exercise.name || ''} onChange={(event) => updateExercise(index, { name: event.target.value })} placeholder="Exercicio" />
            <input value={exercise.sets || ''} onChange={(event) => updateExercise(index, { sets: event.target.value })} placeholder="Series" />
            <input value={exercise.reps || ''} onChange={(event) => updateExercise(index, { reps: event.target.value })} placeholder="Reps" />
            <input value={exercise.weight || ''} onChange={(event) => updateExercise(index, { weight: event.target.value })} placeholder="Carga" />
            <input value={exercise.rest || ''} onChange={(event) => updateExercise(index, { rest: event.target.value })} placeholder="Descanso" />
            <textarea value={exercise.notes || ''} onChange={(event) => updateExercise(index, { notes: event.target.value })} placeholder="Observacoes" rows={2} />
            <button
              type="button"
              className="workout-model-muted-button"
              onClick={() => setForm(current => ({
                ...current,
                exercises: current.exercises.filter((_, itemIndex) => itemIndex !== index)
              }))}
              disabled={(form.exercises || []).length === 1}
            >
              Remover exercicio
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="workout-model-muted-button" onClick={() => setForm(current => ({ ...current, exercises: [...current.exercises, { ...EMPTY_EXERCISE }] }))}>
        Adicionar exercicio
      </button>

      <div className="workout-model-form-actions">
        <button type="submit" disabled={saving || !form.name.trim() || !(form.exercises || []).some(exercise => exercise.name?.trim())} style={{ background: theme.primary }}>
          {editingModelId ? 'Salvar alteracoes' : 'Salvar modelo'}
        </button>
        {editingModelId && (
          <button type="button" className="workout-model-muted-button" onClick={onCancel}>
            Cancelar edicao
          </button>
        )}
      </div>
    </form>
  );
}

export function WorkoutModelsTab({ theme }) {
  const { user } = useAuth();
  const [userModels, setUserModels] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingModelId, setEditingModelId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const systemModels = useMemo(() => getSystemWorkoutModels(), []);
  const models = [...systemModels, ...userModels];

  useEffect(() => {
    async function loadModels() {
      if (!user) return;
      setLoadingModels(true);
      try {
        const snap = await getDocs(collection(db, `users/${user.uid}/workoutModels`));
        setUserModels(snap.docs.map(item => normalizeWorkoutModel({ id: item.id, ...item.data() })));
      } catch (error) {
        console.error('Error loading workout models:', error);
      } finally {
        setLoadingModels(false);
      }
    }

    loadModels();
  }, [user]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingModelId('');
  }

  function editModel(model) {
    if (model.source !== 'user') return;
    setEditingModelId(model.id);
    setForm({
      ...normalizeWorkoutModel(model),
      exercises: model.exercises?.length ? model.exercises : [{ ...EMPTY_EXERCISE }]
    });
  }

  async function duplicateModel(model) {
    if (!user) return;
    setSaving(true);
    try {
      const dateText = formatDate(new Date());
      const payload = buildModelPayload({
        ...model,
        name: `${model.name} - copia`,
        createdAt: dateText,
        exercises: model.exercises
      }, dateText);
      const docRef = await addDoc(collection(db, `users/${user.uid}/workoutModels`), payload);
      setUserModels(current => [{ id: docRef.id, ...payload }, ...current]);
    } catch (error) {
      console.error('Error duplicating workout model:', error);
      alert('Erro ao duplicar modelo.');
    } finally {
      setSaving(false);
    }
  }

  async function saveModel(event) {
    event.preventDefault();
    if (!user) return;

    const dateText = formatDate(new Date());
    const payload = buildModelPayload(form, dateText);
    if (!payload.name || payload.exercises.length === 0) return;

    setSaving(true);
    try {
      if (editingModelId) {
        await updateDoc(doc(db, `users/${user.uid}/workoutModels/${editingModelId}`), payload);
        setUserModels(current => current.map(model => model.id === editingModelId ? { id: editingModelId, ...payload } : model));
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/workoutModels`), payload);
        setUserModels(current => [{ id: docRef.id, ...payload }, ...current]);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving workout model:', error);
      alert('Erro ao salvar modelo.');
    } finally {
      setSaving(false);
    }
  }

  async function removeModel(modelId) {
    if (!user) return;
    const shouldDelete = window.confirm('Remover este modelo?');
    if (!shouldDelete) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/workoutModels/${modelId}`));
      setUserModels(current => current.filter(model => model.id !== modelId));
      if (editingModelId === modelId) resetForm();
    } catch (error) {
      console.error('Error deleting workout model:', error);
      alert('Erro ao remover modelo.');
    }
  }

  return (
    <div className="app-page workout-models-page">
      <section className="app-card workout-models-hero">
        <p className="dashboard-kicker">BIBLIOTECA DE TREINOS</p>
        <h2 className="app-page-title">Biblioteca de Treinos</h2>
        <p className="app-page-kicker">Crie, edite e duplique treinos prontos para aplicar nos alunos.</p>
      </section>

      <section className="app-card workout-model-editor">
        <div className="communication-section-header">
          <div>
            <p className="dashboard-kicker">MODELO DO PERSONAL</p>
            <h3>{editingModelId ? 'Editar modelo' : 'Criar modelo'}</h3>
          </div>
        </div>
        <ModelForm
          form={form}
          setForm={setForm}
          saving={saving}
          editingModelId={editingModelId}
          onSubmit={saveModel}
          onCancel={resetForm}
          theme={theme}
        />
      </section>

      <section className="app-card workout-model-library">
        <div className="communication-section-header">
          <div>
            <p className="dashboard-kicker">MODELOS DISPONIVEIS</p>
            <h3>Biblioteca</h3>
          </div>
          <span>{models.length} modelos</span>
        </div>

        {loadingModels && <p className="workout-model-empty">Carregando modelos...</p>}

        <div className="workout-model-list">
          {models.map(model => (
            <article key={model.id} className="workout-model-card">
              <div className="workout-model-card-header">
                <div>
                  <strong>{model.name}</strong>
                  <small>{model.source === 'system' ? 'Sistema' : 'Seu modelo'}{model.goal ? ` · ${model.goal}` : ''}{model.level ? ` · ${model.level}` : ''}</small>
                </div>
                <span>{model.exercises.length} exercicios</span>
              </div>
              {model.notes && <p>{model.notes}</p>}
              <ul>
                {model.exercises.slice(0, 4).map((exercise, index) => (
                  <li key={`${model.id}-${index}`}>{exercise.name} · {exercise.sets || '-'}x{exercise.reps || '-'}</li>
                ))}
              </ul>
              <div className="workout-model-actions">
                <button type="button" onClick={() => duplicateModel(model)} disabled={saving}>Duplicar</button>
                {model.source === 'user' && (
                  <>
                    <button type="button" onClick={() => editModel(model)}>Editar</button>
                    <button type="button" className="workout-model-danger" onClick={() => removeModel(model.id)}>Remover</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
