import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EditorState {
  code: string;
  suggestion: string | null;
}
const initialState: EditorState = { code: '# Start coding...', suggestion: null };

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    updateCode: (state, action: PayloadAction<string>) => {
      state.code = action.payload;
      state.suggestion = null;
    },
    setSuggestion: (state, action: PayloadAction<string>) => {
      state.suggestion = action.payload;
    },
  },
});
export const { updateCode, setSuggestion } = editorSlice.actions;
export default editorSlice.reducer;