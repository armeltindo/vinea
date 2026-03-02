import { createContext, useContext } from 'react';

interface PermissionsContextType {
  canDelete: (module: string) => boolean;
  canWrite: (module: string) => boolean;
}

export const PermissionsContext = createContext<PermissionsContextType>({
  canDelete: () => true,
  canWrite: () => true,
});

export const usePermissions = () => useContext(PermissionsContext);
