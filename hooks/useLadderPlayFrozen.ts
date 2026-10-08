import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { isLadderMatchPlayFrozen } from "@shared/helpers";
import { db } from "../services/firebase.config";

export const useLadderPlayFrozen = (ladderId: string | undefined): boolean => {
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    if (!ladderId) {
      setFrozen(false);
      return;
    }
    let active = true;
    getDoc(doc(db, "ladders", ladderId))
      .then((snap) => {
        if (active) setFrozen(isLadderMatchPlayFrozen(snap.data()?.status));
      })
      .catch(() => {
        if (active) setFrozen(false);
      });
    return () => {
      active = false;
    };
  }, [ladderId]);

  return frozen;
};
