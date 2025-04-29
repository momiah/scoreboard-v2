import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import styled from "styled-components/native";
import { Controller } from "react-hook-form";
import ListDropdown from "../ListDropdown/ListDropdown";
import Ionicons from "@expo/vector-icons/Ionicons";

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
  loading = false,
  disabled,
  onDropdownOpen, // Add this prop
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
          <ListDropdown
            setSelected={(val) => {
              onChange(val);
              setSelected?.(val);
            }}
            data={data}
            save="value"
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            selectedOption={value ? { key: value, value } : null}
            boxStyles={[
              styles.box,
              error ? styles.errorBox : null,
              disabled ? styles.disabledBox : null,
            ]}
            inputStyles={styles.input}
            dropdownStyles={styles.dropdown}
            dropdownTextStyles={styles.dropdownText}
            loading={loading}
            onDropdownOpen={onDropdownOpen} // Pass through
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

const LoadingText = styled.Text({
  color: "#fff",
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
    paddingVertical: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#ff7675",
  },
  disabledBox: {
    opacity: 0.6,
  },
  input: {
    color: "#fff",
    paddingRight: 10,
  },
  dropdown: {
    backgroundColor: "#262626",
    borderWidth: 0,
    marginTop: 5,
  },
  dropdownText: {
    color: "#fff",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
});

const ErrorText = styled.Text`
  color: #ff7675;
  font-size: 12px;
  margin-top: 5px;
  margin-left: 5px;
`;

export default SearchableDropdown;
