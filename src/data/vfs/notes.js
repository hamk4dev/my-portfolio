import { createDirectory, createFile } from './helpers';

export const notesDirectory = createDirectory({
  'learning-log.txt': createFile(
    `Catatan pengembangan Init.CV dimulai dari gagasan sederhana: membangun portofolio personal yang tidak hanya informatif, tetapi juga menghadirkan pengalaman interaktif yang kuat. Dari titik awal tersebut, proyek ini berkembang menjadi ruang eksplorasi untuk terminal interaktif, sistem file visual, integrasi AI, dan alat keamanan yang dapat diakses langsung melalui antarmuka web.

Selama proses pengembangan, perhatian tidak hanya difokuskan pada estetika, tetapi juga pada konsistensi arsitektur, ketahanan backend, kenyamanan penggunaan di perangkat mobile, dan kualitas interaksi secara menyeluruh. Setiap iterasi diarahkan agar sistem terasa lebih matang, lebih profesional, dan lebih dekat dengan standar implementasi nyata.

Ke depan, Init.CV dikembangkan sebagai portofolio teknis yang tidak sekadar menampilkan profil dan proyek, tetapi juga merepresentasikan cara berpikir, pendekatan rekayasa perangkat lunak, serta minat riset pada bidang AI/LLM, keamanan siber, dan transformasi digital.`
  ),
});
