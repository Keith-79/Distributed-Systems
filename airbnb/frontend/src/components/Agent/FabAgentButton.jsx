import React, { useState } from 'react';

export default function FabAgentButton(){
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={()=>setOpen(true)} className="fixed bottom-6 right-6 rounded-full text-white text-sm font-semibold shadow-floating px-4 py-3" style={{ background:'#FF385C' }}>Agent AI</button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setOpen(false)} />
          <div className="absolute bottom-6 right-6 bg-white rounded-2xl shadow-floating p-4 w-[360px]">
            <div className="font-semibold mb-2">Agent AI</div>
            <div className="text-sm text-gray-600">This is a stub panel. Hook up your agent here.</div>
            <div className="mt-3 text-right"><button className="px-3 py-1 rounded-full border" onClick={()=>setOpen(false)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}


