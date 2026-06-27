const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export const transformDate = (dateString: string): string => {
  if (!dateString) return "";

  const [day, month, year] = dateString.split("-").map(Number);
  if (!day || !month || !year) return "";

  return `${day}${getOrdinalSuffix(day)} ${MONTH_NAMES[month - 1]} ${year}`;
};
