import Swal from 'sweetalert2';

export const showAlert = (title, text, icon = 'info') => {
  return Swal.fire({
    title,
    text: typeof text === 'string' ? text : JSON.stringify(text),
    icon,
    confirmButtonColor: '#2563eb',
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'rounded-xl shadow-2xl font-sans',
      title: 'text-slate-800 font-bold',
      htmlContainer: 'text-slate-600',
    }
  });
};

export const showErrorAlert = (text) => showAlert('Error', text, 'error');
export const showSuccessAlert = (text) => showAlert('Éxito', text, 'success');
export const showWarningAlert = (text) => showAlert('Atención', text, 'warning');

export const showConfirmAlert = async (title, text) => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#ef4444',
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar',
    customClass: {
      popup: 'rounded-xl shadow-2xl font-sans',
      title: 'text-slate-800 font-bold',
      htmlContainer: 'text-slate-600',
    }
  });
  return result.isConfirmed;
};
