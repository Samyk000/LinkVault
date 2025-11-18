"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { TOAST_DURATION } from "@/constants"

/**
* Renders a toast notification provider along with all active toasts.
* @example
* Toaster()
* <ToastProvider>…</ToastProvider>
* @returns {{JSX.Element}} The rendered toaster component.
**/
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right" duration={TOAST_DURATION}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action && <div className="flex-shrink-0">{action}</div>}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
