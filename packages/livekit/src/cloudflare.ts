export type CfLiveInputParams = {
  accountId: string;
  apiToken: string;
  name: string;
};

export type CfLiveInputResult = {
  inputId: string;
  rtmpUrl: string;
  streamKey: string;
  hlsUrl: string;
  dashUrl: string;
};

type CfApiResponse = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: {
    uid: string;
    rtmps: { url: string; streamKey: string };
    srt: { url: string; streamId: string };
    webRTC: { url: string };
  };
};

/**
 * Create a Cloudflare Stream Live Input.
 * Returns ingest URLs and playback URLs.
 */
export async function createCfLiveInput(
  params: CfLiveInputParams,
): Promise<CfLiveInputResult> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${params.accountId}/stream/live_inputs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meta: { name: params.name },
        recording: { mode: "automatic" },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare Stream API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as CfApiResponse;
  if (!data.success) {
    throw new Error(
      `Cloudflare Stream API failed: ${data.errors.map((e) => e.message).join(", ")}`,
    );
  }

  const input = data.result;
  return {
    inputId: input.uid,
    rtmpUrl: input.rtmps.url,
    streamKey: input.rtmps.streamKey,
    hlsUrl: `https://customer-${params.accountId}.cloudflarestream.com/${input.uid}/manifest/video.m3u8`,
    dashUrl: `https://customer-${params.accountId}.cloudflarestream.com/${input.uid}/manifest/video.mpd`,
  };
}

/**
 * Delete a Cloudflare Stream Live Input.
 */
export async function deleteCfLiveInput(params: {
  accountId: string;
  apiToken: string;
  inputId: string;
}): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${params.accountId}/stream/live_inputs/${params.inputId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${params.apiToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Cloudflare Stream delete error (${response.status}): ${text}`);
  }
}
