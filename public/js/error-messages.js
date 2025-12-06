/**
 * PMS Almanik - Mensajes de Error en Lenguaje Humano
 * DEV2 - Tarea 4: Mensajes de error + control de modales
 */

// Variable global para controlar si el modal tiene error
window.modalHasError = false;

// Diccionario de mensajes en Espanol
const ERROR_MESSAGES = {
  // Errores de validacion de campos
  'REQUIRED_FIELD': 'Este campo es obligatorio',
  'INVALID_NAME': 'El nombre solo puede contener letras, espacios y acentos',
  'INVALID_DOCUMENT': 'El documento solo puede contener letras, numeros y guiones',
  'INVALID_PHONE': 'El telefono solo puede contener numeros, espacios y el signo +',
  'INVALID_EMAIL': 'Por favor ingresa un email valido (ejemplo@dominio.com)',
  'INVALID_NUMBER': 'Este campo solo acepta numeros enteros',
  'INVALID_PRICE': 'Ingresa un precio valido (ejemplo: 100.50)',
  'INVALID_DATE': 'Ingresa una fecha valida',
  'INVALID_ALPHANUMERIC': 'Solo se permiten letras y numeros',
  'INVALID_TEXT': 'No se permiten caracteres especiales como < > { }',
  'FORM_NOT_FOUND': 'Error interno: formulario no encontrado',

  // Errores de disponibilidad
  'BED_UNAVAILABLE': 'Esta cama no esta disponible en las fechas seleccionadas',
  'BED_OCCUPIED': 'Esta cama ya esta ocupada',
  'BED_MAINTENANCE': 'Esta cama esta en mantenimiento',
  'BED_DIRTY': 'Esta cama necesita limpieza antes de asignarla',
  'ROOM_FULL': 'Esta habitacion no tiene camas disponibles',
  'NO_BEDS_AVAILABLE': 'No hay camas disponibles para estas fechas',

  // Errores de huespedes
  'GUEST_NOT_FOUND': 'Huesped no encontrado',
  'GUEST_ALREADY_CHECKED_IN': 'Este huesped ya tiene un check-in activo',
  'GUEST_NOT_CHECKED_IN': 'Este huesped no tiene un check-in activo',
  'DUPLICATE_DOCUMENT': 'Ya existe un huesped con este documento',

  // Errores de check-in/check-out
  'CHECKIN_FAILED': 'Error al realizar el check-in. Por favor intenta nuevamente',
  'CHECKOUT_FAILED': 'Error al realizar el check-out. Por favor intenta nuevamente',
  'INVALID_CHECKOUT_DATE': 'La fecha de salida debe ser posterior a la fecha de entrada',
  'CHECKOUT_BEFORE_CHECKIN': 'No puedes hacer check-out antes del check-in',
  'STAY_TOO_LONG': 'La estadia excede el limite maximo permitido',

  // Errores de caja/transacciones
  'INSUFFICIENT_FUNDS': 'Fondos insuficientes en caja',
  'INVALID_AMOUNT': 'El monto ingresado no es valido',
  'NEGATIVE_AMOUNT': 'El monto no puede ser negativo',
  'TRANSACTION_FAILED': 'Error al procesar la transaccion',
  'CASHBOX_CLOSED': 'La caja esta cerrada',
  'CASHBOX_ALREADY_OPEN': 'La caja ya esta abierta',

  // Errores de reservas
  'RESERVATION_NOT_FOUND': 'Reserva no encontrada',
  'RESERVATION_CANCELLED': 'Esta reserva fue cancelada',
  'RESERVATION_EXPIRED': 'Esta reserva ha expirado',
  'DATES_OVERLAP': 'Las fechas seleccionadas se superponen con otra reserva',
  'INVALID_DATES': 'Las fechas ingresadas no son validas',

  // Errores de personal
  'STAFF_NOT_FOUND': 'Personal no encontrado',
  'DUPLICATE_EMAIL': 'Ya existe un usuario con este email',
  'INVALID_ROLE': 'Rol no valido',

  // Errores de productos
  'PRODUCT_NOT_FOUND': 'Producto no encontrado',
  'OUT_OF_STOCK': 'Producto sin stock disponible',
  'INSUFFICIENT_STOCK': 'Stock insuficiente',

  // Errores de red/servidor
  'NETWORK_ERROR': 'Error de conexion. Verifica tu internet',
  'SERVER_ERROR': 'Error del servidor. Intenta nuevamente',
  'TIMEOUT': 'La operacion tardo demasiado. Intenta nuevamente',
  'UNAUTHORIZED': 'No tienes permisos para esta accion',
  'SESSION_EXPIRED': 'Tu sesion ha expirado. Por favor inicia sesion nuevamente',
  'FORBIDDEN': 'Acceso denegado',

  // Errores generales
  'UNKNOWN_ERROR': 'Ocurrio un error inesperado',
  'SAVE_FAILED': 'Error al guardar. Intenta nuevamente',
  'DELETE_FAILED': 'Error al eliminar. Intenta nuevamente',
  'LOAD_FAILED': 'Error al cargar los datos',
  'UPDATE_FAILED': 'Error al actualizar. Intenta nuevamente'
};

// Diccionario de mensajes en Portugues
const ERROR_MESSAGES_PT = {
  // Erros de validacao de campos
  'REQUIRED_FIELD': 'Este campo e obrigatorio',
  'INVALID_NAME': 'O nome so pode conter letras, espacos e acentos',
  'INVALID_DOCUMENT': 'O documento so pode conter letras, numeros e hifens',
  'INVALID_PHONE': 'O telefone so pode conter numeros, espacos e o sinal +',
  'INVALID_EMAIL': 'Por favor insira um email valido (exemplo@dominio.com)',
  'INVALID_NUMBER': 'Este campo so aceita numeros inteiros',
  'INVALID_PRICE': 'Insira um preco valido (exemplo: 100.50)',
  'INVALID_DATE': 'Insira uma data valida',
  'INVALID_ALPHANUMERIC': 'Apenas letras e numeros sao permitidos',
  'INVALID_TEXT': 'Caracteres especiais como < > { } nao sao permitidos',

  // Erros de disponibilidade
  'BED_UNAVAILABLE': 'Esta cama nao esta disponivel nas datas selecionadas',
  'BED_OCCUPIED': 'Esta cama ja esta ocupada',
  'BED_MAINTENANCE': 'Esta cama esta em manutencao',
  'ROOM_FULL': 'Este quarto nao tem camas disponiveis',
  'NO_BEDS_AVAILABLE': 'Nao ha camas disponiveis para estas datas',

  // Erros de hospedes
  'GUEST_NOT_FOUND': 'Hospede nao encontrado',
  'GUEST_ALREADY_CHECKED_IN': 'Este hospede ja tem um check-in ativo',

  // Erros gerais
  'NETWORK_ERROR': 'Erro de conexao. Verifique sua internet',
  'SERVER_ERROR': 'Erro do servidor. Tente novamente',
  'UNKNOWN_ERROR': 'Ocorreu um erro inesperado'
};

// Idioma actual (default: espanol)
let currentLanguage = 'es';

/**
 * Establece el idioma para los mensajes de error
 * @param {string} lang - Codigo de idioma ('es' o 'pt')
 */
function setErrorLanguage(lang) {
  if (lang === 'es' || lang === 'pt') {
    currentLanguage = lang;
  }
}

/**
 * Traduce un codigo de error a mensaje humano
 * @param {string} errorCode - Codigo de error o mensaje del backend
 * @returns {string} - Mensaje traducido
 */
function translateError(errorCode) {
  if (!errorCode) {
    return ERROR_MESSAGES['UNKNOWN_ERROR'];
  }

  // Si el codigo ya es un mensaje (contiene espacios), devolverlo
  if (errorCode.includes(' ') && !errorCode.includes('_')) {
    return errorCode;
  }

  // Normalizar el codigo (mayusculas, sin espacios)
  const normalizedCode = errorCode.toUpperCase().replace(/\s+/g, '_');

  // Buscar en el diccionario del idioma actual
  const messages = currentLanguage === 'pt' ? ERROR_MESSAGES_PT : ERROR_MESSAGES;

  // Buscar coincidencia exacta
  if (messages[normalizedCode]) {
    return messages[normalizedCode];
  }

  // Buscar coincidencia parcial
  for (const key in messages) {
    if (normalizedCode.includes(key) || key.includes(normalizedCode)) {
      return messages[key];
    }
  }

  // Intentar parsear errores del backend
  const backendError = parseBackendError(errorCode);
  if (backendError) {
    return backendError;
  }

  // Si no se encuentra, devolver el error original formateado
  return formatUnknownError(errorCode);
}

/**
 * Intenta parsear errores comunes del backend
 * @param {string} error - Error del backend
 * @returns {string|null} - Mensaje traducido o null
 */
function parseBackendError(error) {
  const errorLower = error.toLowerCase();

  // Errores de base de datos
  if (errorLower.includes('unique constraint') || errorLower.includes('duplicate')) {
    return ERROR_MESSAGES['DUPLICATE_DOCUMENT'];
  }
  if (errorLower.includes('not found') || errorLower.includes('no encontrado')) {
    return 'Registro no encontrado';
  }
  if (errorLower.includes('foreign key')) {
    return 'No se puede eliminar porque tiene registros relacionados';
  }
  if (errorLower.includes('connection') || errorLower.includes('econnrefused')) {
    return ERROR_MESSAGES['NETWORK_ERROR'];
  }
  if (errorLower.includes('timeout')) {
    return ERROR_MESSAGES['TIMEOUT'];
  }
  if (errorLower.includes('unauthorized') || errorLower.includes('401')) {
    return ERROR_MESSAGES['UNAUTHORIZED'];
  }
  if (errorLower.includes('forbidden') || errorLower.includes('403')) {
    return ERROR_MESSAGES['FORBIDDEN'];
  }

  return null;
}

/**
 * Formatea un error desconocido para mostrarlo al usuario
 * @param {string} error - Error original
 * @returns {string} - Error formateado
 */
function formatUnknownError(error) {
  // Remover prefijos tecnicos comunes
  let formatted = error
    .replace(/^Error:\s*/i, '')
    .replace(/^Exception:\s*/i, '')
    .replace(/^\[.*?\]\s*/, '');

  // Capitalizar primera letra
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  return formatted;
}

/**
 * Muestra un mensaje de error junto a un campo especifico
 * @param {HTMLElement} field - Elemento del campo
 * @param {string} errorCode - Codigo de error
 */
function showFieldError(field, errorCode) {
  if (!field) return;

  const message = translateError(errorCode);

  // Buscar o crear contenedor de error
  let errorDiv = field.parentElement.querySelector('.field-error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.style.cssText = 'color: #dc2626; font-size: 12px; margin-top: 4px;';
    field.parentElement.appendChild(errorDiv);
  }

  errorDiv.textContent = message;
  errorDiv.style.display = 'block';

  // Marcar que el modal tiene error
  window.modalHasError = true;
}

/**
 * Limpia el mensaje de error de un campo
 * @param {HTMLElement} field - Elemento del campo
 */
function clearFieldErrorMessage(field) {
  if (!field) return;

  const errorDiv = field.parentElement.querySelector('.field-error-message');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

/**
 * Muestra una alerta con mensaje de error traducido
 * Wrapper para showAlert() existente
 * @param {string} errorCode - Codigo de error
 * @param {string} fieldId - ID del campo con error (opcional)
 */
function showErrorAlert(errorCode, fieldId) {
  const message = translateError(errorCode);

  // Marcar que hay error en el modal
  window.modalHasError = true;

  // Si se especifica un campo, resaltarlo
  if (fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
      if (typeof highlightFieldError === 'function') {
        highlightFieldError(field);
      }
      showFieldError(field, errorCode);
    }
  }

  // Usar showAlert existente si esta disponible
  if (typeof showAlert === 'function') {
    showAlert('error', message);
  } else {
    // Fallback: alert nativo
    alert(message);
  }
}

/**
 * Funcion para cerrar modal - wrapper que verifica errores
 * Modifica el comportamiento de closeModal para no cerrar si hay error
 * @param {string} modalId - ID del modal
 * @param {boolean} force - Forzar cierre incluso con errores
 */
function safeCloseModal(modalId, force = false) {
  // Si hay error y no es forzado, no cerrar
  if (window.modalHasError && !force) {
    console.log('Modal no cerrado: hay errores pendientes');
    return false;
  }

  // Limpiar flag de error
  window.modalHasError = false;

  // Llamar a closeModal original si existe
  if (typeof window.originalCloseModal === 'function') {
    window.originalCloseModal(modalId);
  } else if (typeof closeModal === 'function') {
    closeModal(modalId);
  } else {
    // Fallback: ocultar modal directamente
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  return true;
}

/**
 * Resetea el estado de error del modal
 */
function resetModalError() {
  window.modalHasError = false;

  // Limpiar todos los mensajes de error visibles
  document.querySelectorAll('.field-error-message').forEach(el => {
    el.style.display = 'none';
  });

  // Limpiar estilos de error de campos
  document.querySelectorAll('.field-error').forEach(el => {
    el.classList.remove('field-error');
    el.style.borderColor = '';
    el.style.boxShadow = '';
  });
}

/**
 * Obtiene todos los mensajes de error disponibles
 * @returns {object} - Diccionario de mensajes
 */
function getErrorMessages() {
  return currentLanguage === 'pt' ? ERROR_MESSAGES_PT : ERROR_MESSAGES;
}

/**
 * Agrega un nuevo mensaje de error al diccionario
 * @param {string} code - Codigo del error
 * @param {string} message - Mensaje en espanol
 * @param {string} messagePt - Mensaje en portugues (opcional)
 */
function addErrorMessage(code, message, messagePt = null) {
  ERROR_MESSAGES[code] = message;
  if (messagePt) {
    ERROR_MESSAGES_PT[code] = messagePt;
  }
}

// Inicializar: interceptar closeModal si existe
document.addEventListener('DOMContentLoaded', function() {
  // Guardar referencia al closeModal original
  if (typeof window.closeModal === 'function' && !window.originalCloseModal) {
    window.originalCloseModal = window.closeModal;

    // Reemplazar con version segura
    window.closeModal = function(modalId) {
      // Si hay error, mostrar mensaje y no cerrar
      if (window.modalHasError) {
        console.log('Por favor corrige los errores antes de cerrar');
        return;
      }
      window.originalCloseModal(modalId);
    };
  }

  console.log('Error-messages.js inicializado');
});

// Exportar funciones para uso global
window.translateError = translateError;
window.showFieldError = showFieldError;
window.clearFieldErrorMessage = clearFieldErrorMessage;
window.showErrorAlert = showErrorAlert;
window.safeCloseModal = safeCloseModal;
window.resetModalError = resetModalError;
window.setErrorLanguage = setErrorLanguage;
window.getErrorMessages = getErrorMessages;
window.addErrorMessage = addErrorMessage;
window.ERROR_MESSAGES = ERROR_MESSAGES;
window.ERROR_MESSAGES_PT = ERROR_MESSAGES_PT;
