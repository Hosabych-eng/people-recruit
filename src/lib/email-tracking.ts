const TRANSPARENT_GIF_BASE64 =
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function getTrackingBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function buildTrackingPixelUrl(emailId: string) {
  return `${getTrackingBaseUrl()}/api/tracking/pixel/${emailId}`;
}

export function buildTrackingClickUrl(emailId: string, targetUrl: string) {
  const encoded = encodeURIComponent(targetUrl);
  return `${getTrackingBaseUrl()}/api/tracking/click/${emailId}?url=${encoded}`;
}

export function injectTrackingPixel(html: string, emailId: string) {
  const pixel = `<img src="${buildTrackingPixelUrl(emailId)}" width="1" height="1" alt="" style="display:none;border:0;" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return `${html}${pixel}`;
}

export function wrapLinksForTracking(html: string, emailId: string) {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_match, url: string) => {
      if (url.includes("/api/tracking/")) return `href="${url}"`;
      return `href="${buildTrackingClickUrl(emailId, url)}"`;
    },
  );
}

export function prepareTrackedHtml(html: string, emailId: string) {
  return injectTrackingPixel(wrapLinksForTracking(html, emailId), emailId);
}

export function transparentGifBuffer() {
  return Buffer.from(TRANSPARENT_GIF_BASE64, "base64");
}
