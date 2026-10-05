import {useSyncStatus} from "@terreno/syncdb/react";
import {useEffect, useState, useSyncExternalStore} from "react";
import {getSyncDbReadySnapshot, subscribeSyncDbReady} from "@/store/syncdb";

export const useSyncLoaded = (): boolean => {
  const syncReady = useSyncExternalStore(
    subscribeSyncDbReady,
    getSyncDbReadySnapshot,
    getSyncDbReadySnapshot
  );
  const {isSyncing} = useSyncStatus();
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (!syncReady) {
      setLoaded(false);
    } else if (!isSyncing) {
      setLoaded(true);
    }
  }, [isSyncing, syncReady]);

  return loaded;
};
