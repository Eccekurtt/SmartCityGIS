import { useEffect, useState } from 'react'

// Değer değiştikçe her tuşta istek atmamak için, değişim durulunca güncellenen kopya döndürür.
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
