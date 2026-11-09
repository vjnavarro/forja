import { createServer } from 'vite';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(path.join(root, 'src/catalog/source.json'), 'utf8'));
const sourceArg = process.argv.indexOf('--source');
if (sourceArg < 0 || !process.argv[sourceArg + 1])
  throw new Error('Uso: npm run sync:catalog -- --source /ruta/al/repositorio/FORJA [--check]');
const source = path.resolve(process.argv[sourceArg + 1]);
const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
if (git('rev-parse', 'HEAD') !== config.commit)
  throw new Error('El checkout no coincide con el commit fijado en src/catalog/source.json.');
if (
  git(
    'status',
    '--porcelain',
    '--',
    'src/features',
    'docs/05-exercises/library',
    'docs/06-sessions',
    'assets/exercises',
  )
)
  throw new Error('El contenido de origen tiene cambios sin confirmar.');
const hash = (data) => createHash('sha256').update(data).digest('hex');
const files = {},
  images = [];
const server = await createServer({
  configFile: false,
  root: source,
  resolve: { alias: { '@': path.join(source, 'src') } },
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
let payload;
try {
  const { exercises } = await server.ssrLoadModule('/src/features/exercises/data/exercises.ts');
  const { sessions, sessionDocumentProblems } = await server.ssrLoadModule(
    '/src/features/sessions/data/sessions.ts',
  );
  if (sessionDocumentProblems.length || exercises.length !== 15 || sessions.length !== 3)
    throw new Error('Revisa la estructura y el alcance del catálogo antes de actualizarlo.');
  const exportedExercises = [];
  for (const exercise of exercises) {
    const sourcePath = exercise.traceability.sources[0];
    files[sourcePath] = hash(await readFile(path.join(source, sourcePath)));
    const media =
      exercise.media.thumbnail.status === 'approved'
        ? exercise.media.thumbnail
        : exercise.media.masterImage;
    if (
      media.status !== 'approved' ||
      !media.sourcePath?.startsWith('assets/exercises/') ||
      !media.sourcePath.endsWith('.webp') ||
      media.sourcePath.includes('..')
    )
      throw new Error(`Imagen no aprobada: ${exercise.identity.id}`);
    const bytes = await readFile(path.join(source, media.sourcePath));
    files[media.sourcePath] = hash(bytes);
    const image = `forja-catalog/${config.commit}/images/${exercise.identity.id}.webp`;
    images.push({ image, bytes });
    exportedExercises.push({
      ...exercise,
      media: { image, alt: media.alt, sourcePath: media.sourcePath, sha256: hash(bytes) },
    });
  }
  for (const session of sessions)
    files[session.traceability.sourcePath] = hash(
      await readFile(path.join(source, session.traceability.sourcePath)),
    );
  payload = {
    schemaVersion: config.schemaVersion,
    source: config,
    audience: 'youth',
    exercises: exportedExercises,
    sessions,
    files,
  };
} finally {
  await server.close();
}
const result =
  JSON.stringify({ ...payload, sha256: hash(JSON.stringify(payload)) }, null, 2) + '\n';
const target = path.join(root, 'src/catalog/catalog.json');
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== result)
    throw new Error('El catálogo exportado no coincide con el origen fijado.');
  for (const { image, bytes } of images)
    if (hash(await readFile(path.join(root, 'public', image))) !== hash(bytes))
      throw new Error(`Imagen distinta: ${image}`);
  process.stdout.write('Catálogo e imágenes coinciden con el origen fijado.\n');
} else {
  await writeFile(target, result);
  for (const { image, bytes } of images) {
    const dest = path.join(root, 'public', image);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
  }
  process.stdout.write(
    `Exportados ${payload.exercises.length} ejercicios y ${payload.sessions.length} sesiones; sin ejemplos personales.\n`,
  );
}
