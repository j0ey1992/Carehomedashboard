// Regular expressions for validation
export const PATTERNS = {
  EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  PHONE: /^(\+?44|0)[1-9]\d{8,9}$/,
  POSTCODE: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
};

// Validation messages
export const MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL: 'Please enter a valid email address',
  PHONE: 'Please enter a valid UK phone number',
  POSTCODE: 'Please enter a valid UK postcode',
  PASSWORD: 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character',
  DATE: 'Please enter a valid date in YYYY-MM-DD format',
  TIME: 'Please enter a valid time in HH:MM format',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
  MIN_VALUE: (min: number) => `Must be at least ${min}`,
  MAX_VALUE: (max: number) => `Must be no more than ${max}`,
  MATCH: 'Fields do not match',
  FUTURE_DATE: 'Date must be in the future',
  PAST_DATE: 'Date must be in the past',
};

// Validation functions
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

export const isEmail = (value: string): boolean => {
  return PATTERNS.EMAIL.test(value);
};

export const isPhone = (value: string): boolean => {
  return PATTERNS.PHONE.test(value);
};

export const isPostcode = (value: string): boolean => {
  return PATTERNS.POSTCODE.test(value);
};

export const isPassword = (value: string): boolean => {
  return PATTERNS.PASSWORD.test(value);
};

export const isDate = (value: string): boolean => {
  return PATTERNS.DATE.test(value);
};

export const isTime = (value: string): boolean => {
  return PATTERNS.TIME.test(value);
};

export const minLength = (value: string, min: number): boolean => {
  return value.length >= min;
};

export const maxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};

export const minValue = (value: number, min: number): boolean => {
  return value >= min;
};

export const maxValue = (value: number, max: number): boolean => {
  return value <= max;
};

export const matches = (value: string, matchValue: string): boolean => {
  return value === matchValue;
};

export const isFutureDate = (value: string): boolean => {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

export const isPastDate = (value: string): boolean => {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// Form validation helper
interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

interface ValidationRules {
  [key: string]: ValidationRule[];
}

interface ValidationErrors {
  [key: string]: string;
}

export const validateForm = (values: { [key: string]: any }, rules: ValidationRules): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((field) => {
    const fieldRules = rules[field];
    const value = values[field];

    for (const rule of fieldRules) {
      if (!rule.validate(value)) {
        errors[field] = rule.message;
        break;
      }
    }
  });

  return errors;
};

// Common validation rules
export const createValidationRules = (field: string) => ({
  required: {
    validate: isRequired,
    message: MESSAGES.REQUIRED,
  },
  email: {
    validate: isEmail,
    message: MESSAGES.EMAIL,
  },
  phone: {
    validate: isPhone,
    message: MESSAGES.PHONE,
  },
  postcode: {
    validate: isPostcode,
    message: MESSAGES.POSTCODE,
  },
  password: {
    validate: isPassword,
    message: MESSAGES.PASSWORD,
  },
  date: {
    validate: isDate,
    message: MESSAGES.DATE,
  },
  time: {
    validate: isTime,
    message: MESSAGES.TIME,
  },
  minLength: (min: number) => ({
    validate: (value: string) => minLength(value, min),
    message: MESSAGES.MIN_LENGTH(min),
  }),
  maxLength: (max: number) => ({
    validate: (value: string) => maxLength(value, max),
    message: MESSAGES.MAX_LENGTH(max),
  }),
  minValue: (min: number) => ({
    validate: (value: number) => minValue(value, min),
    message: MESSAGES.MIN_VALUE(min),
  }),
  maxValue: (max: number) => ({
    validate: (value: number) => maxValue(value, max),
    message: MESSAGES.MAX_VALUE(max),
  }),
  matches: (matchField: string) => ({
    validate: (value: string, allValues: any) => matches(value, allValues[matchField]),
    message: MESSAGES.MATCH,
  }),
  futureDate: {
    validate: isFutureDate,
    message: MESSAGES.FUTURE_DATE,
  },
  pastDate: {
    validate: isPastDate,
    message: MESSAGES.PAST_DATE,
  },
});

// Example usage:
/*
const validationRules = {
  email: [
    createValidationRules('email').required,
    createValidationRules('email').email,
  ],
  password: [
    createValidationRules('password').required,
    createValidationRules('password').password,
  ],
  confirmPassword: [
    createValidationRules('confirmPassword').required,
    createValidationRules('confirmPassword').matches('password'),
  ],
};

const errors = validateForm(values, validationRules);
*/
