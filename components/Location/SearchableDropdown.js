import React from "react";
import { View, StyleSheet } from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import styled from "styled-components/native";
import { Controller } from "react-hook-form";

const SearchableDropdown = ({
  control,
  name,
  rules,
  placeholder,
  data,
  searchPlaceholder = "Search...",
  setSelected,
  error,
  label,
  ...props
}) => {
  return (
    <View style={styles.container}>
      <Label>{label}</Label>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { onChange, value } }) => (
          <SelectList
            setSelected={(val) => {
              onChange(val);
              setSelected?.(val);
            }}
            data={data}
            save="value"
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            defaultOption={value ? { key: value, value } : null}
            boxStyles={[styles.box, error ? styles.errorBox : null]}
            inputStyles={styles.input}
            dropdownStyles={styles.dropdown}
            dropdownTextStyles={styles.dropdownText}
            {...props}
          />
        )}
      />
      {error && <ErrorText>{error.message}</ErrorText>}
    </View>
  );
};

const Label = styled.Text({
  color: "#fff",
  fontWeight: "bold",
  fontSize: 14,
  marginBottom: 5,
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 15,
  },
  box: {
    backgroundColor: "#262626",
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#ff7675",
  },
  input: {
    color: "#fff",
  },
  dropdown: {
    backgroundColor: "#262626",
    borderWidth: 0,
    marginTop: 5,
  },
  dropdownText: {
    color: "#fff",
  },
});

const ErrorText = styled.Text`
  color: #ff7675;
  font-size: 12px;
  margin-top: 5px;
  margin-left: 5px;
`;

export default SearchableDropdown;
