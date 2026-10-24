/** True for HLS playlists, e.g. the `/api/stream/<cam>/index.m3u8` proxy. */
export const isHlsUrl = (src: string) => /\.m3u8(\?|#|$)/i.test(src)
