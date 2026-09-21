<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { formatDate } from '../db';
import { distinctExerciseNames, historyFor, recentSessions } from '../queries';
import { summariseSets } from '../progression';
import type { Entry, Session } from '../types';

const emit = defineEmits<{ back: [] }>();

const tab = ref<'exercise' | 'session'>('exercise');
const names = ref<string[]>([]);
const filter = ref('');
const selected = ref<string | null>(null);
const rows = ref<Entry[]>([]);
const sessions = ref<Session[]>([]);

onMounted(async () => {
  names.value = await distinctExerciseNames();
  sessions.value = await recentSessions(60);
});

const visible = computed(() => {
  const q = filter.value.trim().toLowerCase();
  return q === '' ? names.value : names.value.filter((n) => n.toLowerCase().includes(q));
});

async function select(name: string) {
  selected.value = name;
  rows.value = await historyFor(name);
}
</script>

<template>
  <header class="topbar">
    <button class="btn icon ghost" @click="selected ? (selected = null) : emit('back')">‹</button>
    <h1>{{ selected ?? 'History' }}</h1>
  </header>

  <template v-if="selected">
    <div class="card">
      <div class="hist">
        <template v-for="r in rows" :key="r.id">
          <span class="d">{{ formatDate(r.date) }}</span>
          <span>{{ summariseSets(r) }}</span>
        </template>
      </div>
      <p v-if="rows.length === 0" class="empty" style="padding: 12px">
        Nothing logged for this exercise yet.
      </p>
    </div>
  </template>

  <template v-else>
    <div class="tabs">
      <button :class="{ on: tab === 'exercise' }" @click="tab = 'exercise'">By exercise</button>
      <button :class="{ on: tab === 'session' }" @click="tab = 'session'">By session</button>
    </div>

    <template v-if="tab === 'exercise'">
      <input v-model="filter" placeholder="Filter exercises" style="margin-bottom: 10px" />
      <div class="stack">
        <button v-for="n in visible" :key="n" class="list-item" @click="select(n)">
          {{ n }}
        </button>
        <p v-if="visible.length === 0" class="empty">No exercises match.</p>
      </div>
    </template>

    <div v-else class="stack">
      <div v-for="s in sessions" :key="s.id" class="list-item">
        <span class="sub" style="width: 62px">{{ formatDate(s.date) }}</span>
        <span>{{ s.type }}</span>
        <span class="spacer"></span>
        <span v-if="s.completedAt === null" class="sub" style="color: var(--accent)">open</span>
      </div>
      <p v-if="sessions.length === 0" class="empty">No sessions yet.</p>
    </div>
  </template>
</template>
