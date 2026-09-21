import { readonly, ref } from 'vue';

/**
 * Chrome fires `beforeinstallprompt` only when the install criteria are met
 * (manifest + icons + service worker, over HTTPS). We stash the event so the
 * app can offer its own button instead of relying on the browser's menu.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const deferred = ref<BeforeInstallPromptEvent | null>(null);

const standalone = ref(
  typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari reports installed state here instead.
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred.value = event as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferred.value = null;
    standalone.value = true;
  });
}

export function useInstall() {
  async function install(): Promise<void> {
    const event = deferred.value;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    deferred.value = null;
  }

  return { canInstall: readonly(deferred), isInstalled: readonly(standalone), install };
}
