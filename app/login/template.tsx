/**
 * @file app/login/template.tsx
 * @description Template component for login page transitions
 * @created 2025-01-01
 */

import React from 'react';

export default function LoginTemplate({ children }: { children: React.ReactNode }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {children}
        </div>
    );
}
