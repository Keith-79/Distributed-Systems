import { useEffect, useState } from "react";
export default function useFetch(fn, deps = []) {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fn().then(d => { if(active){ setData(d); setError(null); }})
         .catch(e => { if(active){ setError(e); }})
         .finally(() => { if(active){ setLoading(false); }});
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}
