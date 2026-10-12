import { apiBinary } from '@/lib/session';

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return new Response(null, { status: 404 });
  }

  const result = await apiBinary(`/v1/me/carnet/${id}/photo`);

  if (!(result instanceof Response)) {
    return new Response(null, { status: result.status });
  }

  return new Response(result.body, {
    headers: {
      'content-type': result.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': 'private, max-age=31536000, immutable',
    },
  });
}
