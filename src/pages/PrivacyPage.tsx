import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/brand/BrandMark'

const CONTACT_EMAIL = 'ricardonevespersonal82@gmail.com'
const UPDATED_AT = '2 de novembro de 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

/** Política de Privacidade (LGPD — Lei 13.709/2018). */
export function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <header className="space-y-4">
        <Link to="/" aria-label="Voltar">
          <BrandMark />
        </Link>
        <h1 className="font-display text-2xl font-bold">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: {UPDATED_AT}</p>
      </header>

      <Section title="1. Quem somos">
        <p>
          Esta política explica como <strong>Ricardo Neves Personal</strong> ("nós") trata os dados pessoais
          de quem usa o site <strong>personalricardoneves.com.br</strong> e o aplicativo RN Personal, conforme a
          Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Somos o controlador dos dados.
          Contato do encarregado: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="2. Quais dados coletamos">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Cadastro e conta:</strong> nome, e-mail, telefone, data de nascimento e senha (guardada de forma criptografada).</li>
          <li>
            <strong>Dados de saúde (dados sensíveis):</strong> respostas da anamnese (histórico de saúde, lesões,
            medicamentos, hábitos), medidas e avaliações físicas.
          </li>
          <li><strong>Treinos:</strong> treinos prescritos, execuções, cargas, repetições e observações.</li>
          <li><strong>Financeiro:</strong> registros de mensalidades (valor, vencimento e situação). Não armazenamos dados de cartão.</li>
          <li><strong>Formulário de contato do site:</strong> nome, e-mail, telefone e mensagem.</li>
          <li><strong>Dados técnicos:</strong> informações mínimas necessárias para login e segurança (como data de acesso).</li>
        </ul>
      </Section>

      <Section title="3. Para que usamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Montar e acompanhar seus treinos com segurança, de acordo com sua saúde e objetivos.</li>
          <li>Registrar avaliações e mostrar sua evolução.</li>
          <li>Organizar mensalidades e a relação de prestação do serviço.</li>
          <li>Responder seus contatos e enviar comunicações sobre a sua conta (convite, recuperação de senha).</li>
        </ul>
        <p>Não vendemos seus dados e não os usamos para publicidade.</p>
      </Section>

      <Section title="4. Base legal">
        <p>
          Tratamos os dados para executar o contrato de acompanhamento (art. 7º, V) e cumprir obrigações legais
          (art. 7º, II). Os <strong>dados de saúde</strong> são tratados com o seu <strong>consentimento específico</strong>,
          dado ao preencher a anamnese (art. 11, I), e você pode revogá-lo a qualquer momento.
        </p>
      </Section>

      <Section title="5. Com quem compartilhamos">
        <p>Somente com fornecedores necessários para o sistema funcionar, que seguem padrões de segurança:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Supabase</strong> — banco de dados, login e armazenamento de arquivos.</li>
          <li><strong>Vercel</strong> — hospedagem do site e do aplicativo.</li>
          <li><strong>Formspree</strong> — envio das mensagens do formulário de contato.</li>
        </ul>
        <p>
          Alguns desses serviços podem armazenar dados fora do Brasil, com as garantias previstas na LGPD.
          Seus dados de saúde e treinos são visíveis apenas para você e para os profissionais que acompanham você.
        </p>
      </Section>

      <Section title="6. Segurança e retenção">
        <p>
          Usamos conexão criptografada (HTTPS), controle de acesso por usuário e regras no banco que impedem
          que um aluno veja dados de outro. Mantemos os dados enquanto você for aluno e, depois, apenas pelo
          tempo exigido por lei ou para defesa de direitos; após isso, são excluídos ou anonimizados.
        </p>
      </Section>

      <Section title="7. Seus direitos">
        <p>
          Você pode, a qualquer momento: confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir
          portabilidade, anonimização ou exclusão, revogar o consentimento e pedir informações sobre
          compartilhamento. Basta escrever para{' '}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Você também pode
          reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </Section>

      <Section title="8. Alterações">
        <p>
          Podemos atualizar esta política. A data no topo mostra a versão vigente; mudanças relevantes serão
          avisadas no aplicativo.
        </p>
      </Section>

      <footer className="border-t border-border pt-6 text-sm">
        <Link className="underline" to="/">Voltar</Link>
      </footer>
    </main>
  )
}
