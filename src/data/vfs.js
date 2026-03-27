import { createDirectory } from './vfs/helpers';
import { rootFiles } from './vfs/root-files';
import { projectsDirectory } from './vfs/projects';
import { booksDirectory } from './vfs/books';
import { notesDirectory } from './vfs/notes';
import { skillsDirectory } from './vfs/skills';
import { experienceDirectory } from './vfs/experience';
import { toolsDirectory } from './vfs/tools';

export const initialVFS = {
  name: 'root',
  ...createDirectory({
    ...rootFiles,
    projects: projectsDirectory,
    books: booksDirectory,
    notes: notesDirectory,
    skills: skillsDirectory,
    experience: experienceDirectory,
    tools: toolsDirectory,
  }),
};
