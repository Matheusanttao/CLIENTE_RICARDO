import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <BrandMark />
          <CardTitle className="mt-4">Página não encontrada</CardTitle>
          <CardDescription>
            O endereço que você acessou não existe ou foi alterado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/">Ir para o site</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/aluno">Área do aluno</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
