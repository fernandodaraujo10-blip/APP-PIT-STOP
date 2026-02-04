
// Sanitizes input strings to prevent HTML injection
export const sanitizeString = (str: string): string => {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m] || m));
};

// Checks if a phone number has a valid amount of digits for Brazil (10 or 11)
export const validatePhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

// Formats a phone number string into a standard Brazilian mask: (XX) X XXXX-XXXX or (XX) XXXX-XXXX
export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
};

// Validates if a name has at least 3 characters
export const validateName = (name: string): boolean => {
  return name.trim().length >= 3;
};

// Validates if a vehicle model has at least 2 characters
export const validateVehicle = (model: string): boolean => {
  return model.trim().length >= 2;
};
