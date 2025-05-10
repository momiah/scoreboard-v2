import { formatDateForStorage } from "./formatDateForStorage";

export const calculateEndDate = (startDate, lengthInMonths) => {
  const [day, month, year] = startDate.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  dateObj.setMonth(dateObj.getMonth() + parseInt(lengthInMonths));
  return formatDateForStorage(dateObj);
};
