export default async function handler(req, res) {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Pesan kosong" });
    }

    return res.status(200).json({
      reply: "Kamu bilang: " + message
    });

  } catch (err) {
    return res.status(500).json({
      reply: "Server error"
    });
  }
}
