import { useCallback, useState } from 'react';
import { favouritesApi } from '../api/favourites';

export default function useFavourite(initial = false){
  const [isFav, setIsFav] = useState(!!initial);
  const toggle = useCallback(async (propertyId) => {
    const prev = isFav; setIsFav(!isFav);
    try { await favouritesApi.toggle(propertyId); } catch { setIsFav(prev); }
  }, [isFav]);
  return { isFav, toggle };
}

import { useState, useCallback } from "react";
import * as FavModule from "../api/favourites"; // <-- new file name
import { useToast } from "../components/Toast";

const favouritesApi = FavModule?.favouritesApi;

export function useFavourite(initial, propertyId) {
  // Assert at runtime so we see what’s wrong if import breaks
  if (!favouritesApi || typeof favouritesApi.toggle !== "function") {
    // eslint-disable-next-line no-console
    console.error("[useFavourite] favouritesApi not available. Imported module:", FavModule);
    throw new Error("favouritesApi.toggle is undefined — check ../api/favourites.api import");
  }

  const [isFav, setIsFav] = useState(!!initial);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  const toggle = useCallback(async () => {
    if (busy || !propertyId) return;
    setBusy(true);
    const prev = isFav;
    try {
      // optimistic update
      setIsFav(v => !v);
      const { nowFavourited } = await favouritesApi.toggle(propertyId);
      setIsFav(!!nowFavourited);
      show(nowFavourited ? 'Added to favorites' : 'Removed from favorites', { type: 'success' });
    } catch (e) {
      setIsFav(prev);
      if (e?.status === 401) {
        show('Please log in to save favorites', { type: 'error' });
        try {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.assign(`/login?next=${next}`);
        } catch (_) {}
      } else {
        show(e?.message || 'Failed to update favorites', { type: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, propertyId, isFav, show]);

  return { isFav, toggle, busy };
}
