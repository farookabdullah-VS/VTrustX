import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Validation rules factory.
 */
export const rules = {
  required: (msg) => (value) =>
    (!value || (typeof value === 'string' && !value.trim())) ? (msg || 'This field is required') : '',

  minLength: (len, msg) => (value) =>
    value && value.length < len ? (msg || `Minimum ${len} characters`) : '',

  maxLength: (len, msg) => (value) =>
    value && value.length > len ? (msg || `Maximum ${len} characters`) : '',

  email: (msg) => (value) =>
    value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? (msg || 'Invalid email address') : '',

  phone: (msg) => (value) =>
    value && !/^[+]?[\d\s()-]{7,20}$/.test(value) ? (msg || 'Invalid phone number') : '',

  match: (otherField, msg) => (value, allValues) =>
    value !== allValues[otherField] ? (msg || 'Fields do not match') : '',

  pattern: (regex, msg) => (value) =>
    value && !regex.test(value) ? (msg || 'Invalid format') : '',

  custom: (fn) => fn,
};

/**
 * useFormValidation hook — manages form state, validation, and errors.
 *
 * Usage:
 *   const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, setFieldValue } =
 *     useFormValidation({
 *       initialValues: { username: '', password: '' },
 *       validationRules: {
 *         username: [rules.required('Username is required')],
 *         password: [rules.required('Password is required'), rules.minLength(6)],
 *       },
 *       onSubmit: (values) => { console.log(values); },
 *     });
 */
export function useFormValidation({ initialValues = {}, validationRules = {}, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Validate a single field
  const validateField = useCallback((name, value) => {
    const fieldRules = validationRules[name];
    if (!fieldRules) return '';
    for (const rule of fieldRules) {
      const error = rule(value, valuesRef.current);
      if (error) return error;
    }
    return '';
  }, [validationRules]);

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors = {};
    let valid = true;
    for (const name of Object.keys(validationRules)) {
      const error = validateField(name, valuesRef.current[name]);
      if (error) {
        newErrors[name] = error;
        valid = false;
      }
    }
    setErrors(newErrors);
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(validationRules).forEach((k) => { allTouched[k] = true; });
    setTouched(allTouched);
    return valid;
  }, [validationRules, validateField]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValues((prev) => ({ ...prev, [name]: newValue }));

    // Clear error on change if field is touched
    if (touched[name]) {
      const error = validateField(name, newValue);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, [validateField]);

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!validateAll()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(valuesRef.current);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAll, onSubmit]);

  const reset = useCallback((newValues) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = Object.keys(validationRules).every(
    (name) => !validateField(name, values[name])
  );

  return {
    values, errors, touched, isSubmitting, isValid,
    handleChange, handleBlur, handleSubmit, setFieldValue, reset, validateAll,
  };
}

/**
 * ValidatedInput — styled input with inline error display.
 *
 * Usage:
 *   <ValidatedInput
 *     name="username"
 *     label="Username"
 *     value={values.username}
 *     error={touched.username && errors.username}
 *     onChange={handleChange}
 *     onBlur={handleBlur}
 *     required
 *   />
 */
export function ValidatedInput({
  name,
  label,
  type = 'text',
  value,
  error,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  style = {},
  inputStyle = {},
  ...rest
}) {
  const hasError = !!error;

  return (
    <div style={{ marginBottom: '20px', ...style }}>
      {label && (
        <label
          htmlFor={name}
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '0.9em',
            color: 'var(--label-color)',
            fontWeight: '600',
            marginLeft: '2px',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--status-error)', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: `1px solid ${hasError ? 'var(--status-error)' : 'var(--input-border)'}`,
          background: 'var(--input-bg)',
          color: 'var(--input-text)',
          fontSize: '15px',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'all 0.2s',
          ...(hasError && { boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' }),
          ...inputStyle,
        }}
        onFocus={(e) => {
          if (!hasError) {
            e.target.style.borderColor = 'var(--primary-color)';
            e.target.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.1)';
          }
        }}
        onFocusCapture={undefined}
        {...rest}
      />
      {hasError && (
        <div
          id={`${name}-error`}
          role="alert"
          style={{
            color: 'var(--status-error)',
            fontSize: '0.8em',
            marginTop: '6px',
            marginLeft: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: '500',
          }}
        >
          <span style={{ fontSize: '1em' }}>!</span>
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * ValidatedSelect — styled select with inline error display.
 */
export function ValidatedSelect({
  name,
  label,
  value,
  error,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Select...',
  required = false,
  disabled = false,
  style = {},
}) {
  const hasError = !!error;

  return (
    <div style={{ marginBottom: '20px', ...style }}>
      {label && (
        <label
          htmlFor={name}
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '0.9em',
            color: 'var(--label-color)',
            fontWeight: '600',
            marginLeft: '2px',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--status-error)', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        aria-required={required}
        aria-invalid={hasError}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: `1px solid ${hasError ? 'var(--status-error)' : 'var(--input-border)'}`,
          background: 'var(--input-bg)',
          color: 'var(--input-text)',
          fontSize: '15px',
          boxSizing: 'border-box',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hasError && (
        <div
          role="alert"
          style={{
            color: 'var(--status-error)',
            fontSize: '0.8em',
            marginTop: '6px',
            marginLeft: '2px',
            fontWeight: '500',
          }}
        >
          ! {error}
        </div>
      )}
    </div>
  );
}
