import { requireSupabase } from '@/lib/supabase/client'

export const EXERCISE_IMAGES_BUCKET = 'exercise-images'
const MAX_SIDE = 1000
const QUALITY = 0.75

/** URL pública da foto do exercício (bucket público). */
export function exerciseImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return requireSupabase().storage.from(EXERCISE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Reduz a foto (máx. 1000px, WebP/JPEG) para economizar dados do aluno. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a imagem')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))
  const blob = (await toBlob('image/webp')) ?? (await toBlob('image/jpeg'))
  if (!blob) throw new Error('Não foi possível processar a imagem')
  return blob
}

/** Envia a foto e devolve o caminho salvo em `exercises.image_path`. */
export async function uploadExerciseImage(orgId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem')
  const blob = await compressImage(file)
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`
  const { error } = await requireSupabase()
    .storage.from(EXERCISE_IMAGES_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (error) throw new Error(`Falha ao enviar a foto: ${error.message}`)
  return path
}

/** Apaga uma foto antiga (falha silenciosa: não deve travar o salvamento). */
export async function removeExerciseImage(path: string | null | undefined): Promise<void> {
  if (!path) return
  await requireSupabase().storage.from(EXERCISE_IMAGES_BUCKET).remove([path])
}
