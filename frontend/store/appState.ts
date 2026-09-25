import {createSlice, type PayloadAction} from "@reduxjs/toolkit";
import {type TypedUseSelectorHook, useSelector} from "react-redux";
import type {RootState} from "./index";

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export type AppState = {
  darkMode: boolean;
  language: string;
};

const initialState: AppState = {
  darkMode: false,
  language: "en",
};

export const appStateSlice = createSlice({
  initialState,
  name: "appState",
  reducers: {
    resetAppState: () => initialState,
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
  },
});

export const {setDarkMode, setLanguage, resetAppState} = appStateSlice.actions;

export const useSelectDarkMode = (): boolean => {
  return useAppSelector((state) => state.appState.darkMode);
};

export const useSelectLanguage = (): string => {
  return useAppSelector((state) => state.appState.language);
};

export default appStateSlice.reducer;
