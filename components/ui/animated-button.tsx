import React from 'react';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    hoverColor?: string;
}

export const AnimatedButton = ({ children, variant = 'primary', className = "", hoverColor = "bg-[#FF4D00]", ...props }: AnimatedButtonProps) => {
    let baseStyles = "relative overflow-hidden w-full px-8 py-4 font-mono font-bold uppercase text-xs tracking-widest transition-all duration-300 group shadow-sm hover:shadow-md flex items-center justify-center";
    let variantStyles = "";
    let defaultHover = hoverColor;

    switch (variant) {
        case 'primary':
            variantStyles = "bg-black text-white border-none";
            // If it's a "Create Account" black button, we might want orange hover.
            // But default primary is black -> orange hover usually? 
            // In landing page: Text is white. Hover color is passed as prop. 
            // Let's stick to the logic:
            // Default hoverColor prop is #FF4D00.
            break;
        case 'secondary':
            variantStyles = "bg-white text-black border border-gray-200 shadow-sm";
            break;
        case 'outline':
            variantStyles = "border border-white/30 text-white";
            defaultHover = "bg-white";
            break;
        case 'ghost':
            variantStyles = "bg-transparent text-gray-600 border border-gray-200";
            break;
    }

    // Special override logic from login form if needed, but better to use props.
    // We will trust the passed className and props.

    return (
        <button className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
            <span className={`relative z-20 flex items-center justify-center gap-2 w-full h-full group-hover:text-white transition-colors duration-300 ${variant === 'outline' ? 'group-hover:text-black' : ''}`}>
                {children}
            </span>
            <div className={`absolute inset-0 ${defaultHover} translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10`}></div>
        </button>
    );
};
