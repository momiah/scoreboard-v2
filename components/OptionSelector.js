import React from "react";
import styled from "styled-components/native";

const OptionSelector = ({
  setValue,
  watch,
  name, // e.g. "leagueType", "maxPlayers", "privacy", "tournamentMode"
  label, // e.g. "Type", "Max Players", "Privacy", "Mode"
  options, // e.g. gameTypes, maxPlayers, privacyTypes, tournamentModes
  errorText, // optional error string
  keyExtractor, // optional (opt, index) => key
  display, // optional (opt) => string
  containerMarginTop = 10, // optional marginTop for container
  roundButtons = false,
  disabled = false,
}) => {
  const selected = watch(name);

  const handleSelect = (val) => {
    setValue(name, val, {
      shouldValidate: true,
      shouldTouch: true,
      shouldDirty: true,
    });
  };

  return (
    <Container style={{ marginTop: containerMarginTop }}>
      <LabelRow>
        <Label>{label}</Label>
        {!!errorText && <ErrorText>{errorText}</ErrorText>}
      </LabelRow>

      <Row>
        {options.map((opt, index) => {
          const key = keyExtractor ? keyExtractor(opt, index) : index;
          const isSelected = selected === opt;
          return (
            <Button
              disabled={disabled}
              key={key}
              onPress={disabled ? undefined : () => handleSelect(opt)}
              isSelected={isSelected}
              roundButtons={roundButtons}
            >
              <ButtonText isSelected={isSelected} disabled={disabled}>
                {display ? display(opt) : String(opt)}
              </ButtonText>
            </Button>
          );
        })}
      </Row>
    </Container>
  );
};

const Container = styled.View((containerMarginTop) => ({
  padding: 5,
  marginTop: containerMarginTop,
  width: "100%",
}));

const LabelRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: 5,
});

const Label = styled.Text({
  color: "#ccc",
  alignSelf: "flex-start",
  fontSize: 14,
  fontWeight: "bold",
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 10,
  fontStyle: "italic",
});

const Row = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
});

const Button = styled.TouchableOpacity(
  ({ isSelected, roundButtons, disabled }) => ({
    alignItems: "center",
    flex: 1,
    backgroundColor: disabled ? "#3a3a3a" : isSelected ? "#00284b" : "#00152B",
    borderWidth: 1,
    borderColor: disabled ? "#666" : isSelected ? "#004eb4" : "#414141",
    marginHorizontal: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    aspectRatio: roundButtons ? 1 : null,
    borderRadius: roundButtons ? 100 : 5,
    justifyContent: "center",
    opacity: disabled ? 0.7 : 1,
  })
);
const ButtonText = styled.Text(({ isSelected, disabled }) => ({
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "center",
  color: disabled ? "#9a9a9a" : isSelected ? "white" : "#7b7b7b",
}));

export default OptionSelector;
