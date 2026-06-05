"use client"

import { useState, useRef, useEffect } from "react"
import { COUNTRIES, codeToFlag } from "@/lib/countries"
import { ChevronDown, Search } from "lucide-react"

interface Props {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  className?: string
}

export function CountrySelect({ value, onChange, placeholder = "Select your country", className = "" }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : COUNTRIES

  const selected = COUNTRIES.find((c) => c.code === value)

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 10)
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? `${codeToFlag(selected.code)} ${selected.name}` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); setQuery("") }}
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 transition-colors"
              >
                Clear selection
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No countries found</p>
            )}
            {filtered.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => { onChange(country.code); setOpen(false); setQuery("") }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  country.code === value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-secondary/60"
                }`}
              >
                <span>{codeToFlag(country.code)}</span>
                <span>{country.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
