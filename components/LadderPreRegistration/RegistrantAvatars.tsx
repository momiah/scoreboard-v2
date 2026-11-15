import React from "react";
import styled from "styled-components/native";
import type { LadderPreRegistrant } from "@shared/types";
import { CourtChampLogoIcon } from "../../assets";
import { LADDER_PRE_REGISTRATION_COLORS as COLORS } from "../../helpers/ladderPreRegistrationDisplay";

const AVATAR_SIZE = 30;

const RegistrantAvatars: React.FC<{
  registrants: LadderPreRegistrant[];
  total: number;
  noun: "player" | "team";
}> = ({ registrants, total, noun }) => {
  if (total === 0) {
    return (
      <Container>
        <Caption>Be the first {noun} to pre-register</Caption>
      </Container>
    );
  }

  const more = total - registrants.length;

  return (
    <Container testID="ladder-pre-registration-registrants">
      <Stack>
        {registrants.map((registrant, index) => (
          <Avatar
            key={registrant.userId}
            first={index === 0}
            source={
              registrant.profileImage
                ? { uri: registrant.profileImage }
                : CourtChampLogoIcon
            }
          />
        ))}
      </Stack>
      <Caption>
        {more > 0
          ? `+${more.toLocaleString("en-GB")} more pre-registered`
          : `${total.toLocaleString("en-GB")} pre-registered`}
      </Caption>
    </Container>
  );
};

const Container = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
});

const Stack = styled.View({
  flexDirection: "row",
});

const Avatar = styled.Image<{ first: boolean }>(
  ({ first }: { first: boolean }) => ({
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: COLORS.screen,
    backgroundColor: COLORS.hero,
    marginLeft: first ? 0 : -10,
  }),
);

const Caption = styled.Text({
  color: COLORS.muted,
  fontSize: 12,
});

export default RegistrantAvatars;
