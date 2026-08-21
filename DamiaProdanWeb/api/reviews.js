import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { author, game, comment, rating } = req.body;

    if (!author || !game || !comment || !rating) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
      await sql`
        INSERT INTO reviews (author, game, comment, rating)
        VALUES (${author}, ${game}, ${comment}, ${rating});
      `;
      return res.status(200).json({ message: 'Reseña publicada con éxito' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM reviews ORDER BY created_at DESC;`;
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
