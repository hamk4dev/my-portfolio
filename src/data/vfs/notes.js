import { createDirectory, createFile } from './helpers';

export const notesDirectory = createDirectory({
  'learning-log.txt': createFile(
    `Catatan pengembangan Init.CV ini berawal dari eksperimen sederhana untuk menggabungkan portfolio personal dengan pengalaman antarmuka yang terasa seperti sistem operasi mini. Dari sana, proyek berkembang menjadi ruang uji untuk terminal interaktif, AI assistant, visual file system, dan berbagai tool keamanan pasif yang dapat dijalankan langsung dari antarmuka web.

Dalam prosesnya, fokus pengembangan tidak hanya pada tampilan, tetapi juga pada konsistensi arsitektur, keamanan backend, pengalaman mobile, dan kualitas interaksi pengguna. Setiap iterasi mendorong website ini menjadi lebih rapi, lebih realistis, dan lebih dekat ke standar production.

Ke depan, pengembangan Init.CV diarahkan sebagai portfolio teknis yang bukan hanya menampilkan profil dan proyek, tetapi juga menunjukkan cara berpikir, pendekatan engineering, serta minat riset di bidang AI/LLM, keamanan siber, dan transformasi digital.`
  ),
});
