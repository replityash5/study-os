export function draftKey(topicId: string) {
  return `study-os-note-draft-${topicId}`;
}

export function saveDraft(topicId: string, content: string) {
  if (content) localStorage.setItem(draftKey(topicId), content);
  else localStorage.removeItem(draftKey(topicId));
}

export function recoverDraft(topicId: string, savedContent: string) {
  const draft = localStorage.getItem(draftKey(topicId));
  return draft && draft !== savedContent ? draft : null;
}

export function clearDraft(topicId: string) {
  localStorage.removeItem(draftKey(topicId));
}
