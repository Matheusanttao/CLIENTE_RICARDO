import { BrandMark } from '@/components/brand/BrandMark'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ConfigMissing() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <BrandMark />
          <CardTitle className="mt-4">Ambiente não conectado</CardTitle>
          <CardDescription>
            Defina <code className="text-xs">VITE_SUPABASE_URL</code> e{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> no arquivo{' '}
            <code className="text-xs">.env</code> (veja <code className="text-xs">.env.example</code>
            ). As migrations e o código já estão prontos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Consulte <code>docs/SUPABASE_SETUP.md</code> e <code>docs/BOOTSTRAP_ADMIN.md</code>.
        </CardContent>
      </Card>
    </div>
  )
}
