import React from "react";
import styled from "styled-components/native";

const OptionSelector = ({
  setValue,
  watch,
  name,
  label,
  options,
  errorText,
  keyExtractor,
  display,
  containerMarginTop = 10,
  roundButtons = false,
  disabled = false,
  disabledOptions = [], // Add this
}) => {
  const selected = watch(name);

  const handleSelect = (val) => {
    if (disabledOptions.includes(val)) return; // Prevent selection
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
          const isDisabled = disabled || disabledOptions.includes(opt); // Check per-option

          return (
            <Button
              disabled={isDisabled}
              key={key}
              onPress={isDisabled ? undefined : () => handleSelect(opt)}
              isSelected={isSelected}
              roundButtons={roundButtons}
              isDisabled={isDisabled} // Pass to styled component
            >
              <ButtonText isSelected={isSelected} disabled={isDisabled}>
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
  ({ isSelected, roundButtons, isDisabled }) => ({
    alignItems: "center",
    flex: 1,
    backgroundColor: isDisabled
      ? "#3a3a3a"
      : isSelected
      ? "#00284b"
      : "#00152B",
    borderWidth: 1,
    borderColor: isDisabled ? "#666" : isSelected ? "#004eb4" : "#414141",
    marginHorizontal: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    aspectRatio: roundButtons ? 1 : null,
    borderRadius: roundButtons ? 100 : 5,
    justifyContent: "center",
    opacity: isDisabled ? 0.7 : 1,
  })
);
const ButtonText = styled.Text(({ isSelected, disabled }) => ({
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "center",
  color: disabled ? "#9a9a9a" : isSelected ? "white" : "#7b7b7b",
}));

export default OptionSelector;
