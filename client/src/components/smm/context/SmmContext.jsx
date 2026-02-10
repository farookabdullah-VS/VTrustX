import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * SMM Context
 * Manages global state for the SMM module:
 * - Current Tenant (Org/Brand)
 * - User Permissions
 * - Global Settings
 */

const SmmContext = createContext();

export function SmmProvider({ children }) {
    const [context, setContext] = useState({
        org: { id: 'default', name: 'Default Org' },
        brand: { id: 'default', name: 'Default Brand' },
        user: { id: 'current', name: 'Admin User', role: 'admin' },
        loading: false
    });

    // In a real app, we would fetch permissions/brands here
    // useEffect(() => { ... }, []);

    const switchBrand = (brandId, brandName) => {
        setContext(prev => ({
            ...prev,
            brand: { id: brandId, name: brandName }
        }));
    };

    return (
        <SmmContext.Provider value={{ ...context, switchBrand }}>
            {children}
        </SmmContext.Provider>
    );
}

export const useSmmContext = () => useContext(SmmContext);
