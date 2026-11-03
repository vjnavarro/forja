import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { formatNumber, isValidWeight } from '../progress';

export function WeightDialog({ current, onClose, onSave }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const [value, setValue] = useState(formatNumber(current));
  const [error, setError] = useState('');
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const element = dialog.current;
    document.body.style.overflow = 'hidden';
    element.showModal();
    input.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  function submit(event) {
    event.preventDefault();
    const kg = Number(value.trim().replace(',', '.'));
    if (!isValidWeight(kg) || !/^\d+(?:[.,]\d)?$/.test(value.trim())) {
      setError('Introduce un peso ficticio entre 30 y 250 kg, con un máximo de un decimal.');
      return;
    }
    onSave(kg);
  }
  return (
    <dialog
      ref={dialog}
      className="weight-dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="section-head">
          <span className="eyebrow">REGISTRO DE DEMOSTRACIÓN</span>
          <button className="icon-button" aria-label="Cerrar registro" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <h2 id="dialog-title">Un paso más en tu historia.</h2>
        <p id="dialog-description">
          Añade un peso inventado para explorar la gráfica. Usa solo datos ficticios.
        </p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="demo-weight">Peso de demostración</label>
          <div className="weight-input">
            <input
              ref={input}
              id="demo-weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              maxLength={7}
              autoFocus
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError('');
              }}
              aria-invalid={!!error}
              aria-describedby={error ? 'weight-error' : 'weight-hint'}
            />
            <span>kg</span>
          </div>
          <p id="weight-hint" className="input-hint">
            De 30 a 250 kg · Se admite coma o punto decimal.
          </p>
          {error && (
            <p id="weight-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" type="submit">
            <Plus size={17} />
            Añadir registro demo
          </button>
          <button className="dialog-cancel" type="button" onClick={onClose}>
            Cancelar
          </button>
        </form>
      </div>
    </dialog>
  );
}
