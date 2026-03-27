export const createFile = (content, extra = {}) => ({
  type: 'file',
  content,
  ...extra,
});

export const createDirectory = (children = {}) => ({
  type: 'dir',
  children,
});
