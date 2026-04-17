import { useEffect, useState } from 'react'

/** URL temporária para pré-visualizar um `File`; revogada ao desmontar ou trocar o ficheiro. */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}
