import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { ANAMNESIS_STATUS_LABEL } from '@/features/shared/statusLabels'
import { ANAMNESIS_FORM_VERSION } from '@/lib/constants'
import { isOnline, OFFLINE_SAVE_MESSAGE } from '@/lib/offline'
import { requireSupabase } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

const formSchema = z.object({
  health_conditions: z.string().optional(),
  medications: z.string().optional(),
  injuries: z.string().optional(),
  surgeries: z.string().optional(),
  pain_areas: z.string().optional(),
  sleep_hours: z.string().optional(),
  water_liters: z.string().optional(),
  alcohol: z.string().optional(),
  smoking: z.string().optional(),
  stress_level: z.string().optional(),
  sports_background: z.string().optional(),
  current_activity: z.string().optional(),
  truthfulness_declared: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const STEPS = [
  { key: 'health', title: 'Saúde', fields: ['health_conditions', 'medications', 'injuries', 'surgeries', 'pain_areas'] as const },
  { key: 'habits', title: 'Hábitos', fields: ['sleep_hours', 'water_liters', 'alcohol', 'smoking', 'stress_level'] as const },
  { key: 'sports', title: 'Esporte', fields: ['sports_background', 'current_activity'] as const },
  { key: 'declaration', title: 'Declaração', fields: ['truthfulness_declared'] as const },
]

function valuesToJson(values: FormValues) {
  return {
    health_history: {
      conditions: values.health_conditions ?? '',
      medications: values.medications ?? '',
      injuries: values.injuries ?? '',
      surgeries: values.surgeries ?? '',
      pain_areas: values.pain_areas ?? '',
    },
    habits: {
      sleep_hours: values.sleep_hours ?? '',
      water_liters: values.water_liters ?? '',
      alcohol: values.alcohol ?? '',
      smoking: values.smoking ?? '',
      stress_level: values.stress_level ?? '',
    },
    sports_history: {
      background: values.sports_background ?? '',
      current_activity: values.current_activity ?? '',
    },
  }
}

function jsonToValues(record: {
  health_history: Json
  habits: Json
  sports_history: Json
  truthfulness_declared: boolean
}): FormValues {
  const h = (record.health_history ?? {}) as Record<string, string>
  const hb = (record.habits ?? {}) as Record<string, string>
  const s = (record.sports_history ?? {}) as Record<string, string>
  return {
    health_conditions: h.conditions ?? '',
    medications: h.medications ?? '',
    injuries: h.injuries ?? '',
    surgeries: h.surgeries ?? '',
    pain_areas: h.pain_areas ?? '',
    sleep_hours: hb.sleep_hours ?? '',
    water_liters: hb.water_liters ?? '',
    alcohol: hb.alcohol ?? '',
    smoking: hb.smoking ?? '',
    stress_level: hb.stress_level ?? '',
    sports_background: s.background ?? '',
    current_activity: s.current_activity ?? '',
    truthfulness_declared: record.truthfulness_declared,
  }
}

export function AnamnesisPage() {
  const { activeStudent, user } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recordQuery = useQuery({
    queryKey: ['student', 'anamnesis', activeStudent?.id],
    enabled: Boolean(activeStudent?.id),
    queryFn: async () => {
      const sb = requireSupabase()
      const { data, error } = await sb
        .from('anamnesis_records')
        .select('*')
        .eq('student_id', activeStudent!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      truthfulness_declared: false,
    },
  })

  useEffect(() => {
    if (recordQuery.data) {
      form.reset(jsonToValues(recordQuery.data))
    }
  }, [recordQuery.data, form])

  const readOnly =
    recordQuery.data != null &&
    !['draft', 'submitted'].includes(recordQuery.data.status)

  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!isOnline()) throw new Error(OFFLINE_SAVE_MESSAGE)
      if (!activeStudent || !user) throw new Error('Sessão inválida')
      const values = form.getValues()
      if (submit && !values.truthfulness_declared) {
        throw new Error('Marque a declaração de veracidade para enviar.')
      }
      const sb = requireSupabase()
      const payload = valuesToJson(values)
      const base = {
        organization_id: activeStudent.organization_id,
        student_id: activeStudent.id,
        form_version: ANAMNESIS_FORM_VERSION,
        health_history: payload.health_history as Json,
        habits: payload.habits as Json,
        sports_history: payload.sports_history as Json,
        truthfulness_declared: submit ? values.truthfulness_declared : recordQuery.data?.truthfulness_declared ?? false,
        declared_at: submit && values.truthfulness_declared ? new Date().toISOString() : recordQuery.data?.declared_at ?? null,
        declared_by: submit ? user.id : recordQuery.data?.declared_by ?? null,
        status: submit ? ('submitted' as const) : ('draft' as const),
      }

      if (recordQuery.data?.id && ['draft', 'submitted'].includes(recordQuery.data.status)) {
        const { error } = await sb.from('anamnesis_records').update(base).eq('id', recordQuery.data.id)
        if (error) throw error
        return
      }

      const { error } = await sb.from('anamnesis_records').insert(base)
      if (error) throw error
    },
    onSuccess: (_d, submit) => {
      setError(null)
      setMessage(submit ? 'Anamnese enviada para revisão.' : 'Rascunho salvo.')
      queryClient.invalidateQueries({ queryKey: ['student', 'anamnesis'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Falha ao salvar'),
  })

  if (!activeStudent) {
    return <EmptyState title="Sem vínculo" description="Cadastro de aluno necessário." />
  }

  if (recordQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando anamnese…</p>
  }

  const status = recordQuery.data?.status

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Anamnese</h1>
        <p className="text-sm text-muted-foreground">Informações de saúde e hábitos para orientar seu treino.</p>
        {status && (
          <Badge className="mt-2" variant="secondary">
            {ANAMNESIS_STATUS_LABEL[status]}
          </Badge>
        )}
      </div>

      {readOnly && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Esta anamnese está em revisão ou já foi analisada. Entre em contato com seu personal para alterações.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Etapa {step + 1} de {STEPS.length}: {STEPS[step]!.title}
          </CardTitle>
          <CardDescription>Preencha com sinceridade. Você pode salvar rascunho a qualquer momento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <Field label="Condições de saúde / diagnósticos" name="health_conditions" form={form} disabled={readOnly} />
              <Field label="Medicamentos em uso" name="medications" form={form} disabled={readOnly} />
              <Field label="Lesões atuais ou recentes" name="injuries" form={form} disabled={readOnly} multiline />
              <Field label="Cirurgias relevantes" name="surgeries" form={form} disabled={readOnly} multiline />
              <Field label="Dores ou desconfortos frequentes" name="pain_areas" form={form} disabled={readOnly} multiline />
            </>
          )}
          {step === 1 && (
            <>
              <Field label="Horas de sono (média)" name="sleep_hours" form={form} disabled={readOnly} />
              <Field label="Água (litros/dia)" name="water_liters" form={form} disabled={readOnly} />
              <Field label="Álcool" name="alcohol" form={form} disabled={readOnly} />
              <Field label="Tabagismo" name="smoking" form={form} disabled={readOnly} />
              <Field label="Nível de estresse (1–10 ou descrição)" name="stress_level" form={form} disabled={readOnly} />
            </>
          )}
          {step === 2 && (
            <>
              <Field label="Histórico esportivo" name="sports_background" form={form} disabled={readOnly} multiline />
              <Field label="Atividade física atual" name="current_activity" form={form} disabled={readOnly} multiline />
            </>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm">
                Declaro que as informações prestadas são verdadeiras e completas, na medida do meu conhecimento.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="truth"
                  checked={form.watch('truthfulness_declared')}
                  disabled={readOnly}
                  onCheckedChange={(v) => form.setValue('truthfulness_declared', v === true)}
                />
                <Label htmlFor="truth" className="text-sm leading-snug">
                  Li e concordo com a declaração de veracidade
                </Label>
              </div>
            </div>
          )}

          {message && <p className="text-sm text-foreground">{message}</p>}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                Próxima etapa
              </Button>
            ) : null}
            {!readOnly && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(false)}
                >
                  Salvar rascunho
                </Button>
                {step === STEPS.length - 1 && (
                  <Button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate(true)}
                  >
                    Enviar anamnese
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  name,
  form,
  disabled,
  multiline,
}: {
  label: string
  name: keyof FormValues
  form: ReturnType<typeof useForm<FormValues>>
  disabled?: boolean
  multiline?: boolean
}) {
  const reg = form.register(name)
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea {...reg} disabled={disabled} rows={3} />
      ) : (
        <Input {...reg} disabled={disabled} />
      )}
    </div>
  )
}
