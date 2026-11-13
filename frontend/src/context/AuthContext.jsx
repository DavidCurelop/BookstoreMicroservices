import { useQuery, useQueryClient } from "@tanstack/react-query";

import { authKeys, orderKeys } from "../lib/queryKeys.js";
import { authService } from "../services/authService.js";
import { AuthContext } from "./contexts.js";

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const { data: user = null, isPending } = useQuery({
    queryKey: authKeys.currentUser,
    queryFn: authService.getCurrentUser,
    staleTime: Infinity,
  });

  // Orders belong to a customer: never let them leak across sessions.
  const setSessionUser = (nextUser) => {
    queryClient.removeQueries({ queryKey: orderKeys.all });
    queryClient.setQueryData(authKeys.currentUser, nextUser);
  };

  const login = async (email) => {
    const loggedUser = await authService.login(email);
    setSessionUser(loggedUser);
    return loggedUser;
  };

  const logout = async () => {
    await authService.logout();
    setSessionUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading: isPending,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
