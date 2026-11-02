import { createContext, useContext } from 'react';

// The space ('me' or a group id) of the note being created or edited, so
// deep editors (tag suggestions) offer that space's vocabulary.
export const NoteSpaceContext = createContext<string>('all');
export const useNoteSpace = () => useContext(NoteSpaceContext);
