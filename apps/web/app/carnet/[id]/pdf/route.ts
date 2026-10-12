import { apiBinary } from '@/lib/session';

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return new Response('No encontrado', { status: 404 });
  }

  const result = await apiBinary(`/v1/me/carnet/${id}/pdf`);

  if (!(result instanceof Response)) {
    return new Response(result.error.message, { status: result.status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  return new Response(result.body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': result.headers.get('content-disposition') ?? 'attachment; filename="carnet-cred.pdf"',
      'cache-control': 'no-store',
    },
  });
}
