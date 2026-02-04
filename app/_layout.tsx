import { Slot } from "expo-router";
import { ThemeProvider } from "./src/context/ThemeContext";

export default function PublicLayout() {
  return (
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
  );
}
