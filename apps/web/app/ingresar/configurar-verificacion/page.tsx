import type { TotpEnrollment } from '@carnet/contracts';
import type { Metadata } from 'next';
import { requestJson } from '@/lib/api-client';
import { pendingChallenge } from '@/lib/login-flow';
import { currentClientIp } from '@/lib/session';
import { CancelLoginButton } from '../cancel-button';
import { TotpForm } from '../totp-form';

export const metadata: Metadata = { title: 'Configura la verificación' };

function groupSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret;
}

export default async function TotpEnrollmentPage(): Promise<React.JSX.Element> {
  const challenge = await pendingChallenge(['TOTP_ENROLLMENT_REQUIRED']);
  const enrollment = await requestJson<TotpEnrollment>('/v1/auth/totp/enrollment', {
    method: 'POST',
    body: { challengeToken: challenge.challengeToken },
    clientIp: await currentClientIp(),
  });

  if (!enrollment.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">No se pudo preparar la verificación</h1>
        <p className="text-muted">{enrollment.error.message}</p>
        <CancelLoginButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold uppercase tracking-wider text-celeste-700">Último paso</p>
        <h1 className="text-2xl font-semibold">Protege tu cuenta</h1>
        <p className="text-muted">
          Tu cuenta da acceso a datos de salud de niños, por eso pide un segundo código además de la contraseña.
        </p>
      </div>
      <ol className="flex flex-col gap-4 text-sm">
        <li className="flex flex-col gap-2">
          <span className="font-semibold">1. Instala una aplicación de autenticación en tu celular</span>
          <span className="text-muted">Por ejemplo Google Authenticator o Microsoft Authenticator.</span>
        </li>
        <li className="flex flex-col gap-3">
          <span className="font-semibold">2. Escanea este código desde la aplicación</span>
          <div
            className="mx-auto w-48 rounded-(--radius-control) border border-line bg-white p-2"
            role="img"
            aria-label="Código QR para configurar la verificación en dos pasos"
            dangerouslySetInnerHTML={{ __html: enrollment.data.qrSvg }}
          />
          <span className="text-muted">
            Si no puedes escanearlo, ingresa esta clave a mano:{' '}
            <code className="select-all break-all font-mono text-ink">{groupSecret(enrollment.data.secret)}</code>
          </span>
        </li>
        <li className="font-semibold">3. Escribe el código que aparece en la aplicación</li>
      </ol>
      <TotpForm submitLabel="Activar y entrar" />
      <CancelLoginButton />
    </div>
  );
}
