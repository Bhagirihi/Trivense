import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";

const NetworkContext = createContext({
  isConnected: true,
  isInternetReachable: true,
  refresh: async () => {},
});

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  const applyState = useCallback((state) => {
    setIsConnected(state.isConnected !== false);
    setIsInternetReachable(state.isInternetReachable !== false);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(applyState);
    NetInfo.fetch().then(applyState).catch(() => {});
    return () => unsubscribe();
  }, [applyState]);

  const refresh = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      applyState(state);
      return state;
    } catch {
      return null;
    }
  }, [applyState]);

  const value = useMemo(
    () => ({
      isConnected,
      isInternetReachable,
      isOffline: !isConnected || isInternetReachable === false,
      refresh,
    }),
    [isConnected, isInternetReachable, refresh]
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
