/**
 * Best-effort stop OBS streaming via OBS WebSocket v5 (OBS 28+).
 * Only works when the browser and OBS run on the same machine (localhost:4455).
 */

type ObsMessage = {
  op: number;
  d?: Record<string, unknown> & {
    authentication?: { salt: string; challenge: string };
    requestId?: string;
    requestStatus?: { code?: number };
  };
};

function sha256Base64(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data).then((buf) => {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  });
}

export async function tryStopObsStreaming(password = ""): Promise<boolean> {
  if (typeof window === "undefined") return false;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };

    const ws = new WebSocket("ws://127.0.0.1:4455");
    const timeout = window.setTimeout(() => finish(false), 5000);

    ws.onerror = () => finish(false);

    ws.onmessage = async (event) => {
      let msg: ObsMessage;
      try {
        msg = JSON.parse(String(event.data)) as ObsMessage;
      } catch {
        return;
      }

      if (msg.op === 0) {
        const identify: Record<string, unknown> = {
          rpcVersion: 1,
          eventSubscriptions: 0,
        };
        if (msg.d?.authentication) {
          const auth = msg.d.authentication;
          const secret = await sha256Base64(password + auth.salt);
          identify.authentication = await sha256Base64(secret + auth.challenge);
        }
        ws.send(JSON.stringify({ op: 1, d: identify }));
        return;
      }

      if (msg.op === 2) {
        ws.send(
          JSON.stringify({
            op: 6,
            d: {
              requestType: "StopStream",
              requestId: "livebooth-stop",
            },
          }),
        );
        return;
      }

      if (msg.op === 7 && msg.d?.requestId === "livebooth-stop") {
        finish(msg.d?.requestStatus?.code === 100);
      }
    };
  });
}
