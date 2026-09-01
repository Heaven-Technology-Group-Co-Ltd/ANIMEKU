import type { Anime } from "./data";

export function animeJsonLd(anime: Anime, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: anime.titleTh,
    alternateName: [anime.title, anime.titleEn],
    description: anime.description,
    image: anime.cover,
    genre: anime.genres,
    numberOfSeasons: 1,
    numberOfEpisodes: anime.episodesTotal,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: anime.rating,
      ratingCount: Math.floor(anime.views / 100),
      bestRating: 10,
    },
    productionCompany: { "@type": "Organization", name: anime.studio },
    datePublished: `${anime.year}-01-01`,
    url: `${siteUrl}/anime/${anime.slug}`,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  };
}

export function videoJsonLd(
  anime: Anime,
  episode: { number: number; titleTh: string; thumbnail: string },
  siteUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${anime.titleTh} ตอนที่ ${episode.number} - ${episode.titleTh}`,
    description: anime.description,
    thumbnailUrl: episode.thumbnail,
    uploadDate: new Date().toISOString(),
    duration: "PT24M",
    contentUrl: `${siteUrl}/watch/${anime.slug}/${episode.number}`,
    embedUrl: `${siteUrl}/watch/${anime.slug}/${episode.number}`,
  };
}
