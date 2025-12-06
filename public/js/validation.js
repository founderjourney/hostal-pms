/**
 * PMS Almanik - Libreria de Validacion Frontend
 * DEV2 - Tarea 2: Validacion de caracteres especiales
 */

// Configuracion de reglas por tipo de campo
const VALIDATION_RULES = {
  name: {
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/,
    message: 'INVALID_NAME',
    description: 'Solo letras, espacios, acentos y guiones'
  },
  document: {
    pattern: /^[a-zA-Z0-9-]+$/,
    message: 'INVALID_DOCUMENT',
    description: 'Solo letras, numeros y guiones'
  },
  phone: {
    pattern: /^[\d\s+()-]+$/,
    message: 'INVALID_PHONE',
    description: 'Solo numeros, espacios, +, parentesis y guiones'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'INVALID_EMAIL',
    description: 'Formato de email valido'
  },
  number: {
    pattern: /^\d+$/,
    message: 'INVALID_NUMBER',
    description: 'Solo numeros enteros'
  },
  price: {
    pattern: /^\d+(\.\d{1,2})?$/,
    message: 'INVALID_PRICE',
    description: 'Numero decimal positivo (max 2 decimales)'
  },
  date: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: 'INVALID_DATE',
    description: 'Formato de fecha YYYY-MM-DD'
  },
  alphanumeric: {
    pattern: /^[a-zA-Z0-9\s]+$/,
    message: 'INVALID_ALPHANUMERIC',
    description: 'Solo letras y numeros'
  },
  text: {
    pattern: /^[^<>{}]*$/,
    message: 'INVALID_TEXT',
    description: 'No se permiten caracteres especiales de codigo'
  }
};

/**
 * Valida nombre (solo letras, espacios, acentos)
 * @param {string} value - Valor a validar
 * @returns {object} - { valid: boolean, message: string }
 */
function validateName(value) {
  if (!value || value.trim() === '') {
    return { valid: false, message: 'REQUIRED_FIELD' };
  }
  const isValid = VALIDATION_RULES.name.pattern.test(value.trim());
  return {
    valid: isValid,
    message: isValid ? '' : VALIDATION_RULES.name.message
  };
}

/**
 * Valida documento (alfanumerico)
 * @param {string} value - Valor a validar
 * @returns {object} - { valid: boolean, message: string }
 */
function validateDocument(value) {
  if (!value || value.trim() === '') {
    return { valid: false, message: 'REQUIRED_FIELD' };
  }
  const isValid = VALIDATION_RULES.document.pattern.test(value.trim());
  return {
    valid: isValid,
    message: isValid ? '' : VALIDATION_RULES.document.message
  };
}

/**
 * Valida telefono (solo numeros y +)
 * @param {string} value - Valor a validar
 * @returns {object} - { valid: boolean, message: string }
 */
function validatePhone(value) {
  if (!value || value.trim() === '') {
    return { valid: true, message: '' }; // Telefono puede ser opcional
  }
  const isValid = VALIDATION_RULES.phone.pattern.test(value.trim());
  return {
    valid: isValid,
    message: isValid ? '' : VALIDATION_RULES.phone.message
  };
}

/**
 * Valida email (formato email)
 * @param {string} value - Valor a validar
 * @returns {object} - { valid: boolean, message: string }
 */
function validateEmail(value) {
  if (!value || value.trim() === '') {
    return { valid: true, message: '' }; // Email puede ser opcional
  }
  const isValid = VALIDATION_RULES.email.pattern.test(value.trim());
  return {
    valid: isValid,
    message: isValid ? '' : VALIDATION_RULES.email.message
  };
}

/**
 * Valida numero (solo numeros enteros)
 * @param {string} value - Valor a validar
 * @returns {object} - { valid: boolean, message: string }
 */
function validateNumber(value) {
  if (!value || value.toString().trim() === '') {
    return { valid: false, message: 'REQUIRED_FIELD' };
  }
  const isValid = VALIDATION_RULES.number.pattern.test(value.toString().trim());
  return {
    valid: isValid,
    message: isValid ? '' : VALIDATION_RULES.number.message
  };
}

/**
 * Valida precio (numero decimal positivo)
 * @param {string} value - Valor a validar
 * @returns {object} - { valid: boolean, message: string }
 */
function validatePrice(value) {
  if (!value || value.toString().trim() === '') {
    return { valid: false, message: 'REQUIRED_FIELD' };
  }
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0) {
    return { valid: false, message: VALIDATION_RULES.price.message };
  }
  const isValid = VALIDATION_RULES.price.pattern.test(value.toString().trim());
  return {
    valid: isValid,
    message: isValid ? '' : VALIDATION_RULES.price.message
  };
}

/**
 * Valida fecha (formato valido)
 * @param {string} value - Valor a validar
 * @returns {object} - { valid: boolean, message: string }
 */
function validateDate(value) {
  if (!value || value.trim() === '') {
    return { valid: false, message: 'REQUIRED_FIELD' };
  }

  // Verificar formato YYYY-MM-DD
  if (!VALIDATION_RULES.date.pattern.test(value.trim())) {
    return { valid: false, message: VALIDATION_RULES.date.message };
  }

  // Verificar que sea una fecha valida
  const date = new Date(value);
  const isValid = !isNaN(date.getTime());

  return {
    valid: isValid,
    message: isValid ? '' : VALIDATION_RULES.date.message
  };
}

/**
 * Valida texto general (sin caracteres peligrosos)
 * @param {string} value - Valor a validar
 * @returns {object} - { valid: boolean, message: string }
 */
function validateText(value) {
  if (!value || value.trim() === '') {
    return { valid: true, message: '' };
  }
  const isValid = VALIDATION_RULES.text.pattern.test(value);
  return {
    valid: isValid,
    message: isValid ? '' : VALIDATION_RULES.text.message
  };
}

/**
 * Valida un campo segun su tipo
 * @param {string} value - Valor a validar
 * @param {string} type - Tipo de validacion (name, document, phone, email, number, price, date)
 * @param {boolean} required - Si el campo es obligatorio
 * @returns {object} - { valid: boolean, message: string }
 */
function validateField(value, type, required = false) {
  // Si es requerido y esta vacio
  if (required && (!value || value.toString().trim() === '')) {
    return { valid: false, message: 'REQUIRED_FIELD' };
  }

  // Si no es requerido y esta vacio, es valido
  if (!required && (!value || value.toString().trim() === '')) {
    return { valid: true, message: '' };
  }

  // Validar segun tipo
  switch (type) {
    case 'name':
      return validateName(value);
    case 'document':
      return validateDocument(value);
    case 'phone':
      return validatePhone(value);
    case 'email':
      return validateEmail(value);
    case 'number':
      return validateNumber(value);
    case 'price':
      return validatePrice(value);
    case 'date':
      return validateDate(value);
    case 'text':
      return validateText(value);
    default:
      return { valid: true, message: '' };
  }
}

/**
 * Valida un formulario completo antes de enviar
 * @param {string} formId - ID del formulario o contenedor
 * @returns {object} - { valid: boolean, errors: array }
 */
function validateFormBeforeSubmit(formId) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error('Formulario no encontrado:', formId);
    return { valid: false, errors: ['FORM_NOT_FOUND'] };
  }

  const errors = [];
  const inputs = form.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    const isRequired = input.hasAttribute('required');
    const validationType = input.dataset.validation || input.type;
    const value = input.value;
    const fieldName = input.name || input.id;

    // Verificar campo requerido
    if (isRequired && (!value || value.trim() === '')) {
      errors.push({
        field: fieldName,
        element: input,
        message: 'REQUIRED_FIELD'
      });
      highlightFieldError(input);
      return;
    }

    // Mapear tipo de input a tipo de validacion
    let type = validationType;
    if (validationType === 'text' && input.dataset.validation) {
      type = input.dataset.validation;
    } else if (validationType === 'tel') {
      type = 'phone';
    } else if (validationType === 'number') {
      type = input.step ? 'price' : 'number';
    }

    // Validar si tiene valor
    if (value && value.trim() !== '') {
      const result = validateField(value, type, isRequired);
      if (!result.valid) {
        errors.push({
          field: fieldName,
          element: input,
          message: result.message
        });
        highlightFieldError(input);
      } else {
        clearFieldError(input);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Resalta un campo con error (borde rojo + scroll)
 * @param {HTMLElement} field - Elemento del campo
 */
function highlightFieldError(field) {
  if (!field) return;

  field.classList.add('field-error');
  field.style.borderColor = '#dc2626';
  field.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.2)';

  // Scroll al primer error
  if (!document.querySelector('.field-error:focus')) {
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.focus();
  }
}

/**
 * Limpia el estado de error de un campo
 * @param {HTMLElement} field - Elemento del campo
 */
function clearFieldError(field) {
  if (!field) return;

  field.classList.remove('field-error');
  field.style.borderColor = '';
  field.style.boxShadow = '';
}

/**
 * Agrega validacion en tiempo real a un input
 * @param {HTMLElement} input - Elemento input
 * @param {string} type - Tipo de validacion
 */
function addRealtimeValidation(input, type) {
  if (!input) return;

  input.addEventListener('blur', function() {
    const isRequired = this.hasAttribute('required');
    const result = validateField(this.value, type, isRequired);

    if (!result.valid) {
      highlightFieldError(this);
      if (typeof showFieldError === 'function') {
        showFieldError(this, result.message);
      }
    } else {
      clearFieldError(this);
    }
  });

  input.addEventListener('input', function() {
    // Limpiar error mientras escribe
    if (this.classList.contains('field-error')) {
      clearFieldError(this);
    }
  });
}

/**
 * Prevenir que Backspace cierre ventana (Tarea 5)
 */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Backspace' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    // Verificar si el elemento es editable
    if (!e.target.isContentEditable) {
      e.preventDefault();
    }
  }
});

/**
 * Inicializa validacion automatica en campos con data-validation
 */
function initializeValidation() {
  const inputs = document.querySelectorAll('[data-validation]');
  inputs.forEach(input => {
    const type = input.dataset.validation;
    addRealtimeValidation(input, type);
  });

  console.log('Validation.js inicializado -', inputs.length, 'campos con validacion');
}

// Inicializar cuando el DOM este listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeValidation);
} else {
  initializeValidation();
}

// Exportar funciones para uso global
window.validateName = validateName;
window.validateDocument = validateDocument;
window.validatePhone = validatePhone;
window.validateEmail = validateEmail;
window.validateNumber = validateNumber;
window.validatePrice = validatePrice;
window.validateDate = validateDate;
window.validateText = validateText;
window.validateField = validateField;
window.validateFormBeforeSubmit = validateFormBeforeSubmit;
window.highlightFieldError = highlightFieldError;
window.clearFieldError = clearFieldError;
window.addRealtimeValidation = addRealtimeValidation;
window.VALIDATION_RULES = VALIDATION_RULES;
