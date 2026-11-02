import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

export function Modal({ open, onClose, title, description, children, footer, size, labelledBy }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function key(event) {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
      }
      if (event.key === "Tab" && ref.current) {
        const items = ref.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])')
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", key, true)
    const timer = setTimeout(() => {
      if (!ref.current) return
      const target = ref.current.querySelector("[data-autofocus]") || ref.current.querySelector("input, textarea, select")
      if (target) target.focus()
    }, 60)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("keydown", key, true)
      document.body.style.overflow = overflow
      if (previous && previous.focus) previous.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="modal-root" role="presentation">
      <div className="modal-backdrop" onMouseDown={onClose} />
      <div ref={ref} className={"modal " + (size || "md")} role="dialog" aria-modal="true" aria-labelledby={labelledBy || "modal-title"}>
        <button type="button" className="modal-close icon-btn" aria-label="Close" onClick={onClose}><X size={17} /></button>
        {title && <h2 id={labelledBy || "modal-title"} className="modal-title">{title}</h2>}
        {description && <p className="modal-desc">{description}</p>}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({ options: options, resolve: resolve })
    })
  }, [])

  function close(result) {
    if (state) state.resolve(result)
    setState(null)
  }

  const options = state ? state.options : {}
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        onClose={() => close(false)}
        size="sm"
        title={options.title || "Are you sure?"}
        description={options.text}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => close(false)}>{options.cancelLabel || "Cancel"}</button>
            <button type="button" data-autofocus className={"btn " + (options.danger ? "btn-danger" : "btn-primary")} onClick={() => close(true)}>{options.confirmLabel || "Confirm"}</button>
          </>
        }
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
