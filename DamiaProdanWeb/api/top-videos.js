// api/top-videos.js
// Función serverless para Vercel. Se despliega gratis y corre en el servidor,
// así tu YOUTUBE_API_KEY nunca queda expuesta en el navegador.
//
// Endpoint resultante: https://tu-proyecto.vercel.app/api/top-videos
// La web (index.html) le pega a esta URL en vez de guardar la key en el HTML.

const CHANNEL_ID = "UCpfI9tPbATkfMwW4IktVZUw"; // canal de DamiaProdan
const MAX_RESULTS = 6;

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar YOUTUBE_API_KEY en Vercel." });
  }

  try {
    // 1) Buscar los videos del canal ordenados por vistas
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${CHANNEL_ID}&part=snippet&type=video&order=viewCount&maxResults=${MAX_RESULTS}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.error) {
      return res.status(500).json({ error: searchData.error.message });
    }

    const videoIds = (searchData.items || []).map(item => item.id.videoId).filter(Boolean);
    if (videoIds.length === 0) {
      return res.status(200).json({ videos: [] });
    }

    // 2) Traer el conteo real de vistas de esos videos (search no lo incluye)
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds.join(",")}&part=statistics,snippet`;
    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json();

    const videos = (statsData.items || [])
      .map(item => ({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        thumb: item.snippet.thumbnails?.medium?.url || "",
        views: Number(item.statistics.viewCount || 0),
      }))
      .sort((a, b) => b.views - a.views);

    // Cachear la respuesta 6 horas para no gastar cuota de la API de más
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate");
    return res.status(200).json({ videos });
  } catch (err) {
    return res.status(500).json({ error: "Error consultando YouTube: " + err.message });
  }
}
