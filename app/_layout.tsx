import { Slot } from "expo-router";
import { ThemeProvider } from "./src/lib/ThemeContext";

export default function PublicLayout() {
  return (
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
  );
}
