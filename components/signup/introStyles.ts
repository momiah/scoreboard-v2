import styled from "styled-components/native";

import { BLUE } from "./SignupChrome";

export const IntroScroll = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 12,
    gap: 18,
  },
})({});

export const IntroScrollCompact = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 8,
    gap: 10,
  },
})({});

export const Eyebrow = styled.Text({
  color: BLUE,
  fontSize: 14,
  fontWeight: "600",
  letterSpacing: 2.4,
  textAlign: "center",
});

export const Headline = styled.Text({
  color: "#ffffff",
  fontSize: 32,
  fontWeight: "bold",
  textAlign: "center",
});

export const Subtitle = styled.Text({
  color: "#b9c4cf",
  fontSize: 16,
  lineHeight: 24,
  textAlign: "center",
});
