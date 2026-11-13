import { createContext } from "react";

// Context objects live apart from their providers so that provider files
// only export components (required by React Fast Refresh).
export const AuthContext = createContext(null);
export const CartContext = createContext(null);
