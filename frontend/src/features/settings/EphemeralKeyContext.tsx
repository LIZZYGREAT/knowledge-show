import { createContext, useContext, useState, type ReactNode } from "react";
type Connection = {
  key: string;
  connected: boolean;
  setConnection: (key: string, connected: boolean) => void;
};
const Context = createContext<Connection | null>(null);
export function EphemeralKeyProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState({ key: "", connected: false });
  return (
    <Context.Provider
      value={{
        ...connection,
        setConnection: (key, connected) => setConnection({ key, connected }),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useEphemeralKey() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing key provider");
  return value;
}
