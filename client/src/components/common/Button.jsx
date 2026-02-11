import React from 'react';

/**
 * Button Component with Variants
 *
 * Replaces global button styling with scoped, intentional button variants.
 *
 * Variants:
 * - primary: Gradient teal button (default VTrustX style)
 * - secondary: Light gray button with border
 * - danger: Red/destructive action button
 * - success: Green/positive action button
 * - ghost: Transparent button with border
 * - text: No background, text only
 *
 * Sizes:
 * - sm: Small (32px height)
 * - md: Medium (40px height) - default
 * - lg: Large (48px height)
 */

const buttonVariants = {
  primary: {
    background: 'var(--primary-gradient)',
    backgroundColor: 'var(--button-bg)',
    color: 'var(--button-text)',
    border: '1px solid transparent',
    boxShadow: 'var(--button-shadow)',
    '&:hover': {
      boxShadow: 'var(--primary-glow)',
      filter: 'brightness(1.1)',
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: 'var(--button-shadow)',
    },
  },
  secondary: {
    background: 'var(--input-bg)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-color)',
    border: '1px solid var(--input-border)',
    boxShadow: 'none',
    '&:hover': {
      background: 'var(--sidebar-hover-bg)',
      borderColor: 'var(--text-muted)',
    },
  },
  danger: {
    background: '#fee2e2',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    boxShadow: 'none',
    '&:hover': {
      background: '#fecaca',
      color: '#b91c1c',
    },
  },
  success: {
    background: '#dcfce7',
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0',
    boxShadow: 'none',
    '&:hover': {
      background: '#bbf7d0',
      color: '#14532d',
    },
  },
  ghost: {
    background: 'transparent',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    border: '1px solid var(--input-border)',
    boxShadow: 'none',
    '&:hover': {
      background: 'var(--input-bg)',
      borderColor: 'var(--text-muted)',
    },
  },
  text: {
    background: 'transparent',
    backgroundColor: 'transparent',
    color: 'var(--primary-color)',
    border: 'none',
    boxShadow: 'none',
    padding: '0.5em 0.75em',
    '&:hover': {
      background: 'var(--input-bg)',
      color: 'var(--primary-hover)',
    },
  },
};

const buttonSizes = {
  sm: {
    padding: '0.5em 1em',
    fontSize: '0.85em',
    minHeight: '32px',
  },
  md: {
    padding: '0.75em 1.5em',
    fontSize: '0.9em',
    minHeight: '40px',
  },
  lg: {
    padding: '1em 2em',
    fontSize: '1em',
    minHeight: '48px',
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  uppercase = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  style = {},
  type = 'button',
  onClick,
  ...rest
}) {
  const variantStyles = buttonVariants[variant] || buttonVariants.primary;
  const sizeStyles = buttonSizes[size] || buttonSizes.md;

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    borderRadius: 'var(--button-border-radius, 24px)',
    fontWeight: variant === 'primary' ? 700 : 500,
    letterSpacing: uppercase || variant === 'primary' ? '0.5px' : 'normal',
    textTransform: uppercase || variant === 'primary' ? 'uppercase' : 'none',
    transition: 'var(--transition-fast)',
    outline: 'none',
    fontFamily: 'inherit',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    ...variantStyles,
    ...sizeStyles,
    ...style,
  };

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      style={baseStyles}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      {icon && iconPosition === 'left' && !loading && icon}
      {children}
      {icon && iconPosition === 'right' && !loading && icon}
    </button>
  );
}

/**
 * Icon Button - Square button with just an icon
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  icon,
  'aria-label': ariaLabel,
  disabled = false,
  className = '',
  style = {},
  onClick,
  ...rest
}) {
  const variantStyles = buttonVariants[variant] || buttonVariants.ghost;
  const sizeValue = size === 'sm' ? '32px' : size === 'lg' ? '48px' : '40px';

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: '50%',
    width: sizeValue,
    height: sizeValue,
    padding: 0,
    transition: 'var(--transition-fast)',
    outline: 'none',
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    ...variantStyles,
    ...style,
  };

  return (
    <button
      type="button"
      className={`btn-icon btn-icon-${variant} ${className}`}
      style={baseStyles}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...rest}
    >
      {icon}
    </button>
  );
}

/**
 * Button Group - Groups multiple buttons together
 */
export function ButtonGroup({ children, className = '', style = {} }) {
  return (
    <div
      className={`btn-group ${className}`}
      style={{
        display: 'inline-flex',
        gap: '8px',
        alignItems: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
