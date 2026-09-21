<script setup lang="ts">
import { ref } from 'vue';
import { downloadBackup, importBackup } from '../backup';
import { db } from '../db';
import { writePrefs } from '../prefs';

const emit = defineEmits<{ back: [] }>();

const message = ref('');
const error = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

async function onExport() {
  error.value = '';
  try {
    await downloadBackup();
    message.value = 'Backup downloaded.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

async function onImport(event: Event) {
  error.value = '';
  message.value = '';
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!confirm('Importing REPLACES everything currently stored. Continue?')) {
    if (fileInput.value) fileInput.value.value = '';
    return;
  }
  try {
    const result = await importBackup(await file.text());
    writePrefs({ activeSessionId: null });
    message.value = `Imported ${result.sessions} sessions and ${result.entries} exercise entries.`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    if (fileInput.value) fileInput.value.value = '';
  }
}

async function wipe() {
  if (!confirm('Delete ALL local workout data? Export a backup first.')) return;
  await db.delete();
  writePrefs({ activeSessionId: null, lastWorkoutId: null });
  location.reload();
}
</script>

<template>
  <header class="topbar">
    <button class="btn icon ghost" @click="emit('back')">‹</button>
    <h1>Backup</h1>
  </header>

  <div v-if="message" class="banner ok">{{ message }}</div>
  <div v-if="error" class="banner err">{{ error }}</div>

  <div class="card">
    <h3>Export</h3>
    <p class="sub" style="margin: 6px 0 12px">
      Everything — program, sessions and sets — as one JSON file. Browser storage can be cleared by
      you or by Chrome, so keep a copy somewhere else.
    </p>
    <button class="btn primary wide" @click="onExport">Download backup JSON</button>
  </div>

  <div class="card">
    <h3>Import</h3>
    <p class="sub" style="margin: 6px 0 12px">
      Replaces the current database so ids stay intact and sessions keep their sets.
    </p>
    <input ref="fileInput" type="file" accept="application/json,.json" @change="onImport" />
  </div>

  <div class="card">
    <h3>Reset</h3>
    <p class="sub" style="margin: 6px 0 12px">
      Deletes the IndexedDB database and re-seeds the default program on reload.
    </p>
    <button class="btn danger wide" @click="wipe">Delete all data</button>
  </div>
</template>
