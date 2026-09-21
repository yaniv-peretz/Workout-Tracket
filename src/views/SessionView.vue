<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { db, formatDate } from '../db';
import {
  blankSet,
  deleteSession,
  finishSession,
  historyFor,
  lastEntryFor,
  saveEntry,
  sessionEntries
} from '../queries';
import { suggestNextWeight, summariseSets } from '../progression';
import { writePrefs } from '../prefs';
import { num, repRange, text } from '../util';
import type { Entry, ExerciseTemplate, Session, WorkoutTemplate } from '../types';

const props = defineProps<{ sessionId: number }>();
const emit = defineEmits<{ back: [] }>();

const session = ref<Session | null>(null);
const template = ref<WorkoutTemplate | null>(null);
const entries = ref<Entry[]>([]);
const last = ref<Record<string, Entry | undefined>>({});
const history = ref<Record<string, Entry[]>>({});
const openHistory = ref<Set<string>>(new Set());

const timers = new Map<number, number>();

onMounted(async () => {
  const s = await db.sessions.get(props.sessionId);
  if (!s) return emit('back');
  session.value = s;

  template.value =
    (s.templateId !== null ? await db.workouts.get(s.templateId) : undefined) ??
    (await db.workouts.toArray()).find((w) => w.name === s.type) ??
    null;

  entries.value = await sessionEntries(props.sessionId);

  const map: Record<string, Entry | undefined> = {};
  for (const e of entries.value) map[e.exerciseName] = await lastEntryFor(e.exerciseName, s.id);
  last.value = map;
});

function tpl(name: string): ExerciseTemplate | undefined {
  return template.value?.exercises.find((e) => e.name === name);
}

function targetLine(entry: Entry): string {
  const t = tpl(entry.exerciseName);
  if (!t) return `${entry.sets.length} sets`;
  if (t.kind === 'cardio') return `${t.targetSets} × interval`;
  const range = repRange(t.minReps, t.maxReps);
  const rir = t.targetRir !== null ? ` · ${t.targetRir} RIR` : '';
  return `Target: ${t.targetSets} × ${range}${rir}`;
}

function lastLine(entry: Entry): string | null {
  const prev = last.value[entry.exerciseName];
  return prev ? `${formatDate(prev.date)}   ${summariseSets(prev)}` : null;
}

function suggestion(entry: Entry) {
  const t = tpl(entry.exerciseName);
  return t ? suggestNextWeight(last.value[entry.exerciseName], t) : null;
}

/** Debounced so typing reps does not queue a write per keystroke. */
function touch(entry: Entry) {
  if (entry.id === undefined) return;
  const existing = timers.get(entry.id);
  if (existing !== undefined) clearTimeout(existing);
  timers.set(entry.id, window.setTimeout(() => void saveEntry(entry), 250));
}

function toggleDone(entry: Entry, index: number) {
  const set = entry.sets[index];
  if (!set) return;
  set.done = !set.done;
  // Completing a set with a blank weight carries the previous set's weight down.
  if (set.done && set.weightKg === null && index > 0) {
    set.weightKg = entry.sets[index - 1]?.weightKg ?? null;
  }
  touch(entry);
}

function addSet(entry: Entry) {
  const tail = entry.sets[entry.sets.length - 1];
  entry.sets.push({ ...blankSet(), weightKg: tail?.weightKg ?? null });
  touch(entry);
}

function removeSet(entry: Entry) {
  if (entry.sets.length <= 1) return;
  entry.sets.pop();
  touch(entry);
}

function applySuggestion(entry: Entry, weight: number) {
  for (const set of entry.sets) if (!set.done) set.weightKg = weight;
  touch(entry);
}

async function toggleHistory(name: string) {
  const open = new Set(openHistory.value);
  if (open.has(name)) {
    open.delete(name);
  } else {
    open.add(name);
    if (!history.value[name]) history.value[name] = (await historyFor(name)).slice(0, 8);
  }
  openHistory.value = open;
}

async function finish() {
  for (const [, t] of timers) clearTimeout(t);
  await Promise.all(entries.value.map((e) => saveEntry(e)));
  await finishSession(props.sessionId);
  writePrefs({ activeSessionId: null });
  emit('back');
}

async function discard() {
  if (!confirm('Delete this session and everything logged in it?')) return;
  await deleteSession(props.sessionId);
  writePrefs({ activeSessionId: null });
  emit('back');
}

function loggedCount(): number {
  return entries.value.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
}
</script>

<template>
  <header class="topbar">
    <button class="btn icon ghost" @click="finish">‹</button>
    <h1>{{ session?.type }}</h1>
    <span class="sub">{{ loggedCount() }} sets</span>
  </header>

  <p v-if="template?.notes" class="note" style="margin: 0 0 12px">{{ template.notes }}</p>

  <div v-for="entry in entries" :key="entry.id" class="card">
    <div class="row">
      <div style="min-width: 0">
        <h3>{{ entry.exerciseName }}</h3>
        <div class="target">{{ targetLine(entry) }}</div>
      </div>
      <span class="spacer"></span>
      <button class="btn icon ghost" title="History" @click="toggleHistory(entry.exerciseName)">
        ↺
      </button>
    </div>

    <p v-if="tpl(entry.exerciseName)?.notes" class="note">{{ tpl(entry.exerciseName)?.notes }}</p>

    <div v-if="lastLine(entry)" class="last">
      Last workout · <b>{{ lastLine(entry) }}</b>
    </div>

    <div v-if="suggestion(entry)" class="suggest">
      Previous: {{ suggestion(entry)?.previous }} — consider
      <b>{{ suggestion(entry)?.weight }} kg</b>
      <button
        class="btn ghost"
        style="margin-left: 8px; min-height: 32px; padding: 4px 10px; font-size: 13px"
        @click="applySuggestion(entry, suggestion(entry)!.weight)"
      >
        Use
      </button>
    </div>

    <div v-if="openHistory.has(entry.exerciseName)" class="last">
      <div class="hist">
        <template v-for="h in history[entry.exerciseName] ?? []" :key="h.id">
          <span class="d">{{ formatDate(h.date) }}</span>
          <span>{{ summariseSets(h) }}</span>
        </template>
      </div>
      <p v-if="(history[entry.exerciseName] ?? []).length === 0" style="margin: 0">
        No history yet.
      </p>
    </div>

    <div class="sets">
      <div
        v-for="(set, i) in entry.sets"
        :key="i"
        class="set"
        :class="{ done: set.done, cardio: entry.kind === 'cardio' }"
      >
        <span class="n">{{ i + 1 }}</span>

        <template v-if="entry.kind === 'cardio'">
          <input
            :value="set.minutes ?? ''"
            type="number"
            inputmode="decimal"
            placeholder="min"
            @input="(e) => ((set.minutes = num(e)), touch(entry))"
          />
          <input
            :value="set.avgHr ?? ''"
            type="number"
            inputmode="numeric"
            placeholder="avg HR"
            @input="(e) => ((set.avgHr = num(e)), touch(entry))"
          />
        </template>

        <template v-else>
          <input
            :value="set.weightKg ?? ''"
            type="number"
            inputmode="decimal"
            step="0.25"
            placeholder="kg"
            @input="(e) => ((set.weightKg = num(e)), touch(entry))"
          />
          <input
            :value="set.reps ?? ''"
            type="number"
            inputmode="numeric"
            placeholder="reps"
            @input="(e) => ((set.reps = num(e)), touch(entry))"
          />
        </template>

        <button class="check" :class="{ on: set.done }" @click="toggleDone(entry, i)">✓</button>
      </div>
    </div>

    <div class="row" style="margin-top: 10px">
      <button class="btn ghost" style="min-height: 34px; padding: 4px 12px" @click="addSet(entry)">
        + set
      </button>
      <button
        class="btn ghost"
        style="min-height: 34px; padding: 4px 12px"
        :disabled="entry.sets.length <= 1"
        @click="removeSet(entry)"
      >
        − set
      </button>
    </div>

    <input
      :value="entry.notes"
      placeholder="Note (optional)"
      style="margin-top: 10px"
      @input="(e) => ((entry.notes = text(e)), touch(entry))"
    />
  </div>

  <button class="btn primary wide" style="margin-top: 18px" @click="finish">Finish workout</button>
  <button class="btn danger wide" style="margin-top: 10px" @click="discard">Discard session</button>
</template>
