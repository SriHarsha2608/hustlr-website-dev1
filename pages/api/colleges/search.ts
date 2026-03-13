import type { NextApiRequest, NextApiResponse } from "next";

type CollegeOption = { label: string; value: string };

const FALLBACK_COLLEGES = [
  "Indian Institute of Technology Bombay",
  "Indian Institute of Technology Delhi",
  "Indian Institute of Technology Madras",
  "Indian Institute of Technology Kanpur",
  "Indian Institute of Technology Kharagpur",
  "Indian Institute of Technology Roorkee",
  "Indian Institute of Technology Guwahati",
  "Indian Institute of Science Bengaluru",
  "National Institute of Technology Trichy",
  "National Institute of Technology Surathkal",
  "National Institute of Technology Warangal",
  "BITS Pilani",
  "Delhi Technological University",
  "Netaji Subhas University of Technology",
  "Vellore Institute of Technology",
  "SRM Institute of Science and Technology",
  "Manipal Institute of Technology",
  "Pune Institute of Computer Technology",
  "COEP Technological University",
  "Jadavpur University",
  "Anna University",
  "University of Delhi",
  "University of Mumbai",
  "Savitribai Phule Pune University",
  "Jawaharlal Nehru University",
  "Jamia Millia Islamia",
  "Amity University",
  "Christ University",
  "Lovely Professional University",
  "SASTRA Deemed University",
];

function toOptions(values: string[]): CollegeOption[] {
  return values.map((name) => ({ label: name, value: name }));
}

function fallbackSearch(query: string): CollegeOption[] {
  const lowered = query.toLowerCase();
  const filtered = FALLBACK_COLLEGES.filter((name) =>
    name.toLowerCase().includes(lowered)
  ).slice(0, 50);
  return toOptions(filtered);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const q = String(req.query.q || "").trim();
  if (q.length < 3) {
    return res.status(200).json({ success: true, colleges: [], source: "empty" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const url = `https://universities.hipolabs.com/search?name=${encodeURIComponent(
      q
    )}&country=india`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      const fallback = fallbackSearch(q);
      return res.status(200).json({
        success: true,
        colleges: fallback,
        source: "fallback",
      });
    }

    const json = await response.json();
    const names = Array.isArray(json)
      ? Array.from(
          new Set(
            json
              .map((item: any) => String(item?.name || "").trim())
              .filter((name: string) => name.length > 0)
          )
        )
      : [];

    return res.status(200).json({
      success: true,
      colleges: toOptions(names),
      source: "upstream",
    });
  } catch {
    clearTimeout(timeout);
    const fallback = fallbackSearch(q);
    return res.status(200).json({
      success: true,
      colleges: fallback,
      source: "fallback",
    });
  }
}