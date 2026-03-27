export const contactInfo = {
  email: 'muh.hamka.id@proton.me',
  githubUrl: 'https://github.com/hamk4dev',
  mapUrl:
    'https://www.google.com/maps/place/Kastil+Theos+Kaisar+Hamka+Yang+Agung+XVI/@-4.1562935,121.6933801,18.39z/data=!4m14!1m7!3m6!1s0x2d981dbca7a758ef:0x775d9f806ac568ac!2sKantor+Desa+Ulu+Baula!8m2!3d-4.1570142!4d121.6921242!16s%2Fg%2F11g0mx4k0k!3m5!1s0x2d981d006b054257:0xe6a12eafd2d2d89e!8m2!3d-4.1560317!4d121.6947872!16s%2Fg%2F11xgv966hl?entry=ttu&g_ep=EgoyMDI2MDMyNC4wIKXMDSoASAFQAw%3D%3D',
  mapEmbedUrl: 'https://www.google.com/maps?q=-4.1560317,121.6947872&z=18&output=embed',
  locationName: 'Kastil Theos Kaisar Hamka Yang Agung XVI',
  addressLine: 'Ulu Baula, Baula, Kolaka, Sulawesi Tenggara, Indonesia',
  notes: [
    'Email langsung tersedia kapan saja.',
    'Peta bisa dibuka di tab terpisah atau dimuat di halaman ini.',
  ],
};

export const contactMarkdown = `# Kontak

Email: ${contactInfo.email}
GitHub: ${contactInfo.githubUrl}
Peta: ${contactInfo.mapUrl}

Lokasi:
- ${contactInfo.locationName}
- ${contactInfo.addressLine}`;
