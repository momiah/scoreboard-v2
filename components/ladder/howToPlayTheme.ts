import styled from "styled-components/native";

export const SCREEN_BG = "rgb(3, 16, 31)";
export const BLUE = "#00A2FF";
export const GOLD = "#FFC800";
export const MUTED = "#aaa";
export const BODY = "#c9d6e3";

/** The darkening gradient behind every guide and sign-up page. */
export const BACKGROUND_GRADIENT = {
  colors: [SCREEN_BG, "#020b17", "#01060d"],
  locations: [0, 0.5, 1],
} as const;

/** The small spaced-out caps label above a headline. */
export const Eyebrow = styled.Text({
  color: BLUE,
  fontSize: 14,
  fontWeight: "600",
  letterSpacing: 2.4,
});
