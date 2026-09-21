export type SourceInstagramRow = {
  "Identificação do post": string;
  "Identificação da conta": string;
  "Nome de usuário da conta": string;
  "Nome da conta": string;
  "Descrição": string;
  "Duração (s)": string;
  "Horário de publicação": string;
  "Link permanente": string;
  "Tipo de post": string;
  "Comentário de dados": string;
  "Data": string;
  "Visualizações": string;
  "Alcance": string;
  "Curtidas": string;
  "Compartilhamentos": string;
  "Seguimentos": string;
  "Comentários": string;
  "Salvamentos": string;
};

export type InstagramPost = {
  id: string;
  accountId: string;
  username: string;
  accountName: string;
  description: string;
  durationSeconds: number;
  publishedAt: string;
  permanentLink: string;
  postType: string;
  dataComment: string;
  sourceDateLabel: string;
  views: number;
  reach: number;
  likes: number;
  shares: number;
  follows: number;
  comments: number;
  saves: number;
  interactions: number;
  engagementRate: number;
  shareRate: number;
  saveRate: number;
  followRate: number;
  viewsPerReach: number;
  reachIndex: number | null;
  engagementIndex: number | null;
  shareIndex: number | null;
  saveIndex: number | null;
  followIndex: number | null;
};

export type MetricKey = "reach" | "views" | "interactions" | "follows";

export type DateRange = {
  start: string;
  end: string;
};

export type ComparisonMode = "none" | "previous" | "yearAgo";
