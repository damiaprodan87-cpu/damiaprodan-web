// api/top-videos.js
// Función serverless para Vercel. Se despliega gratis y corre en el servidor,
// así tu YOUTUBE_API_KEY nunca queda expuesta en el navegador.
//
// Endpoint resultante: https://tu-proyecto.vercel.app/api/top-videos
// Devuelve DOS listas en una sola llamada:
//   - videos: top videos por cantidad de vistas (REAL, no aproximado)
//   - latest: últimos videos subidos (orden cronológico)
const CHANNEL_ID = "UCpfI9tPbATkfMwW4IktVZUw"; // canal de DamiaProdan
const MAX_RESULTS = 6;
// search.list con order=viewCount NO es confiable, así que en vez de eso
// traemos la lista COMPLETA de "subidos" (uploads playlist) del canal y
// ordenamos nosotros mismos por vistas reales, para que el top sea
// realmente el de más vistas de TODA la vida del canal.

async function getUploadsPlaylistId(apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}&id=${CHANNEL_ID}&part=contentDetails`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const playlistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) throw new Error("No se encontró la playlist de subidos del canal.");
  return playlistId;
}

async function fetchAllVideoIds(apiKey, uploadsPlaylistId) {
  let videoIds = [];
  let pageToken = "";
  // Recorre TODAS las páginas de la playlist de subidos (todo el historial
  // del canal), no solo las primeras, para que el ranking de "más vistos"
  // sea realmente de todo el tiempo.
  while (true) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${uploadsPlaylistId}&part=contentDetails&maxResults=50&pageToken=${pageToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const ids = (data.items || []).map(item => item.contentDetails.videoId).filter(Boolean);
    videoIds = videoIds.concat(ids);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return videoIds;
}

// Convierte una duración ISO 8601 de YouTube (ej: "PT45S", "PT4M13S", "PT1H2M3S")
// a segundos totales.
function parseDurationToSeconds(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Un video se considera Short si dura 60 segundos o menos (el límite que usa YouTube).
const SHORTS_MAX_SECONDS = 60;

async function fetchStatsForIds(apiKey, videoIds) {
  const results = [];
  // La API de videos.list acepta hasta 50 IDs por llamada
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${chunk.join(",")}&part=statistics,snippet,contentDetails`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    (data.items || []).forEach(item => {
      const durationSeconds = parseDurationToSeconds(item.contentDetails?.duration);
      // Descartamos los Shorts (60s o menos) para que el top y los últimos
      // videos muestren solo contenido normal del canal.
      if (durationSeconds <= SHORTS_MAX_SECONDS) return;
      results.push({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        thumb: item.snippet.thumbnails?.medium?.url || "",
        views: Number(item.statistics.viewCount || 0),
        publishedAt: item.snippet.publishedAt,
      });
    });
  }
  return results;
}

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar YOUTUBE_API_KEY en Vercel." });
  }
  try {
    const uploadsPlaylistId = await getUploadsPlaylistId(apiKey);
    const videoIds = await fetchAllVideoIds(apiKey, uploadsPlaylistId);
    const allVideos = await fetchStatsForIds(apiKey, videoIds);

    const videos = [...allVideos].sort((a, b) => b.views - a.views).slice(0, MAX_RESULTS);
    const latest = [...allVideos]
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, MAX_RESULTS);

    // Cachear la respuesta 12 horas: ahora escaneamos el canal completo,
    // así que conviene cachear más tiempo para no gastar cuota de más.
    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate");
    return res.status(200).json({ videos, latest });
  } catch (err) {
    return res.status(500).json({ error: "Error consultando YouTube: " + err.message });
  }
}
