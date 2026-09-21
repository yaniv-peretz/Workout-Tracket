<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { db } from '../db';
import { PROGRAM } from '../seed';
import { num, text } from '../util';
import type { ExerciseKind, ExerciseTemplate, WorkoutTemplate } from '../types';

const emit = defineEmits<{ back: [] }>();

const workouts = ref<WorkoutTemplate[]>([]);
const editing = ref<WorkoutTemplate | null>(null);
const saved = ref(false);

onMounted(load);

async function load() {
  workouts.value = (await db.workouts.toArray()).sort((a, b) => a.order - b.order);
}

function open(w: WorkoutTemplate) {
  // Deep clone: edits are committed on Save, not as you type.
  editing.value = JSON.parse(JSON.stringify(w)) as WorkoutTemplate;
  saved.value = false;
}

async function save() {
  const w = editing.value;
  if (!w) return;
  if (w.id === undefined) {
    w.id = await db.workouts.add(JSON.parse(JSON.stringify(w)) as WorkoutTemplate);
  } else {
    await db.workouts.put(JSON.parse(JSON.stringify(w)) as WorkoutTemplate);
  }
  saved.value = true;
  await load();
  editing.value = null;
}

async function removeDay() {
  const w = editing.value;
  if (!w?.id) return;
  if (!confirm(`Delete "${w.name}"? Sessions already logged are kept.`)) return;
  await db.workouts.delete(w.id);
  editing.value = null;
  await load();
}

function addDay() {
  editing.value = {
    name: 'New day',
    order: workouts.value.length,
    notes: '',
    exercises: []
  };
}

function blankExercise(): ExerciseTemplate {
  return {
    name: '',
    kind: 'strength',
    targetSets: 3,
    minReps: 8,
    maxReps: 12,
    targetRir: null,
    increment: 2.5,
    optional: false,
    notes: ''
  };
}

function addExercise() {
  editing.value?.exercises.push(blankExercise());
}

function removeExercise(index: number) {
  editing.value?.exercises.splice(index, 1);
}

function move(index: number, delta: number) {
  const list = editing.value?.exercises;
  if (!list) return;
  const next = index + delta;
  if (next < 0 || next >= list.length) return;
  const [item] = list.splice(index, 1);
  if (item) list.splice(next, 0, item);
}

async function moveDay(w: WorkoutTemplate, delta: number) {
  const list = [...workouts.value];
  const index = list.findIndex((x) => x.id === w.id);
  const next = index + delta;
  if (index < 0 || next < 0 || next >= list.length) return;
  const [item] = list.splice(index, 1);
  if (item) list.splice(next, 0, item);
  await Promise.all(list.map((x, order) => db.workouts.update(x.id!, { order })));
  await load();
}

async function restoreDefaults() {
  if (!confirm('Replace the program with the built-in default? Logged sessions are kept.')) return;
  await db.transaction('rw', db.workouts, async () => {
    await db.workouts.clear();
    await db.workouts.bulkAdd(PROGRAM as WorkoutTemplate[]);
  });
  editing.value = null;
  await load();
}

const kinds: ExerciseKind[] = ['strength', 'cardio'];
</script>

<template>
  <header class="topbar">
    <button class="btn icon ghost" @click="editing ? (editing = null) : emit('back')">‹</button>
    <h1>{{ editing ? editing.name || 'New day' : 'Program' }}</h1>
    <button v-if="editing" class="btn primary" @click="save">Save</button>
  </header>

  <template v-if="editing">
    <div class="card">
      <label class="sub">Day name</label>
      <input :value="editing.name" @input="(e) => (editing!.name = text(e))" />
      <label class="sub" style="display: block; margin-top: 10px">Notes</label>
      <textarea :value="editing.notes" @input="(e) => (editing!.notes = text(e))"></textarea>
    </div>

    <div v-for="(ex, i) in editing.exercises" :key="i" class="card">
      <div class="row">
        <input
          :value="ex.name"
          placeholder="Exercise name"
          @input="(e) => (ex.name = text(e))"
        />
        <button class="btn icon ghost" :disabled="i === 0" @click="move(i, -1)">↑</button>
        <button
          class="btn icon ghost"
          :disabled="i === editing.exercises.length - 1"
          @click="move(i, 1)"
        >
          ↓
        </button>
      </div>

      <div class="row" style="margin-top: 8px">
        <select :value="ex.kind" @change="(e) => (ex.kind = text(e) as ExerciseKind)">
          <option v-for="k in kinds" :key="k" :value="k">{{ k }}</option>
        </select>
        <input
          :value="ex.targetSets"
          type="number"
          inputmode="numeric"
          placeholder="sets"
          @input="(e) => (ex.targetSets = num(e) ?? 1)"
        />
      </div>

      <div v-if="ex.kind === 'strength'" class="row" style="margin-top: 8px">
        <input
          :value="ex.minReps ?? ''"
          type="number"
          inputmode="numeric"
          placeholder="min reps"
          @input="(e) => (ex.minReps = num(e))"
        />
        <input
          :value="ex.maxReps ?? ''"
          type="number"
          inputmode="numeric"
          placeholder="max reps"
          @input="(e) => (ex.maxReps = num(e))"
        />
        <input
          :value="ex.targetRir ?? ''"
          type="number"
          inputmode="numeric"
          placeholder="RIR"
          @input="(e) => (ex.targetRir = num(e))"
        />
        <input
          :value="ex.increment"
          type="number"
          inputmode="decimal"
          step="0.25"
          placeholder="+kg"
          @input="(e) => (ex.increment = num(e) ?? 2.5)"
        />
      </div>

      <input
        :value="ex.notes"
        placeholder="Note"
        style="margin-top: 8px"
        @input="(e) => (ex.notes = text(e))"
      />

      <div class="row" style="margin-top: 8px">
        <label class="sub row" style="gap: 6px">
          <input
            type="checkbox"
            :checked="ex.optional"
            style="width: auto; min-height: auto"
            @change="(e) => (ex.optional = (e.target as HTMLInputElement).checked)"
          />
          optional
        </label>
        <span class="spacer"></span>
        <button class="btn danger" style="min-height: 34px" @click="removeExercise(i)">
          Remove
        </button>
      </div>
    </div>

    <button class="btn wide" style="margin-top: 12px" @click="addExercise">+ Add exercise</button>
    <button v-if="editing.id" class="btn danger wide" style="margin-top: 10px" @click="removeDay">
      Delete day
    </button>
  </template>

  <template v-else>
    <p class="sub" style="margin: 0 0 12px">
      The program lives in IndexedDB, not in the code. Rename, reorder, retarget or add days freely.
    </p>

    <div class="stack">
      <div v-for="w in workouts" :key="w.id" class="list-item">
        <button
          class="btn ghost"
          style="flex: 1; text-align: left; border: 0; padding: 0; min-height: auto"
          @click="open(w)"
        >
          <strong>{{ w.name }}</strong>
          <span class="sub"> · {{ w.exercises.length }}</span>
        </button>
        <button class="btn icon ghost" @click="moveDay(w, -1)">↑</button>
        <button class="btn icon ghost" @click="moveDay(w, 1)">↓</button>
      </div>
    </div>

    <button class="btn wide" style="margin-top: 12px" @click="addDay">+ Add day</button>
    <button class="btn ghost wide" style="margin-top: 10px" @click="restoreDefaults">
      Restore default program
    </button>
  </template>
</template>
