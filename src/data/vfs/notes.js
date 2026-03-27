import { createDirectory, createFile } from './helpers';

export const notesDirectory = createDirectory({
  'learning-log.txt': createFile(
    '25 Maret 2026: Terus mengeksplorasi penggunaan AI tools dalam pengembangan aplikasi web dan desktop.'
  ),
});
