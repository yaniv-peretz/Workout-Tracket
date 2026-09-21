<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { seedIfEmpty } from './seed';
import { readPrefs } from './prefs';
import { db } from './db';
import HomeView from './views/HomeView.vue';
import SessionView from './views/SessionView.vue';
import HistoryView from './views/HistoryView.vue';
import ProgramView from './views/ProgramView.vue';
import BackupView from './views/BackupView.vue';

type View =
  | { name: 'home' }
  | { name: 'session'; sessionId: number }
  | { name: 'history' }
  | { name: 'program' }
  | { name: 'backup' };

const view = ref<View>({ name: 'home' });
const ready = ref(false);
const fatal = ref('');

onMounted(async () => {
  try {
    await seedIfEmpty();
    // Resume straight into an unfinished session, so reopening the tab
    // mid-workout lands where you left off.
    const { activeSessionId } = readPrefs();
    if (activeSessionId !== null) {
      const session = await db.sessions.get(activeSessionId);
      if (session && session.completedAt === null) {
        view.value = { name: 'session', sessionId: activeSessionId };
      }
    }
  } catch (err) {
    fatal.value = err instanceof Error ? err.message : String(err);
  } finally {
    ready.value = true;
  }
});
</script>

<template>
  <div v-if="fatal" class="banner err" style="margin-top: 20px">
    IndexedDB is unavailable: {{ fatal }}
  </div>

  <template v-else-if="ready">
    <HomeView
      v-if="view.name === 'home'"
      @open="(id: number) => (view = { name: 'session', sessionId: id })"
      @history="view = { name: 'history' }"
      @program="view = { name: 'program' }"
      @backup="view = { name: 'backup' }"
    />

    <SessionView
      v-else-if="view.name === 'session'"
      :session-id="view.sessionId"
      @back="view = { name: 'home' }"
    />

    <HistoryView v-else-if="view.name === 'history'" @back="view = { name: 'home' }" />
    <ProgramView v-else-if="view.name === 'program'" @back="view = { name: 'home' }" />
    <BackupView v-else-if="view.name === 'backup'" @back="view = { name: 'home' }" />
  </template>
</template>
