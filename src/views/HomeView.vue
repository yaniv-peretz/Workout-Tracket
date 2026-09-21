<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { db, formatDate, today } from '../db';
import { openSessionFor, recentSessions, startSession } from '../queries';
import { writePrefs } from '../prefs';
import { useInstall } from '../install';
import type { Session, WorkoutTemplate } from '../types';

const emit = defineEmits<{
  open: [sessionId: number];
  history: [];
  program: [];
  backup: [];
}>();

const workouts = ref<WorkoutTemplate[]>([]);
const openIds = ref<Set<number>>(new Set());
const recent = ref<Session[]>([]);
const busy = ref(false);
const { canInstall, install } = useInstall();

onMounted(async () => {
  workouts.value = (await db.workouts.toArray()).sort((a, b) => a.order - b.order);

  const open = new Set<number>();
  for (const w of workouts.value) {
    if (w.id !== undefined && (await openSessionFor(w))) open.add(w.id);
  }
  openIds.value = open;
  recent.value = await recentSessions(8);
});

async function pick(workout: WorkoutTemplate) {
  if (busy.value) return;
  busy.value = true;
  try {
    const sessionId = await startSession(workout);
    writePrefs({ lastWorkoutId: workout.id ?? null, activeSessionId: sessionId });
    emit('open', sessionId);
  } finally {
    busy.value = false;
  }
}

function resume(session: Session) {
  if (session.id === undefined) return;
  writePrefs({ activeSessionId: session.completedAt === null ? session.id : null });
  emit('open', session.id);
}

function summary(w: WorkoutTemplate): string {
  const n = w.exercises.filter((e) => !e.optional).length;
  return `${n} exercises`;
}
</script>

<template>
  <header class="topbar">
    <h1>Workout</h1>
    <button class="btn ghost" @click="emit('history')">History</button>
    <button class="btn icon ghost" title="Program" @click="emit('program')">☰</button>
  </header>

  <div class="days">
    <button
      v-for="w in workouts"
      :key="w.id"
      class="day"
      :class="{ open: w.id !== undefined && openIds.has(w.id) }"
      @click="pick(w)"
    >
      <strong>{{ w.name }}</strong>
      <span class="sub">{{ summary(w) }}</span>
      <span v-if="w.id !== undefined && openIds.has(w.id)" class="sub" style="color: var(--accent)">
        in progress
      </span>
    </button>
  </div>

  <p v-if="workouts.length === 0" class="empty">
    No training days yet — add one from the Program screen.
  </p>

  <h2 style="margin: 24px 0 10px; font-size: 15px; color: var(--muted)">Recent</h2>

  <div class="stack">
    <button v-for="s in recent" :key="s.id" class="list-item" @click="resume(s)">
      <span class="sub" style="width: 62px">{{ formatDate(s.date) }}</span>
      <span>{{ s.type }}</span>
      <span class="spacer"></span>
      <span v-if="s.completedAt === null" class="sub" style="color: var(--accent)">open</span>
      <span v-else-if="s.date === today()" class="sub">today</span>
    </button>
    <p v-if="recent.length === 0" class="empty">Nothing logged yet. Tap a day to start.</p>
  </div>

  <div class="row" style="margin-top: 24px">
    <button class="btn ghost" @click="emit('program')">Edit program</button>
    <button class="btn ghost" @click="emit('backup')">Backup</button>
  </div>

  <button v-if="canInstall" class="btn wide" style="margin-top: 10px" @click="install">
    Install app
  </button>
</template>
