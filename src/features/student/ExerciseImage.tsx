import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { exerciseImageUrl } from '@/lib/exerciseImages'

/** Miniatura na lista do treino; toque abre a foto grande. */
export function ExerciseThumb({ path, name }: { path: string | null | undefined; name: string }) {
  const [open, setOpen] = useState(false)
  const url = exerciseImageUrl(path)
  if (!url) return null
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Ver foto de ${name}`} className="shrink-0">
        <img src={url} alt="" loading="lazy" className="h-12 w-12 rounded-md object-cover" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          <img src={url} alt={`Execução: ${name}`} className="w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Foto grande no treino em andamento. */
export function ExercisePhoto({ path, name }: { path: string | null | undefined; name: string }) {
  const url = exerciseImageUrl(path)
  if (!url) return null
  return (
    <img
      src={url}
      alt={`Execução: ${name}`}
      loading="lazy"
      className="max-h-72 w-full rounded-lg bg-muted object-contain"
    />
  )
}
