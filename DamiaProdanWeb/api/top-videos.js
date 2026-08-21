// api/top-videos.js
// Función serverless para Vercel. Se despliega gratis y corre en el servidor,
// así tu YOUTUBE_API_KEY nunca queda expuesta en el navegador.
//
// Endpoint resultante: https://tu-proyecto.vercel.app/api/top-videos
// Devuelve DOS listas en una sola llamada:
//   - videos: top videos por cantidad de vistas
//   - latest: últimos videos subidos (orden cronológico)
const CHANNEL_ID = "UCpfI9tPbATkfMwW4IktVZUw"; // canal de DamiaProdan
const MAX_RESULTS = 6;

async function fetchVideoList(apiKey, order) {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${CHANNEL_ID}&part=snippet&type=video&order=${order}&maxResults=${MAX_RESULTS}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  if (searchData.error) {
    throw new Error(searchData.error.message);
  }
  const videoIds = (searchData.items || []).map(item => item.id.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];

  // Traer estadísticas reales (vistas) y fecha de publicación
  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds.join(",")}&part=statistics,snippet`;
  const statsRes = await fetch(statsUrl);
  const statsData = await statsRes.json();

  const videos = (statsData.items || []).map(item => ({
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    thumb: item.snippet.thumbnails?.medium?.url || "",
    views: Number(item.statistics.viewCount || 0),
    publishedAt: item.snippet.publishedAt,
  }));

  if (order === "viewCount") {
    videos.sort((a, b) => b.views - a.views);
  } else {
    videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  return videos;
}

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar YOUTUBE_API_KEY en Vercel." });
  }
  try {
    const [videos, latest] = await Promise.all([
      fetchVideoList(apiKey, "viewCount"),
      fetchVideoList(apiKey, "date"),
    ]);

    // Cachear la respuesta 6 horas para no gastar cuota de la API de más
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate");
    return res.status(200).json({ videos, latest });
  } catch (err) {
    return res.status(500).json({ error: "Error consultando YouTube: " + err.message });
  }
}
