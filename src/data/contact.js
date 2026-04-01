export const contactInfo = {
  email: 'muh.hamka.id@proton.me',
  githubUrl: 'https://github.com/hamk4dev',
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=Ulu+Baula,+Baula,+Kolaka,+Sulawesi+Tenggara,+Indonesia',
  mapEmbedUrl:
    'https://www.google.com/maps?q=Ulu+Baula,+Baula,+Kolaka,+Sulawesi+Tenggara,+Indonesia&output=embed',
  locationName: 'Ulu Baula, Baula, Kolaka, Sulawesi Tenggara, Indonesia',
  addressLine: '',
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
- ${contactInfo.locationName}${contactInfo.addressLine ? `\n- ${contactInfo.addressLine}` : ''}`;