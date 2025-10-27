import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);

  const remove = useCallback((id)=> setToasts(ts => ts.filter(t=>t.id!==id)), []);
  const show = useCallback((msg, type='info', timeout=2500)=>{
    const id = idRef.current++;
    setToasts(ts => [...ts, { id, msg, type }]);
    window.setTimeout(()=>remove(id), timeout);
  }, [remove]);

  const api = useMemo(()=>({
    success: (m, t) => show(m, 'success', t),
    error: (m, t) => show(m, 'error', t),
    info: (m, t) => show(m, 'info', t),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t=> (
          <div key={t.id} className={`rounded-lg px-3 py-2 text-white shadow-card ${t.type==='success'?'bg-emerald-600':t.type==='error'?'bg-red-600':'bg-gray-900'}`}>{t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(){
  return useContext(ToastContext);
}


