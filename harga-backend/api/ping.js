export const config = {
  runtime: 'nodejs22.x',
};

export default function handler(_req, res) {
  res.status(200).json({ pong: true });
}
