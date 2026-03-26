import React from 'react';

export const getNodeAtPath = (fs, pathArray) => {
  let current = fs;
  for (const segment of pathArray) {
    if (current.type !== 'dir' || !current.children[segment]) return null;
    current = current.children[segment];
  }
  return current;
};

export const resolvePath = (currentPathArray, pathString) => {
  if (!pathString || pathString === '~' || pathString === '/') return [];
  const parts = pathString.split('/').filter(Boolean);
  let newPath = pathString.startsWith('/') ? [] : [...currentPathArray];
  
  for (const p of parts) {
    if (p === '.') continue;
    if (p === '..') newPath.pop();
    else newPath.push(p);
  }
  return newPath;
};

export const formatInline = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return <a key={`url-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-500/30 underline-offset-4 transition-colors">{part}</a>;
    }
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    return part.split(emailRegex).map((subPart, j) => {
      if (subPart.match(emailRegex)) {
        return <a key={`email-${i}-${j}`} href={`mailto:${subPart}`} className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-4 transition-colors">{subPart}</a>;
      }
      const boldRegex = /\*\*([^\*]+)\*\*/g;
      return subPart.split(boldRegex).map((boldPart, k) => {
        if (k % 2 === 1) return <strong key={`bold-${i}-${j}-${k}`} className="font-semibold text-slate-100">{boldPart}</strong>;
        return boldPart;
      });
    });
  });
};

export const renderDocumentContent = (content) => {
  if (!content) return <em className="text-slate-600">(File kosong)</em>;
  return content.split('\n').map((line, index) => {
    if (line.startsWith('# ')) {
      return <h1 key={index} className="text-lg sm:text-xl font-bold text-emerald-400 mt-5 mb-3 border-b border-slate-800/60 pb-1">{line.substring(2)}</h1>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-base sm:text-lg font-semibold text-indigo-300 mt-4 mb-2">{line.substring(3)}</h2>;
    }
    if (line.startsWith('- ')) {
      return (
        <div key={index} className="flex items-start ml-2 sm:ml-4 mb-1.5">
           <span className="text-emerald-500 mr-2 mt-0.5 opacity-70">›</span>
           <span className="flex-1">{formatInline(line.substring(2))}</span>
        </div>
      );
    }
    if (line.trim() === '') {
      return <div key={index} className="h-3"></div>;
    }
    return <div key={index} className="mb-2 leading-relaxed">{formatInline(line)}</div>;
  });
};
