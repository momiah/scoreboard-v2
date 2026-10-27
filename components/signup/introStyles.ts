import styled from "styled-components/native";

import { BODY } from "./SignupChrome";

export const IntroScroll = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 16,
  },
})({});

export const IntroTitle = styled.Text({
  color: "#ffffff",
  fontSize: 28,
  fontWeight: "bold",
  textAlign: "center",
});

export const IntroText = styled.Text({
  color: BODY,
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
});
