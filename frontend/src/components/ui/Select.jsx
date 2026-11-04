import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

export default function Select({ value, onChange, options, id, placeholder, className }) {
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(-1)
  const [place, setPlace] = useState(null)
  const ref = useRef(null)
  const menuRef = useRef(null)
  const selected = options.find((item) => item.value === value)

  useEffect(() => {
    if (!open) return undefined
    function click(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    function close() {
      setOpen(false)
    }
    function scrolled(event) {
      if (menuRef.current && menuRef.current.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", click)
    window.addEventListener("resize", close)
    window.addEventListener("scroll", scrolled, true)
    return () => {
      document.removeEventListener("mousedown", click)
      window.removeEventListener("resize", close)
      window.removeEventListener("scroll", scrolled, true)
    }
  }, [open])

  function openMenu() {
    const index = options.findIndex((item) => item.value === value)
    setFocus(index >= 0 ? index : 0)
    if (ref.current) {
      const box = ref.current.getBoundingClientRect()
      const below = window.innerHeight - box.bottom
      const height = Math.min(280, options.length * 40 + 12)
      const top = below < height + 12 && box.top > below ? box.top - height - 6 : box.bottom + 6
      setPlace({ top: top, left: box.left, width: box.width })
    }
    setOpen(true)
  }

  function choose(item) {
    onChange(item.value)
    setOpen(false)
  }

  function key(event) {
    if (event.key === "Escape") {
      setOpen(false)
      return
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      const step = event.key === "ArrowDown" ? 1 : -1
      setFocus((focus + step + options.length) % options.length)
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (!open) openMenu()
      else if (focus >= 0) choose(options[focus])
    }
  }

  return (
    <div className={"dd" + (className ? " " + className : "")} ref={ref}>
      <button type="button" id={id} className="dd-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => (open ? setOpen(false) : openMenu())} onKeyDown={key}>
        <span className={selected ? "" : "dd-placeholder"}>{selected ? selected.label : placeholder || "Select"}</span>
        <ChevronDown size={16} className="dd-chevron" />
      </button>
      {open && (
        <div className="dd-menu" ref={menuRef} role="listbox" style={place ? { top: place.top, left: place.left, minWidth: place.width } : undefined}>
          {options.map((item, index) => (
            <button key={String(item.value)} type="button" role="option" aria-selected={item.value === value} className={"dd-opt" + (item.value === value ? " selected" : "") + (index === focus ? " focus" : "")} onMouseEnter={() => setFocus(index)} onClick={() => choose(item)}>
              <span>{item.label}</span>
              {item.value === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
