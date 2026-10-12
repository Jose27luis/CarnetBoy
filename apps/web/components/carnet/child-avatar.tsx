'use client';

import { Camera, LoaderCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { removePhotoAction, savePhotoAction } from '@/app/carnet/actions';

const MAX_SIDE = 720;
const QUALITY = 0.82;

async function resize(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('Tu navegador no pudo procesar la foto.');
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);

  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface ChildAvatarProps {
  childId: string;
  name: string;
  photoVersion: string | null;
  size: 'md' | 'lg';
  editable: boolean;
}

export function ChildAvatar({ childId, name, photoVersion, size, editable }: ChildAvatarProps): React.JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const dimension = size === 'lg' ? 'size-20' : 'size-14';

  function choose(file: File | undefined): void {
    if (file === undefined) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const result = await savePhotoAction(childId, await resize(file));
        setMessage(result.ok ? null : result.message);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'No se pudo subir la foto.');
      }
    });
  }

  function remove(): void {
    startTransition(async () => {
      const result = await removePhotoAction(childId);
      setMessage(result.ok ? null : result.message);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="relative">
        <div className={`${dimension} grid place-items-center overflow-hidden rounded-full border-2 border-white bg-celeste-100 font-display text-xl font-semibold text-celeste-800 shadow-md`}>
          {photoVersion === null ? (
            initialsOf(name)
          ) : (
            <Image
              src={`/carnet/${childId}/foto?v=${photoVersion}`}
              alt={`Foto de ${name}`}
              width={160}
              height={160}
              unoptimized
              className="size-full object-cover"
            />
          )}
        </div>
        {editable ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={pending}
            aria-label={photoVersion === null ? 'Poner una foto' : 'Cambiar la foto'}
            className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-celeste-700 text-white shadow"
          >
            {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Camera aria-hidden="true" className="size-4" />}
          </button>
        ) : null}
      </div>
      {editable ? (
        <>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(event) => choose(event.target.files?.[0])} />
          {photoVersion === null ? null : (
            <button type="button" onClick={remove} disabled={pending} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-danger">
              <Trash2 aria-hidden="true" className="size-3.5" />
              Quitar foto
            </button>
          )}
          {message === null ? null : <p className="text-xs text-danger">{message}</p>}
        </>
      ) : null}
    </div>
  );
}
