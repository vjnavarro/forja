// Synthetic local fixtures only. This script never targets a real Firebase project.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
const environment = await initializeTestEnvironment({
  projectId: 'demo-forja',
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
  },
});
try {
  await environment.withSecurityRulesDisabled(async (context) => {
    for (const email of ['one@example.test', 'two@example.test'])
      await setDoc(doc(context.firestore(), 'members', email), { enabled: true });
  });
  console.log('Dos cuentas sintéticas habilitadas únicamente en el emulador local.');
} finally {
  await environment.cleanup();
}
