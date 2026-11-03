import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImageOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { MUSCLE_GROUPS } from '@/lib/constants'
import { exerciseImageUrl, removeExerciseImage, uploadExerciseImage } from '@/lib/exerciseImages'
import { requireSupabase } from '@/lib/supabase/client'
import type { MuscleGroup } from '@/types/database'

const emptyForm = {
  name: '',
  muscle_group: 'other' as MuscleGroup,
  equipment: '',
  level: '' as '' | 'beginner' | 'intermediate' | 'advanced',
  instructions: '',
  common_mistakes: '',
  notes: '',
  video_url: '',
  image_path: null as string | null,
}

export function ExercisesPage() {
  const { staffMembership } = useAuth()
  const orgId = staffMembership?.organization_id
  const qc = useQueryClient()
  const [filter, setFilter] = useState<string>('all')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  // foto nova escolhida (ainda não enviada) ou remoção da atual
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const shownImage = previewUrl ?? (removeImage ? null : exerciseImageUrl(form.image_path))

  function openDialog(id: string | null, values: typeof emptyForm) {
    setEditingId(id)
    setForm(values)
    setImageFile(null)
    setRemoveImage(false)
    setOpen(true)
  }

  const exercises = useQuery({
    queryKey: ['personal', 'exercises', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('exercises')
        .select('*')
        .eq('organization_id', orgId!)
        .order('name')
      if (error) throw error
      return data
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const sb = requireSupabase()
      const oldPath = form.image_path
      let imagePath = removeImage ? null : oldPath
      if (imageFile) imagePath = await uploadExerciseImage(orgId!, imageFile)
      const payload = {
        organization_id: orgId!,
        name: form.name,
        muscle_group: form.muscle_group,
        equipment: form.equipment || null,
        level: form.level || null,
        instructions: form.instructions || null,
        common_mistakes: form.common_mistakes || null,
        notes: form.notes || null,
        video_url: form.video_url || null,
        image_path: imagePath,
      }
      if (editingId) {
        const { error } = await sb.from('exercises').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await sb.from('exercises').insert(payload)
        if (error) throw error
      }
      // A foto antiga só é apagada se nenhum treino já prescrito usa essa cópia
      if (oldPath && oldPath !== imagePath) {
        const { count } = await sb
          .from('workout_exercises')
          .select('id', { count: 'exact', head: true })
          .eq('exercise_image_path', oldPath)
        if (!count) await removeExerciseImage(oldPath).catch(() => undefined)
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Exercício atualizado' : 'Exercício criado')
      setOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      setImageFile(null)
      setRemoveImage(false)
      qc.invalidateQueries({ queryKey: ['personal', 'exercises'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filtered = useMemo(() => {
    return (exercises.data || []).filter((e) => filter === 'all' || e.muscle_group === filter)
  }, [exercises.data, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Exercícios</h1>
          <p className="text-sm text-muted-foreground">Biblioteca da organização. Sem vídeos externos inventados.</p>
        </div>
        <Button
          onClick={() => openDialog(null, emptyForm)}
        >
          Novo exercício
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          Todos
        </Button>
        {MUSCLE_GROUPS.map((g) => (
          <Button
            key={g.value}
            size="sm"
            variant={filter === g.value ? 'default' : 'outline'}
            onClick={() => setFilter(g.value)}
          >
            {g.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum exercício" actionLabel="Criar" onAction={() => openDialog(null, emptyForm)} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <li key={e.id}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {e.image_path ? (
                      <img
                        src={exerciseImageUrl(e.image_path) ?? undefined}
                        alt=""
                        loading="lazy"
                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <ImageOff className="h-5 w-5" aria-hidden />
                      </div>
                    )}
                    <div>
                    <p className="font-medium">{e.name}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {MUSCLE_GROUPS.find((m) => m.value === e.muscle_group)?.label}
                      </Badge>
                      {e.equipment && <Badge variant="outline">{e.equipment}</Badge>}
                      {!e.image_path && <Badge variant="outline">Sem foto</Badge>}
                    </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      openDialog(e.id, {
                        name: e.name,
                        muscle_group: e.muscle_group,
                        equipment: e.equipment || '',
                        level: e.level || '',
                        instructions: e.instructions || '',
                        common_mistakes: e.common_mistakes || '',
                        notes: e.notes || '',
                        video_url: e.video_url || '',
                        image_path: e.image_path,
                      })
                    }
                  >
                    Editar
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar exercício' : 'Novo exercício'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nome">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Foto do exercício">
              <div className="flex items-center gap-3">
                {shownImage ? (
                  <img src={shownImage} alt="Prévia da foto" className="h-24 w-24 rounded-md object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                    <Camera className="h-6 w-6" aria-hidden />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-4 w-4" aria-hidden />
                    {shownImage ? 'Trocar foto' : 'Adicionar foto'}
                  </Button>
                  {shownImage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setImageFile(null)
                        setRemoveImage(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Remover
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(ev) => {
                    const file = ev.target.files?.[0]
                    ev.target.value = ''
                    if (!file) return
                    setImageFile(file)
                    setRemoveImage(false)
                  }}
                />
              </div>
            </Field>
            <Field label="Grupo muscular">
              <select
                className="h-11 w-full rounded-md border border-border bg-card px-3"
                value={form.muscle_group}
                onChange={(e) => setForm((f) => ({ ...f, muscle_group: e.target.value as MuscleGroup }))}
              >
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Equipamento">
              <Input value={form.equipment} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))} />
            </Field>
            <Field label="Instruções">
              <Textarea value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
            </Field>
            <Field label="Erros comuns">
              <Textarea value={form.common_mistakes} onChange={(e) => setForm((f) => ({ ...f, common_mistakes: e.target.value }))} />
            </Field>
            <Field label="URL de vídeo (opcional, apenas se autorizada)">
              <Input value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} />
            </Field>
            <Button className="w-full" disabled={!form.name || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
