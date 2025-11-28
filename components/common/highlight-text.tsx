import React, { useMemo } from 'react';

interface HighlightTextProps {
    text: string;
    highlight?: string;
    className?: string;
}

/**
 * Component to highlight search terms within text
 * Renders text with matched parts wrapped in a highlight span
 */
export function HighlightText({ text, highlight, className }: HighlightTextProps) {
    const parts = useMemo(() => {
        if (!highlight || !highlight.trim()) {
            return [{ text, isHighlight: false }];
        }

        const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const splitParts = text.split(regex);

        return splitParts.filter(part => part).map(part => ({
            text: part,
            isHighlight: regex.test(part)
        }));
    }, [text, highlight]);

    if (!highlight || !highlight.trim()) {
        return <span className={className}>{text}</span>;
    }

    return (
        <span className={className}>
            {parts.map((part, i) => (
                part.isHighlight ? (
                    <span key={i} className="bg-yellow-200 dark:bg-yellow-400/25 text-foreground dark:text-yellow-50 dark:font-medium rounded-[2px] px-0.5 -mx-0.5">
                        {part.text}
                    </span>
                ) : (
                    <span key={i}>{part.text}</span>
                )
            ))}
        </span>
    );
}
