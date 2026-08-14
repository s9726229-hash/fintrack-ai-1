import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAuthClick, initGis, uploadToDrive } from './googleDrive';

const fetchMock = vi.fn();

async function authenticate(files: Array<{ id: string }> = []): Promise<void> {
  const tokenClient: { callback?: (response: { access_token: string }) => void; requestAccessToken: () => void } = {
    requestAccessToken: () => tokenClient.callback?.({ access_token: 'test-access-token' }),
  };
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn(() => tokenClient),
      },
    },
  };
  window.gapi = {
    client: {
      drive: {
        files: {
          list: vi.fn(() => Promise.resolve({ result: { files } })),
        },
      },
    },
  };
  await initGis('client-id');
  await handleAuthClick();
}

describe('Google Drive upload transport', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects a non-2xx PATCH without exposing the token or response body', async () => {
    await authenticate([{ id: 'existing-file' }]);
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    const upload = uploadToDrive('{"private":"backup-body"}');

    await expect(upload).rejects.toThrow('HTTP 503');
    await expect(upload).rejects.not.toThrow(/test-access-token|backup-body/);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/existing-file?uploadType=multipart'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('rejects a non-2xx POST with a status-only safe error', async () => {
    await authenticate([]);
    fetchMock.mockResolvedValue({ ok: false, status: 400 });

    const upload = uploadToDrive('{"private":"backup-body"}');

    await expect(upload).rejects.toThrow('HTTP 400');
    await expect(upload).rejects.not.toThrow(/test-access-token|backup-body/);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('resolves after a successful upload response', async () => {
    await authenticate([{ id: 'existing-file' }]);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await expect(uploadToDrive('{}')).resolves.toBeUndefined();
  });
});
